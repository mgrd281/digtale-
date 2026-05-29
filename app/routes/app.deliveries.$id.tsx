import type { HeadersFunction, LoaderFunctionArgs } from "react-router";
import { useLoaderData } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";
import { env } from "../lib/env.server";
import { generateDownloadToken } from "../lib/tokens.server";

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  await authenticate.admin(request);

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
      .filter((t) => !t.revoked)
      .map((t) => ({
        name: t.file.fileName,
        label: "Download",
        url: `${env.appUrl}/download/${t.token}`,
      })),
  ];

  return {
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
    <s-page heading={`Lieferung ${d.orderName}`}>
      <s-link slot="primary-action" href="/app/deliveries">
        Zurück
      </s-link>

      <s-section heading="Bestellung">
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
            {d.status}
          </s-badge>
        </s-stack>
      </s-section>

      <s-section heading="Öffentlicher Link (wie der Kunde ihn sieht)">
        <s-paragraph>
          Dieser Link öffnet die Lieferseite direkt – ohne Login. Zum Ansehen
          oder erneuten Teilen mit dem Kunden.
        </s-paragraph>
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
            Öffnen
          </s-link>
        </div>
      </s-section>

      <s-section heading="Kundenansicht – Dankesseite">
        <s-paragraph>
          Genau das hat der Kunde nach dem Kauf gesehen (echter Schlüssel und
          echte Download-Links dieser Bestellung).
        </s-paragraph>
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
                Ihr Lizenzschlüssel:
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
              Für diese Lieferung sind kein Schlüssel und keine Downloads
              vorhanden.
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
