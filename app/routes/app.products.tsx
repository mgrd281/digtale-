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

  const rows = products.map((p) => {
    const available =
      counts.find((c) => c.productId === p.id && c.status === "AVAILABLE")
        ?._count._all ?? 0;
    const assigned =
      counts.find((c) => c.productId === p.id && c.status === "ASSIGNED")
        ?._count._all ?? 0;
    const files =
      fileCounts.find((c) => c.productId === p.id)?._count._all ?? 0;
    return {
      id: p.id,
      title: p.title,
      deliveryType: p.deliveryType,
      available,
      assigned,
      files,
    };
  });

  return { rows };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin } = await authenticate.admin(request);

  // Sync the first 250 products from Shopify into the local catalog.
  const response = await admin.graphql(
    `#graphql
    query SyncProducts {
      products(first: 250, sortKey: TITLE) {
        edges { node { id title } }
      }
    }`,
  );
  const json = await response.json();
  const edges = json.data?.products?.edges ?? [];

  let synced = 0;
  for (const edge of edges) {
    const node = edge.node;
    await prisma.product.upsert({
      where: { shopifyProductId: numericId(node.id) },
      update: { title: node.title },
      create: { shopifyProductId: numericId(node.id), title: node.title },
    });
    synced += 1;
  }

  return { synced };
};

export default function Products() {
  const { rows } = useLoaderData<typeof loader>();
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
          <s-paragraph>
            Noch keine Produkte. Klicken Sie auf „Mit Shopify synchronisieren“.
          </s-paragraph>
        ) : (
          <s-table>
            <s-table-header-row>
              <s-table-header>Produkt</s-table-header>
              <s-table-header>Lieferart</s-table-header>
              <s-table-header>Verfügbar</s-table-header>
              <s-table-header>Zugewiesen</s-table-header>
              <s-table-header>Dateien</s-table-header>
            </s-table-header-row>
            <s-table-body>
              {rows.map((r) => {
                const low =
                  (r.deliveryType === "KEY" || r.deliveryType === "BOTH") &&
                  r.available < LOW_STOCK_THRESHOLD;
                return (
                  <s-table-row key={r.id}>
                    <s-table-cell>
                      <s-link href={`/app/products/${r.id}`}>{r.title}</s-link>
                    </s-table-cell>
                    <s-table-cell>
                      <s-badge>{r.deliveryType}</s-badge>
                    </s-table-cell>
                    <s-table-cell>
                      <s-badge tone={low ? "warning" : "success"}>
                        {String(r.available)}
                      </s-badge>
                    </s-table-cell>
                    <s-table-cell>{String(r.assigned)}</s-table-cell>
                    <s-table-cell>{String(r.files)}</s-table-cell>
                  </s-table-row>
                );
              })}
            </s-table-body>
          </s-table>
        )}
      </s-section>
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
