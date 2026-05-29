import prisma from "../db.server";
import { env } from "./env.server";
import { sendDeliveryEmail, type DeliveryEmailItem } from "./email.server";

function downloadUrl(token: string): string {
  return `${env.appUrl}/download/${token}`;
}

// Re-send the delivery email for an existing delivery, reusing the already
// assigned key and the existing (non-revoked) download tokens.
export async function resendDelivery(
  shop: string,
  deliveryId: string,
): Promise<void> {
  const delivery = await prisma.delivery.findFirstOrThrow({
    where: { id: deliveryId, shop },
    include: {
      product: { include: { links: { orderBy: { createdAt: "asc" } } } },
      licenseKey: true,
      tokens: { where: { revoked: false }, include: { file: true } },
    },
  });

  const item: DeliveryEmailItem = {
    productTitle: delivery.product.title,
    message: delivery.product.deliveryMessage,
    licenseKey: delivery.licenseKey?.keyValue ?? null,
    downloads: [
      ...delivery.product.links.map((l) => ({
        fileName: l.version || l.label,
        url: l.url,
      })),
      ...delivery.tokens.map((t) => ({
        fileName: t.file.fileName,
        url: downloadUrl(t.token),
      })),
    ],
    linkExpiryHours: delivery.product.linkExpiryHours,
    downloadLimit: delivery.product.downloadLimit,
  };

  await sendDeliveryEmail({
    shop,
    to: delivery.customerEmail,
    orderName: delivery.shopifyOrderName,
    items: [item],
  });

  await prisma.delivery.update({
    where: { id: delivery.id },
    data: { status: "DELIVERED", errorMessage: null },
  });
}

// Revoke a delivery: expire all its download tokens and burn the assigned key
// (kept ASSIGNED so it is never reissued). The delivery is marked FAILED.
export async function revokeDelivery(
  shop: string,
  deliveryId: string,
): Promise<void> {
  // Guard by shop: ignore the request if the delivery belongs to another shop.
  const delivery = await prisma.delivery.findFirst({
    where: { id: deliveryId, shop },
    select: { id: true },
  });
  if (!delivery) return;
  await prisma.$transaction([
    prisma.downloadToken.updateMany({
      where: { deliveryId },
      data: { revoked: true },
    }),
    prisma.delivery.update({
      where: { id: deliveryId },
      data: { status: "FAILED", errorMessage: "Lieferung widerrufen." },
    }),
  ]);
}
