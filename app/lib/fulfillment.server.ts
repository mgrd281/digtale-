import prisma from "../db.server";
import { env } from "./env.server";
import { generateDownloadToken } from "./tokens.server";
import { numericId, LOW_STOCK_THRESHOLD } from "./shared";
import {
  sendDeliveryEmail,
  sendMerchantAlert,
  type DeliveryEmailItem,
} from "./email.server";

export { numericId, LOW_STOCK_THRESHOLD };

export interface PaidOrderLineItem {
  productId: string | number | null;
  quantity: number;
}

export interface PaidOrder {
  id: string | number;
  name: string;
  email: string;
  lineItems: PaidOrderLineItem[];
}

function downloadUrl(token: string): string {
  return `${env.appUrl}/download/${token}`;
}

// Atomically claim one AVAILABLE key for the product. Uses SELECT ... FOR
// UPDATE SKIP LOCKED so concurrent webhook deliveries can never hand out the
// same key twice. Returns the claimed key, or null if the pool is empty.
async function claimLicenseKey(
  productId: string,
  shopifyOrderId: string,
): Promise<{ id: string; keyValue: string } | null> {
  return prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<{ id: string; keyValue: string }[]>`
      SELECT "id", "keyValue" FROM "LicenseKey"
      WHERE "productId" = ${productId} AND "status" = 'AVAILABLE'::"KeyStatus"
      ORDER BY "id"
      LIMIT 1
      FOR UPDATE SKIP LOCKED
    `;
    const candidate = rows[0];
    if (!candidate) {
      return null;
    }
    await tx.licenseKey.update({
      where: { id: candidate.id },
      data: {
        status: "ASSIGNED",
        assignedOrderId: shopifyOrderId,
        assignedAt: new Date(),
      },
    });
    return candidate;
  });
}

async function availableKeyCount(productId: string): Promise<number> {
  return prisma.licenseKey.count({
    where: { productId, status: "AVAILABLE" },
  });
}

interface ProcessResult {
  deliveryId: string;
  emailItem?: DeliveryEmailItem;
  failed: boolean;
}

// Process a single (order, product) pair. Idempotent: a previously DELIVERED
// delivery for the same order+product is skipped entirely.
async function processProduct(
  order: PaidOrder,
  product: {
    id: string;
    title: string;
    deliveryType: "KEY" | "FILE" | "BOTH";
    downloadLimit: number;
    linkExpiryHours: number;
  },
): Promise<ProcessResult | null> {
  const shopifyOrderId = numericId(order.id);

  // Upsert keyed on the (order, product) unique pair so concurrent webhook
  // deliveries can never create two rows for the same line.
  const delivery = await prisma.delivery.upsert({
    where: {
      shopifyOrderId_productId: { shopifyOrderId, productId: product.id },
    },
    update: {},
    create: {
      shopifyOrderId,
      shopifyOrderName: order.name,
      customerEmail: order.email,
      productId: product.id,
      status: "PENDING",
    },
  });
  if (delivery.status === "DELIVERED") {
    return null; // already fulfilled – idempotent no-op
  }

  const wantsKey = product.deliveryType === "KEY" || product.deliveryType === "BOTH";
  const wantsFile = product.deliveryType === "FILE" || product.deliveryType === "BOTH";

  // 1) License key (atomic claim).
  let licenseKeyValue: string | null = null;
  if (wantsKey) {
    // Reuse an already-claimed key if this delivery was retried.
    if (delivery.licenseKeyId) {
      const prev = await prisma.licenseKey.findUnique({
        where: { id: delivery.licenseKeyId },
      });
      licenseKeyValue = prev?.keyValue ?? null;
    }
    if (!licenseKeyValue) {
      const claimed = await claimLicenseKey(product.id, shopifyOrderId);
      if (!claimed) {
        await prisma.delivery.update({
          where: { id: delivery.id },
          data: {
            status: "FAILED",
            errorMessage: "Kein verfügbarer Lizenzschlüssel im Pool.",
          },
        });
        await sendMerchantAlert({
          subject: `Lizenzschlüssel ausverkauft: ${product.title}`,
          message:
            `Bestellung ${order.name} konnte nicht ausgeliefert werden: ` +
            `für das Produkt "${product.title}" ist kein Lizenzschlüssel mehr verfügbar. ` +
            `Bitte laden Sie neue Schlüssel im Admin hoch.`,
        });
        return { deliveryId: delivery.id, failed: true };
      }
      // Attach only if no key is set yet. If a concurrent run won the race,
      // release the key we just claimed back into the pool so it is not lost.
      const attached = await prisma.delivery.updateMany({
        where: { id: delivery.id, licenseKeyId: null },
        data: { licenseKeyId: claimed.id },
      });
      if (attached.count === 0) {
        await prisma.licenseKey.update({
          where: { id: claimed.id },
          data: { status: "AVAILABLE", assignedOrderId: null, assignedAt: null },
        });
        const current = await prisma.delivery.findUnique({
          where: { id: delivery.id },
          include: { licenseKey: true },
        });
        licenseKeyValue = current?.licenseKey?.keyValue ?? null;
      } else {
        licenseKeyValue = claimed.keyValue;
      }
    }
  }

  // 2) Download tokens for each file (idempotent: skip if tokens exist).
  const downloads: { fileName: string; url: string }[] = [];
  if (wantsFile) {
    const files = await prisma.digitalFile.findMany({
      where: { productId: product.id },
    });
    const expiresAt = new Date(Date.now() + product.linkExpiryHours * 3600_000);
    for (const file of files) {
      let tokenRow = await prisma.downloadToken.findFirst({
        where: { deliveryId: delivery.id, fileId: file.id, revoked: false },
      });
      if (!tokenRow) {
        tokenRow = await prisma.downloadToken.create({
          data: {
            deliveryId: delivery.id,
            fileId: file.id,
            token: generateDownloadToken(),
            expiresAt,
            maxDownloads: product.downloadLimit,
          },
        });
      }
      downloads.push({ fileName: file.fileName, url: downloadUrl(tokenRow.token) });
    }
  }

  // Low-stock warning for the merchant.
  if (wantsKey) {
    const remaining = await availableKeyCount(product.id);
    if (remaining < LOW_STOCK_THRESHOLD) {
      await sendMerchantAlert({
        subject: `Niedriger Schlüsselbestand: ${product.title}`,
        message:
          `Nur noch ${remaining} Lizenzschlüssel für "${product.title}" verfügbar. ` +
          `Bitte laden Sie rechtzeitig neue Schlüssel hoch.`,
      }).catch(() => {});
    }
  }

  return {
    deliveryId: delivery.id,
    failed: false,
    emailItem: {
      productTitle: product.title,
      licenseKey: licenseKeyValue,
      downloads,
      linkExpiryHours: product.linkExpiryHours,
      downloadLimit: product.downloadLimit,
    },
  };
}

// Entry point invoked by the orders/paid webhook handler.
export async function fulfillPaidOrder(order: PaidOrder): Promise<void> {
  const wantedIds = Array.from(
    new Set(order.lineItems.map((li) => numericId(li.productId)).filter(Boolean)),
  );
  if (wantedIds.length === 0) {
    return;
  }

  const products = await prisma.product.findMany({
    where: { shopifyProductId: { in: wantedIds } },
  });
  if (products.length === 0) {
    return; // none of the purchased items are digital products we manage
  }

  const emailItems: DeliveryEmailItem[] = [];
  const deliveredIds: string[] = [];

  for (const product of products) {
    const result = await processProduct(order, {
      id: product.id,
      title: product.title,
      deliveryType: product.deliveryType,
      downloadLimit: product.downloadLimit,
      linkExpiryHours: product.linkExpiryHours,
    });
    if (result && !result.failed && result.emailItem) {
      emailItems.push(result.emailItem);
      deliveredIds.push(result.deliveryId);
    }
  }

  if (emailItems.length === 0) {
    return;
  }

  try {
    await sendDeliveryEmail({
      to: order.email,
      orderName: order.name,
      items: emailItems,
    });
    await prisma.delivery.updateMany({
      where: { id: { in: deliveredIds } },
      data: { status: "DELIVERED", errorMessage: null },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await prisma.delivery.updateMany({
      where: { id: { in: deliveredIds } },
      data: { status: "FAILED", errorMessage: `E-Mail-Versand fehlgeschlagen: ${message}` },
    });
    await sendMerchantAlert({
      subject: `E-Mail-Versand fehlgeschlagen: ${order.name}`,
      message: `Die Liefer-E-Mail für Bestellung ${order.name} konnte nicht gesendet werden: ${message}`,
    }).catch(() => {});
    throw error;
  }
}
