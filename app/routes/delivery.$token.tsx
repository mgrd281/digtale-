import type { LoaderFunctionArgs } from "react-router";
import prisma from "../db.server";
import { env } from "../lib/env.server";
import { getSettings } from "../lib/settings.server";
import { getStrings } from "../lib/strings.server";

const esc = (s: string) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

// Public, shareable delivery page – opened directly (no Shopify admin). Shows
// exactly what the customer received: licence key + download links + message.
export const loader = async ({ params }: LoaderFunctionArgs) => {
  const token = params.token ?? "";
  const delivery = token
    ? await prisma.delivery.findUnique({
        where: { accessToken: token },
        include: {
          product: { include: { links: { orderBy: { createdAt: "asc" } } } },
          licenseKey: true,
          tokens: { include: { file: true } },
        },
      })
    : null;

  // No delivery → generic invalid-link page (no shop branding available).
  if (!delivery) {
    return new Response(
      `<!doctype html><html lang="de"><head><meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>Link ungültig</title></head>
      <body style="margin:0;background:#f4f6f8;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#1a1a1a;">
        <div style="max-width:560px;margin:0 auto;padding:32px 18px;">
          <div style="background:#fff;border:1px solid #e5e7eb;border-radius:14px;padding:28px;text-align:center;">
            <h1 style="font-size:18px;margin:0 0 8px;">Link ungültig</h1>
            <p style="color:#666;margin:0;">Diese Lieferung wurde nicht gefunden.</p>
          </div>
        </div>
      </body></html>`,
      { status: 404, headers: { "content-type": "text/html; charset=utf-8" } },
    );
  }

  // Branding comes from the shop that owns this delivery.
  const settings = await getSettings(delivery.shop);
  const t = getStrings(settings.defaultLocale);
  const brand = settings.brandColor || "#0b3d2e";

  const page = (bodyInner: string, status = 200) =>
    new Response(
      `<!doctype html><html lang="de"><head><meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>${esc(settings.shopName)} – ${esc(t.heading)}</title></head>
      <body style="margin:0;background:#f4f6f8;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#1a1a1a;">
        <div style="max-width:560px;margin:0 auto;padding:32px 18px;">${bodyInner}</div>
      </body></html>`,
      { status, headers: { "content-type": "text/html; charset=utf-8" } },
    );

  const header = settings.logoUrl
    ? `<img src="${esc(settings.logoUrl)}" alt="${esc(settings.shopName)}" style="max-height:44px;margin-bottom:22px;" />`
    : `<div style="font-size:22px;font-weight:800;letter-spacing:2px;color:${brand};margin-bottom:22px;">${esc(settings.shopName)}</div>`;

  const delivered = delivery.status === "DELIVERED";
  const now = Date.now();
  const downloads = [
    ...delivery.product.links.map((l) => ({
      name: l.version || l.label,
      label: l.label,
      url: l.url,
    })),
    ...delivery.tokens
      .filter((tk) => !tk.revoked && tk.expiresAt.getTime() > now)
      .map((tk) => ({
        name: tk.file.fileName,
        label: t.downloadButton,
        url: `${env.appUrl}/download/${tk.token}`,
      })),
  ];

  const keyBlock =
    delivered && delivery.licenseKey
      ? `<p style="margin:16px 0 4px;font-size:13px;color:#666;">${esc(t.keyLabel)}</p>
         <div style="font-family:monospace;font-size:18px;font-weight:700;letter-spacing:1px;
            background:#f4f6f5;border:1px solid #e0e4e2;border-radius:8px;padding:12px 16px;
            display:inline-block;">${esc(delivery.licenseKey.keyValue)}</div>`
      : "";

  const message = delivery.product.deliveryMessage
    ? `<p style="font-size:14px;line-height:1.6;color:#444;white-space:pre-line;margin:8px 0 0;">${esc(delivery.product.deliveryMessage)}</p>`
    : "";

  const buttons = downloads
    .map(
      (d) => `
      <div style="margin-top:12px;">
        ${d.name ? `<div style="font-size:12px;color:#555;margin-bottom:5px;">${esc(d.name)}</div>` : ""}
        <a href="${esc(d.url)}" style="display:inline-block;background:${brand};color:#fff;text-decoration:none;
           font-weight:600;padding:13px 24px;border-radius:9px;">${esc(d.label)}</a>
      </div>`,
    )
    .join("");

  const pending = !delivered
    ? `<p style="font-size:14px;color:#666;">${esc(t.pending)}</p>`
    : "";

  return page(`
    ${header}
    <div style="background:#fff;border:1px solid #e5e7eb;border-radius:16px;padding:26px;box-shadow:0 1px 3px rgba(16,24,40,.06);">
      <h1 style="font-size:19px;font-weight:750;color:${brand};margin:0 0 4px;">${esc(delivery.product.title)}</h1>
      <p style="font-size:12px;color:#9aa3af;margin:0 0 8px;">Bestellung ${esc(delivery.shopifyOrderName)}</p>
      ${pending}
      ${message}
      ${keyBlock}
      ${buttons}
      ${downloads.length ? `<p style="margin:18px 0 0;font-size:12px;color:#999;line-height:1.5;">${esc(t.legal)}</p>` : ""}
    </div>
    <p style="text-align:center;color:#aab;font-size:12px;margin-top:18px;">${esc(settings.emailFooter?.trim() || t.footer)}</p>
  `);
};
