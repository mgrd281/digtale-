import nodemailer, { type Transporter } from "nodemailer";
import { env } from "./env.server";
import { getStrings, type Strings } from "./strings.server";
import { getSettings } from "./settings.server";
import type { AppSettings } from "@prisma/client";

let transporter: Transporter | null = null;

function getTransporter(): Transporter {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.smtp.host,
      port: env.smtp.port,
      secure: env.smtp.secure,
      auth: { user: env.smtp.user, pass: env.smtp.pass },
    });
  }
  return transporter;
}

export interface DeliveryEmailItem {
  productTitle: string;
  message?: string | null;
  licenseKey?: string | null;
  downloads: { fileName: string; url: string }[];
  linkExpiryHours: number;
  downloadLimit: number;
}

const escape = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function renderItem(
  item: DeliveryEmailItem,
  t: Strings,
  brand: string,
): string {
  const message = item.message
    ? `<p style="margin:12px 0 0;font-size:14px;line-height:1.6;color:#444;
         white-space:pre-line;">${escape(item.message)}</p>`
    : "";

  const key = item.licenseKey
    ? `<p style="margin:16px 0 4px;font-size:14px;color:#555;">${t.keyLabel}</p>
       <p style="margin:0;font-family:monospace;font-size:18px;font-weight:700;
          letter-spacing:1px;background:#f4f6f5;border:1px solid #e0e4e2;
          border-radius:6px;padding:12px 16px;display:inline-block;">
          ${escape(item.licenseKey)}</p>`
    : "";

  const buttons = item.downloads
    .map(
      (d) => `
      <tr><td style="padding:6px 0;">
        <a href="${d.url}" style="background:${brand};color:#fff;text-decoration:none;
           font-weight:600;padding:14px 28px;border-radius:8px;display:inline-block;">
           ${t.downloadButton}</a>
        <span style="margin-left:12px;font-size:13px;color:#777;">${escape(d.fileName)}</span>
      </td></tr>`,
    )
    .join("");

  const validity = item.downloads.length
    ? `<p style="margin:12px 0 0;font-size:13px;color:#777;">
         ${t.validityNote(item.linkExpiryHours, item.downloadLimit)}</p>`
    : "";

  return `
    <div style="border:1px solid #e0e4e2;border-radius:10px;padding:24px;margin:0 0 20px;">
      <h2 style="margin:0 0 4px;font-size:18px;color:${brand};">${escape(item.productTitle)}</h2>
      ${message}
      ${key}
      ${buttons ? `<table role="presentation" style="margin-top:16px;">${buttons}</table>` : ""}
      ${validity}
      <p style="margin:16px 0 0;font-size:12px;color:#999;line-height:1.5;">${t.legal}</p>
    </div>`;
}

function renderHtml(
  items: DeliveryEmailItem[],
  t: Strings,
  settings: AppSettings,
): string {
  const brand = settings.brandColor || "#0b3d2e";
  const header = settings.logoUrl
    ? `<img src="${settings.logoUrl}" alt="${escape(settings.shopName)}" style="max-height:48px;margin-bottom:24px;" />`
    : `<div style="font-size:24px;font-weight:800;letter-spacing:2px;color:${brand};
         margin-bottom:24px;">${escape(settings.shopName)}</div>`;
  const intro = settings.emailIntro?.trim() || t.emailIntro;
  const footer = settings.emailFooter?.trim() || t.footer;

  return `<!doctype html><html lang="de"><body style="margin:0;background:#f7f8f7;
    font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#222;">
    <div style="max-width:600px;margin:0 auto;padding:32px 24px;">
      ${header}
      <p style="font-size:15px;margin:0 0 8px;">${t.emailGreeting}</p>
      <p style="font-size:15px;line-height:1.6;margin:0 0 24px;">${escape(intro)}</p>
      ${items.map((it) => renderItem(it, t, brand)).join("")}
      <p style="font-size:13px;color:#777;margin:24px 0 0;">${escape(footer)}</p>
    </div></body></html>`;
}

function renderText(
  items: DeliveryEmailItem[],
  t: Strings,
  settings: AppSettings,
): string {
  const lines = [t.emailGreeting, "", settings.emailIntro?.trim() || t.emailIntro, ""];
  for (const item of items) {
    lines.push(`== ${item.productTitle} ==`);
    if (item.message) lines.push(item.message);
    if (item.licenseKey) lines.push(`${t.keyLabel} ${item.licenseKey}`);
    for (const d of item.downloads) {
      lines.push(`${t.downloadButton} (${d.fileName}): ${d.url}`);
    }
    if (item.downloads.length) {
      lines.push(t.validityNote(item.linkExpiryHours, item.downloadLimit));
    }
    lines.push(t.legal, "");
  }
  lines.push(settings.emailFooter?.trim() || t.footer);
  return lines.join("\n");
}

export async function sendDeliveryEmail(params: {
  shop: string;
  to: string;
  orderName: string;
  items: DeliveryEmailItem[];
  locale?: string | null;
}): Promise<void> {
  const { shop, to, orderName, items, locale } = params;
  const settings = await getSettings(shop);
  const t = getStrings(locale ?? settings.defaultLocale);
  await getTransporter().sendMail({
    from: env.smtp.from,
    to,
    subject: t.emailSubject(orderName),
    text: renderText(items, t, settings),
    html: renderHtml(items, t, settings),
  });
}

// Send a sample delivery e-mail so the merchant can verify the SMTP setup and
// preview the branded template without a real order.
export async function sendTestEmail(params: {
  shop: string;
  to: string;
  locale?: string | null;
}): Promise<void> {
  const { shop, to, locale } = params;
  const settings = await getSettings(shop);
  const t = getStrings(locale ?? settings.defaultLocale);
  const sample: DeliveryEmailItem = {
    productTitle: "KARINEX Test-Produkt",
    message:
      locale && locale.toLowerCase().startsWith("en")
        ? "This is a sample delivery e-mail to verify your setup."
        : "Dies ist eine Beispiel-Liefermail zur Überprüfung Ihrer Einrichtung.",
    licenseKey: "ABCD-1234-EFGH-5678",
    downloads: [{ fileName: "setup.exe", url: `${env.appUrl}/` }],
    linkExpiryHours: 72,
    downloadLimit: 3,
  };
  await getTransporter().sendMail({
    from: env.smtp.from,
    to,
    subject: `[Test] ${t.emailSubject("#TEST")}`,
    text: renderText([sample], t, settings),
    html: renderHtml([sample], t, settings),
  });
}

export async function sendMerchantAlert(params: {
  subject: string;
  message: string;
}): Promise<void> {
  await getTransporter().sendMail({
    from: env.smtp.from,
    to: env.smtp.merchantAlertTo,
    subject: `[KARINEX Fulfillment] ${params.subject}`,
    text: params.message,
  });
}
