import type { LoaderFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";
import { numericId } from "../lib/shared";
import { env } from "../lib/env.server";
import { getStrings } from "../lib/strings.server";

// Read-only endpoint consumed by the Thank-you and Order-status UI extensions.
// The request is authenticated via the extension's signed session token
// (verified by authenticate.public.*), and the response carries CORS headers
// so the sandboxed extension can read it.
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const surface = url.searchParams.get("surface") ?? "checkout";
  const t = getStrings(url.searchParams.get("locale"));

  const { sessionToken, cors } =
    surface === "order-status"
      ? await authenticate.public.customerAccount(request)
      : await authenticate.public.checkout(request);

  const orderId = numericId(url.searchParams.get("orderId"));
  if (!orderId) {
    return cors(
      Response.json({ pending: true, heading: t.heading, items: [] }),
    );
  }

  // sessionToken.dest identifies the shop the request originated from.
  void sessionToken;

  const deliveries = await prisma.delivery.findMany({
    where: { shopifyOrderId: orderId },
    include: {
      product: {
        select: {
          title: true,
          deliveryMessage: true,
          links: { orderBy: { createdAt: "asc" } },
        },
      },
      licenseKey: { select: { keyValue: true } },
      tokens: {
        where: { revoked: false },
        include: { file: { select: { fileName: true } } },
      },
    },
  });

  const now = Date.now();
  // Only show products that are actually delivered (set up + provisioned).
  const items = deliveries
    .filter((d) => d.status === "DELIVERED")
    .map((d) => {
      const linkDownloads = d.product.links.map((l) => ({
        fileName: l.version || l.label,
        url: l.url,
      }));
      const fileDownloads = d.tokens
        .filter(
          (tok) =>
            tok.expiresAt.getTime() > now && tok.downloadCount < tok.maxDownloads,
        )
        .map((tok) => ({
          fileName: tok.file.fileName,
          url: `${env.appUrl}/download/${tok.token}`,
        }));
      return {
        productTitle: d.product.title,
        message: d.product.deliveryMessage ?? null,
        licenseKey: d.licenseKey?.keyValue ?? null,
        status: d.status,
        downloads: [...linkDownloads, ...fileDownloads],
      };
    });

  const anyPending = deliveries.some((d) => d.status === "PENDING");
  // pending: something is still processing right after payment.
  const pending = items.length === 0 && anyPending;
  // hide: this order has nothing we deliver (unconfigured product / not ours) –
  // the customer block then renders nothing at all.
  const hide = items.length === 0 && !anyPending;

  return cors(
    Response.json({
      hide,
      pending,
      heading: t.heading,
      keyLabel: t.keyLabel,
      downloadButton: t.downloadButton,
      pendingMessage: t.pending,
      legal: t.legal,
      items,
    }),
  );
};
