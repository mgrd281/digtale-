import type { HeadersFunction, LoaderFunctionArgs } from "react-router";
import { useEffect, useState } from "react";
import { useLoaderData } from "react-router";
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

const STAT_CSS = `
  .kx-stats {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 14px;
  }
  .kx-stat {
    background: #fff;
    border: 1px solid #e5e7eb;
    border-radius: 16px;
    padding: 18px 20px;
    box-shadow: 0 1px 2px rgba(16, 24, 40, 0.05);
  }
  .kx-stat-label { font-size: 13px; color: #6b7280; font-weight: 550; }
  .kx-stat-value { font-size: 30px; font-weight: 750; line-height: 1.1; margin-top: 8px; }
`;

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent: string;
}) {
  return (
    <div className="kx-stat">
      <div className="kx-stat-label">{label}</div>
      <div className="kx-stat-value" style={{ color: accent }}>
        {value}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { productCount, failedCount, pendingCount, deliveredCount, lowStock } =
    useLoaderData<typeof loader>();
  // Dismissals persist (per count): a banner stays hidden until the number
  // changes (e.g. a new failed delivery), then it reappears.
  const [hideFailed, setHideFailed] = useState(false);
  const [hideLowStock, setHideLowStock] = useState(false);
  useEffect(() => {
    setHideFailed(localStorage.getItem("kx_dismiss_failed") === String(failedCount));
    setHideLowStock(
      localStorage.getItem("kx_dismiss_lowstock") === String(lowStock.length),
    );
  }, [failedCount, lowStock.length]);
  const dismissFailed = () => {
    localStorage.setItem("kx_dismiss_failed", String(failedCount));
    setHideFailed(true);
  };
  const dismissLowStock = () => {
    localStorage.setItem("kx_dismiss_lowstock", String(lowStock.length));
    setHideLowStock(true);
  };

  return (
    <s-page heading="KARINEX – Digitale Auslieferung">
      <s-link slot="primary-action" href="/app/products">
        Produkte verwalten
      </s-link>

      {failedCount > 0 && !hideFailed && (
        <s-banner tone="critical" heading="Fehlgeschlagene Lieferungen">
          <s-stack direction="block" gap="small-300">
            <s-paragraph>
              {failedCount} Lieferung(en) konnten nicht ausgeliefert werden.{" "}
              <s-link href="/app/deliveries?status=FAILED">Jetzt prüfen</s-link>.
            </s-paragraph>
            <s-button variant="tertiary" onClick={dismissFailed}>
              ✕ Ausblenden
            </s-button>
          </s-stack>
        </s-banner>
      )}

      {lowStock.length > 0 && !hideLowStock && (
        <s-banner tone="warning" heading={`Niedriger Schlüsselbestand (${lowStock.length})`}>
          <s-stack direction="block" gap="small-300">
            <s-paragraph>
              {lowStock.length} Produkt(e) benötigen Schlüssel, z. B.{" "}
              {lowStock.slice(0, 3).map((p) => p.title).join(", ")}
              {lowStock.length > 3 ? ` und ${lowStock.length - 3} weitere` : ""}.{" "}
              <s-link href="/app/products">Produkte verwalten</s-link>.
            </s-paragraph>
            <s-button variant="tertiary" onClick={dismissLowStock}>
              ✕ Ausblenden
            </s-button>
          </s-stack>
        </s-banner>
      )}

      <s-section heading="Auf einen Blick">
        <style>{STAT_CSS}</style>
        <div className="kx-stats">
          <StatCard label="Produkte" value={productCount} accent="#3538cd" />
          <StatCard label="Ausgeliefert" value={deliveredCount} accent="#1a7f37" />
          <StatCard label="In Bearbeitung" value={pendingCount} accent="#b54708" />
          <StatCard label="Fehlgeschlagen" value={failedCount} accent="#b42318" />
        </div>
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
