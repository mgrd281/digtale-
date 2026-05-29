import type { HeadersFunction, LoaderFunctionArgs } from "react-router";
import { useLoaderData } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";
import { env } from "../lib/env.server";
import { generateDownloadToken } from "../lib/tokens.server";
import { getSettings } from "../lib/settings.server";
import { t, statusLabel } from "../lib/i18n";

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  await authenticate.admin(request);
  const settings = await getSettings();

  let delivery = await prisma.delivery.findUnique({
    where: { id: params.id },
    include: {
      product: { include: { links: { orderBy: { createdAt: "asc" } } } },
      licenseKey: true,
      tokens: { include: { file: true } },
    },
  });
  if (!delivery) {
    throw new Response("Lieferung nicht gefunden", { status: 404 });
  }

  // Backfill the public share token for older deliveries.
  if (!delivery.accessToken) {
    await prisma.delivery.update({
      where: { id: delivery.id },
      data: { accessToken: generateDownloadToken() },
    });
    delivery = (await prisma.delivery.findUnique({
      where: { id: params.id },
      include: {
        product: { include: { links: { orderBy: { createdAt: "asc" } } } },
        licenseKey: true,
        tokens: { include: { file: true } },
      },
    }))!;
  }

  const downloads = [
    ...delivery.product.links.map((l) => ({
      name: l.version || l.label,
      label: l.label,
      url: l.url,
    })),
    ...delivery.tokens
      .filter((tok) => !tok.revoked)
      .map((tok) => ({
        name: tok.file.fileName,
        label: "Download",
        url: `${env.appUrl}/download/${tok.token}`,
      })),
  ];

  return {
    locale: settings.adminLocale,
    orderName: delivery.shopifyOrderName,
    email: delivery.customerEmail,
    status: delivery.status,
    title: delivery.product.title,
    message: delivery.product.deliveryMessage,
    licenseKey: delivery.licenseKey?.keyValue ?? null,
    downloads,
    publicUrl: `${env.appUrl}/delivery/${delivery.accessToken}`,
  };
};

export default function DeliveryCustomerView() {
  const d = useLoaderData<typeof loader>();

  return (
    <s-page heading={`${t(d.locale, "delivery.heading")} ${d.orderName}`}>
      <s-link slot="primary-action" href="/app/deliveries">
        {t(d.locale, "delivery.back")}
      </s-link>

      <s-section heading={t(d.locale, "delivery.orderSection")}>
        <s-stack direction="inline" gap="large">
          <s-badge>{d.email}</s-badge>
          <s-badge
            tone={
              d.status === "DELIVERED"
                ? "success"
                : d.status === "FAILED"
                  ? "critical"
                  : "warning"
            }
          >
            {statusLabel(d.locale, d.status)}
          </s-badge>
        </s-stack>
      </s-section>

      <s-section heading={t(d.locale, "delivery.publicLinkSection")}>
        <s-paragraph>{t(d.locale, "delivery.publicLinkIntro")}</s-paragraph>
        <div
          style={{
            display: "flex",
            gap: "8px",
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <input
            readOnly
            value={d.publicUrl}
            onFocus={(e) => e.currentTarget.select()}
            style={{
              flex: "1 1 320px",
              minWidth: "260px",
              padding: "10px 12px",
              border: "1px solid #d8dde3",
              borderRadius: "9px",
              fontSize: "13px",
              color: "#334155",
              background: "#fff",
            }}
          />
          <s-link href={d.publicUrl} target="_blank">
            {t(d.locale, "delivery.open")}
          </s-link>
        </div>
      </s-section>

      <s-section heading={t(d.locale, "delivery.customerViewSection")}>
        <s-paragraph>{t(d.locale, "delivery.customerViewIntro")}</s-paragraph>
        <div
          style={{
            maxWidth: "520px",
            border: "1px solid #e0e4e2",
            borderRadius: "12px",
            padding: "20px",
            background: "#fafbfb",
          }}
        >
          <div
            style={{
              fontSize: "17px",
              fontWeight: 700,
              color: "#0b3d2e",
              marginBottom: "6px",
            }}
          >
            {d.title}
          </div>

          {d.message && (
            <div
              style={{
                fontSize: "14px",
                lineHeight: 1.6,
                color: "#444",
                whiteSpace: "pre-line",
                margin: "8px 0",
              }}
            >
              {d.message}
            </div>
          )}

          {d.licenseKey && (
            <div style={{ margin: "14px 0" }}>
              <div style={{ fontSize: "12px", color: "#777" }}>
                {t(d.locale, "delivery.yourLicenseKey")}
              </div>
              <div
                style={{
                  fontFamily: "monospace",
                  fontSize: "18px",
                  fontWeight: 700,
                  letterSpacing: "1px",
                  background: "#f4f6f5",
                  border: "1px solid #e0e4e2",
                  borderRadius: "6px",
                  padding: "10px 14px",
                  display: "inline-block",
                  marginTop: "4px",
                }}
              >
                {d.licenseKey}
              </div>
            </div>
          )}

          <div style={{ marginTop: "8px" }}>
            {d.downloads.map((dl, i) => (
              <div key={i} style={{ marginTop: "10px" }}>
                {dl.name && (
                  <div
                    style={{ fontSize: "12px", color: "#555", marginBottom: "4px" }}
                  >
                    {dl.name}
                  </div>
                )}
                <a
                  href={dl.url}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    display: "inline-block",
                    background: "#0b3d2e",
                    color: "#fff",
                    textDecoration: "none",
                    fontWeight: 600,
                    padding: "12px 22px",
                    borderRadius: "8px",
                  }}
                >
                  {dl.label}
                </a>
              </div>
            ))}
          </div>

          {!d.licenseKey && d.downloads.length === 0 && (
            <div style={{ fontSize: "13px", color: "#b00", marginTop: "8px" }}>
              {t(d.locale, "delivery.noContentWarning")}
            </div>
          )}
        </div>
      </s-section>
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
