import type {
  ActionFunctionArgs,
  HeadersFunction,
  LoaderFunctionArgs,
} from "react-router";
import { useLoaderData, useFetcher } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";
import { numericId, LOW_STOCK_THRESHOLD } from "../lib/shared";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);

  const products = await prisma.product.findMany({
    orderBy: { title: "asc" },
  });

  const counts = await prisma.licenseKey.groupBy({
    by: ["productId", "status"],
    _count: { _all: true },
  });

  const fileCounts = await prisma.digitalFile.groupBy({
    by: ["productId"],
    _count: { _all: true },
  });

  const linkCounts = await prisma.productLink.groupBy({
    by: ["productId"],
    _count: { _all: true },
  });

  const rows = products.map((p) => {
    const available =
      counts.find((c) => c.productId === p.id && c.status === "AVAILABLE")
        ?._count._all ?? 0;
    const assigned =
      counts.find((c) => c.productId === p.id && c.status === "ASSIGNED")
        ?._count._all ?? 0;
    const files =
      fileCounts.find((c) => c.productId === p.id)?._count._all ?? 0;
    const links =
      linkCounts.find((c) => c.productId === p.id)?._count._all ?? 0;
    return {
      id: p.id,
      title: p.title,
      imageUrl: p.imageUrl,
      deliveryType: p.deliveryType,
      available,
      assigned,
      files,
      links,
    };
  });

  // A product is "ready" once it can actually deliver something: a key in
  // stock (for key products), a file, or a download link.
  const ready = rows.filter((r) => {
    const needsKey = r.deliveryType === "KEY" || r.deliveryType === "BOTH";
    return (needsKey ? r.available > 0 : true) && (r.available > 0 || r.files > 0 || r.links > 0);
  }).length;

  return { rows, ready };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin } = await authenticate.admin(request);

  // Sync the first 250 products from Shopify into the local catalog.
  const response = await admin.graphql(
    `#graphql
    query SyncProducts {
      products(first: 250, sortKey: TITLE) {
        edges {
          node {
            id
            title
            featuredImage { url }
            featuredMedia { preview { image { url } } }
          }
        }
      }
    }`,
  );
  const json = await response.json();
  const edges = json.data?.products?.edges ?? [];

  let synced = 0;
  for (const edge of edges) {
    const node = edge.node;
    const imageUrl =
      node.featuredImage?.url ??
      node.featuredMedia?.preview?.image?.url ??
      null;
    await prisma.product.upsert({
      where: { shopifyProductId: numericId(node.id) },
      update: { title: node.title, imageUrl },
      create: {
        shopifyProductId: numericId(node.id),
        title: node.title,
        imageUrl,
      },
    });
    synced += 1;
  }

  return { synced };
};

const DELIVERY_LABEL: Record<string, string> = {
  KEY: "Schlüssel",
  FILE: "Datei",
  BOTH: "Schlüssel + Datei",
};

type Row = {
  id: string;
  title: string;
  imageUrl: string | null;
  deliveryType: string;
  available: number;
  assigned: number;
  files: number;
  links: number;
};

const CARD_CSS = `
  .kx-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(210px, 1fr));
    gap: 16px;
  }
  .kx-card {
    display: flex;
    flex-direction: column;
    background: #fff;
    border: 1px solid #e5e7eb;
    border-radius: 16px;
    overflow: hidden;
    text-decoration: none;
    color: inherit;
    box-shadow: 0 1px 2px rgba(16, 24, 40, 0.05);
    transition: box-shadow .18s ease, transform .18s ease, border-color .18s ease;
  }
  .kx-card:hover {
    box-shadow: 0 12px 28px rgba(16, 24, 40, 0.12);
    transform: translateY(-3px);
    border-color: #d1d5db;
  }
  .kx-thumb {
    aspect-ratio: 16 / 10;
    background: linear-gradient(135deg, #f8fafc, #eef2f6);
    display: flex; align-items: center; justify-content: center;
    border-bottom: 1px solid #eef0f2;
  }
  .kx-thumb img { width: 100%; height: 100%; object-fit: contain; padding: 10px; box-sizing: border-box; }
  .kx-noimg { color: #9aa3af; font-size: 12px; letter-spacing: .02em; }
  .kx-body { padding: 14px 16px 16px; display: flex; flex-direction: column; gap: 10px; }
  .kx-title {
    font-weight: 650; font-size: 13.5px; line-height: 1.35; color: #111827;
    display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
    overflow: hidden; min-height: 37px;
  }
  .kx-badges { display: flex; gap: 6px; flex-wrap: wrap; }
  .kx-badge { font-size: 11px; font-weight: 600; padding: 3px 9px; border-radius: 999px; white-space: nowrap; }
  .kx-meta { font-size: 12px; color: #6b7280; margin-top: 2px; }
`;

function ProductCard({ r }: { r: Row }) {
  const needsKey = r.deliveryType === "KEY" || r.deliveryType === "BOTH";
  const low = needsKey && r.available < LOW_STOCK_THRESHOLD;
  const isReady =
    (needsKey ? r.available > 0 : true) &&
    (r.available > 0 || r.files > 0 || r.links > 0);

  const meta: string[] = [];
  if (needsKey) meta.push(`${r.available} Schlüssel`);
  if (r.links > 0) meta.push(`${r.links} Links`);
  if (r.files > 0) meta.push(`${r.files} Dateien`);

  return (
    <a className="kx-card" href={`/app/products/${r.id}`}>
      <div className="kx-thumb">
        {r.imageUrl ? (
          <img src={r.imageUrl} alt={r.title} loading="lazy" />
        ) : (
          <span className="kx-noimg">Kein Bild</span>
        )}
      </div>
      <div className="kx-body">
        <div className="kx-title">{r.title}</div>
        <div className="kx-badges">
          <span className="kx-badge" style={{ background: "#eef2ff", color: "#3538cd" }}>
            {DELIVERY_LABEL[r.deliveryType] ?? r.deliveryType}
          </span>
          <span
            className="kx-badge"
            style={
              isReady
                ? { background: "#e7f7ec", color: "#1a7f37" }
                : { background: "#fef3c7", color: "#92400e" }
            }
          >
            {isReady ? "Bereit" : "Einrichten"}
          </span>
          {low && needsKey && (
            <span className="kx-badge" style={{ background: "#fde8e8", color: "#b42318" }}>
              Niedriger Bestand
            </span>
          )}
        </div>
        {meta.length > 0 && <div className="kx-meta">{meta.join(" · ")}</div>}
      </div>
    </a>
  );
}

export default function Products() {
  const { rows, ready } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();
  const syncing = fetcher.state !== "idle";

  return (
    <s-page heading="Produkte">
      <s-button
        slot="primary-action"
        onClick={() => fetcher.submit({}, { method: "POST" })}
        {...(syncing ? { loading: true } : {})}
      >
        Mit Shopify synchronisieren
      </s-button>

      {fetcher.data?.synced !== undefined && (
        <s-banner tone="success">
          <s-paragraph>{fetcher.data.synced} Produkte synchronisiert.</s-paragraph>
        </s-banner>
      )}

      <s-section heading="Katalog">
        {rows.length === 0 ? (
          <s-stack direction="block" gap="base">
            <s-paragraph>
              Noch keine Produkte vorhanden. Synchronisieren Sie zuerst Ihren
              Shopify-Katalog.
            </s-paragraph>
            <s-button
              variant="primary"
              onClick={() => fetcher.submit({}, { method: "POST" })}
              {...(syncing ? { loading: true } : {})}
            >
              Mit Shopify synchronisieren
            </s-button>
          </s-stack>
        ) : (
          <s-stack direction="block" gap="base">
            <s-stack direction="inline" gap="small">
              <s-badge tone="info">{rows.length} Produkte</s-badge>
              <s-badge tone={ready === rows.length ? "success" : "warning"}>
                {ready} lieferbereit
              </s-badge>
            </s-stack>
            <style>{CARD_CSS}</style>
            <div className="kx-grid">
              {rows.map((r) => (
                <ProductCard key={r.id} r={r} />
              ))}
            </div>
          </s-stack>
        )}
      </s-section>
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
