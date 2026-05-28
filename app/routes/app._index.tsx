import type { HeadersFunction, LoaderFunctionArgs } from "react-router";
import { useLoaderData, Link } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";
import { LOW_STOCK_THRESHOLD } from "../lib/shared";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);

  const [products, failedCount, pendingCount, deliveredCount] = await Promise.all([
    prisma.product.findMany({
      orderBy: { title: "asc" },
      include: {
        _count: {
          select: { licenseKeys: { where: { status: "AVAILABLE" } } },
        },
      },
    }),
    prisma.delivery.count({ where: { status: "FAILED" } }),
    prisma.delivery.count({ where: { status: "PENDING" } }),
    prisma.delivery.count({ where: { status: "DELIVERED" } }),
  ]);

  const lowStock = products
    .filter(
      (p) =>
        (p.deliveryType === "KEY" || p.deliveryType === "BOTH") &&
        p._count.licenseKeys < LOW_STOCK_THRESHOLD,
    )
    .map((p) => ({ id: p.id, title: p.title, available: p._count.licenseKeys }));

  return {
    productCount: products.length,
    failedCount,
    pendingCount,
    deliveredCount,
    lowStock,
  };
};

export default function Dashboard() {
  const { productCount, failedCount, pendingCount, deliveredCount, lowStock } =
    useLoaderData<typeof loader>();

  return (
    <s-page heading="KARINEX – Digitale Auslieferung">
      <s-link slot="primary-action" href="/app/products">
        Produkte verwalten
      </s-link>

      {failedCount > 0 && (
        <s-banner tone="critical" heading="Fehlgeschlagene Lieferungen">
          <s-paragraph>
            {failedCount} Lieferung(en) konnten nicht ausgeliefert werden.{" "}
            <Link to="/app/deliveries?status=FAILED">Jetzt prüfen</Link>.
          </s-paragraph>
        </s-banner>
      )}

      {lowStock.length > 0 && (
        <s-banner tone="warning" heading="Niedriger Schlüsselbestand">
          <s-unordered-list>
            {lowStock.map((p) => (
              <s-list-item key={p.id}>
                {p.title}: nur noch {p.available} Schlüssel verfügbar
              </s-list-item>
            ))}
          </s-unordered-list>
        </s-banner>
      )}

      <s-section heading="Auf einen Blick">
        <s-stack direction="inline" gap="large">
          <s-box padding="base" borderWidth="base" borderRadius="base">
            <s-text>Produkte</s-text>
            <s-heading>{String(productCount)}</s-heading>
          </s-box>
          <s-box padding="base" borderWidth="base" borderRadius="base">
            <s-text>Ausgeliefert</s-text>
            <s-heading>{String(deliveredCount)}</s-heading>
          </s-box>
          <s-box padding="base" borderWidth="base" borderRadius="base">
            <s-text>In Bearbeitung</s-text>
            <s-heading>{String(pendingCount)}</s-heading>
          </s-box>
          <s-box padding="base" borderWidth="base" borderRadius="base">
            <s-text>Fehlgeschlagen</s-text>
            <s-heading>{String(failedCount)}</s-heading>
          </s-box>
        </s-stack>
      </s-section>

      <s-section slot="aside" heading="Erste Schritte">
        <s-ordered-list>
          <s-list-item>
            Unter <s-link href="/app/products">Produkte</s-link> mit Shopify
            synchronisieren.
          </s-list-item>
          <s-list-item>
            Lieferart festlegen sowie Schlüssel und Dateien hochladen.
          </s-list-item>
          <s-list-item>
            Nach Zahlungseingang läuft die Auslieferung automatisch.
          </s-list-item>
        </s-ordered-list>
      </s-section>
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
