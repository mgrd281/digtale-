import nodemailer, { type Transporter } from "nodemailer";
import { env } from "./env.server";
import { de } from "./strings.server";

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

const BRAND = "#0b3d2e"; // KARINEX deep green
const escape = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function renderItem(item: DeliveryEmailItem): string {
  const message = item.message
    ? `<p style="margin:12px 0 0;font-size:14px;line-height:1.6;color:#444;
         white-space:pre-line;">${escape(item.message)}</p>`
    : "";

  const key = item.licenseKey
    ? `<p style="margin:16px 0 4px;font-size:14px;color:#555;">${de.keyLabel}</p>
       <p style="margin:0;font-family:monospace;font-size:18px;font-weight:700;
          letter-spacing:1px;background:#f4f6f5;border:1px solid #e0e4e2;
          border-radius:6px;padding:12px 16px;display:inline-block;">
          ${escape(item.licenseKey)}</p>`
    : "";

  const buttons = item.downloads
    .map(
      (d) => `
      <tr><td style="padding:6px 0;">
        <a href="${d.url}" style="background:${BRAND};color:#fff;text-decoration:none;
           font-weight:600;padding:14px 28px;border-radius:8px;display:inline-block;">
           ${de.downloadButton}</a>
        <span style="margin-left:12px;font-size:13px;color:#777;">${escape(d.fileName)}</span>
      </td></tr>`,
    )
    .join("");

  const validity = item.downloads.length
    ? `<p style="margin:12px 0 0;font-size:13px;color:#777;">
         ${de.validityNote(item.linkExpiryHours, item.downloadLimit)}</p>`
    : "";

  return `
    <div style="border:1px solid #e0e4e2;border-radius:10px;padding:24px;margin:0 0 20px;">
      <h2 style="margin:0 0 4px;font-size:18px;color:${BRAND};">${escape(item.productTitle)}</h2>
      ${message}
      ${key}
      ${buttons ? `<table role="presentation" style="margin-top:16px;">${buttons}</table>` : ""}
      ${validity}
      <p style="margin:16px 0 0;font-size:12px;color:#999;line-height:1.5;">${de.legal}</p>
    </div>`;
}

function renderHtml(orderName: string, items: DeliveryEmailItem[]): string {
  return `<!doctype html><html lang="de"><body style="margin:0;background:#f7f8f7;
    font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#222;">
    <div style="max-width:600px;margin:0 auto;padding:32px 24px;">
      <div style="font-size:24px;font-weight:800;letter-spacing:2px;color:${BRAND};
         margin-bottom:24px;">KARINEX</div>
      <p style="font-size:15px;margin:0 0 8px;">${de.emailGreeting}</p>
      <p style="font-size:15px;line-height:1.6;margin:0 0 24px;">${de.emailIntro}</p>
      ${items.map(renderItem).join("")}
      <p style="font-size:13px;color:#777;margin:24px 0 0;">${de.footer}</p>
    </div></body></html>`;
}

function renderText(orderName: string, items: DeliveryEmailItem[]): string {
  const lines = [de.emailGreeting, "", de.emailIntro, ""];
  for (const item of items) {
    lines.push(`== ${item.productTitle} ==`);
    if (item.message) {
      lines.push(item.message);
    }
    if (item.licenseKey) {
      lines.push(`${de.keyLabel} ${item.licenseKey}`);
    }
    for (const d of item.downloads) {
      lines.push(`${de.downloadButton} (${d.fileName}): ${d.url}`);
    }
    if (item.downloads.length) {
      lines.push(de.validityNote(item.linkExpiryHours, item.downloadLimit));
    }
    lines.push(de.legal, "");
  }
  lines.push(de.footer);
  return lines.join("\n");
}

export async function sendDeliveryEmail(params: {
  to: string;
  orderName: string;
  items: DeliveryEmailItem[];
}): Promise<void> {
  const { to, orderName, items } = params;
  await getTransporter().sendMail({
    from: env.smtp.from,
    to,
    subject: de.emailSubject(orderName),
    text: renderText(orderName, items),
    html: renderHtml(orderName, items),
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
