import type { LoaderFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";
import { numericId } from "../lib/shared";
import { env } from "../lib/env.server";
import { de } from "../lib/strings.server";

// Read-only endpoint consumed by the Thank-you and Order-status UI extensions.
// The request is authenticated via the extension's signed session token
// (verified by authenticate.public.*), and the response carries CORS headers
// so the sandboxed extension can read it.
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const surface = url.searchParams.get("surface") ?? "checkout";

  const { sessionToken, cors } =
    surface === "order-status"
      ? await authenticate.public.customerAccount(request)
      : await authenticate.public.checkout(request);

  const orderId = numericId(url.searchParams.get("orderId"));
  if (!orderId) {
    return cors(
      Response.json({ pending: true, heading: de.heading, items: [] }),
    );
  }

  // sessionToken.dest identifies the shop the request originated from.
  void sessionToken;

  const deliveries = await prisma.delivery.findMany({
    where: { shopifyOrderId: orderId },
    include: {
      product: { select: { title: true } },
      licenseKey: { select: { keyValue: true } },
      tokens: {
        where: { revoked: false },
        include: { file: { select: { fileName: true } } },
      },
    },
  });

  const now = Date.now();
  const items = deliveries.map((d) => ({
    productTitle: d.product.title,
    licenseKey: d.status === "DELIVERED" ? (d.licenseKey?.keyValue ?? null) : null,
    status: d.status,
    downloads: d.tokens
      .filter((t) => t.expiresAt.getTime() > now && t.downloadCount < t.maxDownloads)
      .map((t) => ({
        fileName: t.file.fileName,
        url: `${env.appUrl}/download/${t.token}`,
      })),
  }));

  // "Pending" when an order we manage has no delivered line yet (still
  // processing right after payment).
  const pending =
    deliveries.length === 0 || deliveries.every((d) => d.status === "PENDING");

  return cors(
    Response.json({
      pending,
      heading: de.heading,
      keyLabel: de.keyLabel,
      downloadButton: de.downloadButton,
      pendingMessage: de.pending,
      legal: de.legal,
      items,
    }),
  );
};
