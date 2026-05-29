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
        edges { node { id title featuredImage { url } } }
      }
    }`,
  );
  const json = await response.json();
  const edges = json.data?.products?.edges ?? [];

  let synced = 0;
  for (const edge of edges) {
    const node = edge.node;
    const imageUrl = node.featuredImage?.url ?? null;
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
    <s-box
      minInlineSize="220px"
      maxInlineSize="260px"
      padding="base"
      borderWidth="base"
      borderRadius="base"
      background="subdued"
    >
      <s-stack direction="block" gap="small-100">
        <a
          href={`/app/products/${r.id}`}
          style={{
            display: "block",
            aspectRatio: "1 / 1",
            borderRadius: "10px",
            overflow: "hidden",
            background: "#ffffff",
            border: "1px solid rgba(0,0,0,0.08)",
          }}
        >
          {r.imageUrl ? (
            <img
              src={r.imageUrl}
              alt={r.title}
              style={{ width: "100%", height: "100%", objectFit: "contain" }}
            />
          ) : (
            <span
              style={{
                display: "flex",
                width: "100%",
                height: "100%",
                alignItems: "center",
                justifyContent: "center",
                color: "#8a8a8a",
                fontSize: "13px",
              }}
            >
              Kein Bild
            </span>
          )}
        </a>

        <s-link href={`/app/products/${r.id}`}>{r.title}</s-link>

        <s-stack direction="inline" gap="small-300">
          <s-badge>{DELIVERY_LABEL[r.deliveryType] ?? r.deliveryType}</s-badge>
          <s-badge tone={isReady ? "success" : "warning"}>
            {isReady ? "Bereit" : "Einrichten"}
          </s-badge>
          {low && needsKey && <s-badge tone="critical">Niedriger Bestand</s-badge>}
        </s-stack>

        {meta.length > 0 && (
          <s-text color="subdued">{meta.join(" · ")}</s-text>
        )}
      </s-stack>
    </s-box>
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
            <s-stack direction="inline" gap="base">
              {rows.map((r) => (
                <ProductCard key={r.id} r={r} />
              ))}
            </s-stack>
          </s-stack>
        )}
      </s-section>
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
