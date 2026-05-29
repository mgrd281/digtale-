import type {
  ActionFunctionArgs,
  HeadersFunction,
  LoaderFunctionArgs,
} from "react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLoaderData, useFetcher, Link } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";
import { numericId } from "../lib/shared";
import { getSettings } from "../lib/settings.server";
import { t } from "../lib/i18n";

function categoryOf(
  title: string,
  productType: string | null,
  locale: string,
): string {
  const hay = `${title} ${productType ?? ""}`.toLowerCase();
  if (hay.includes("mac")) return "Mac";
  if (
    hay.includes("office") ||
    hay.includes("365") ||
    hay.includes("visio") ||
    hay.includes("project") ||
    hay.includes("access")
  )
    return "Microsoft Office";
  if (hay.includes("windows")) return "Windows";
  return t(locale, "products.catOther");
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);
  const settings = await getSettings();

  const products = await prisma.product.findMany({ orderBy: { title: "asc" } });

  const keyCounts = await prisma.licenseKey.groupBy({
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

  const since = new Date(Date.now() - 30 * 24 * 3600_000);
  const sales = await prisma.delivery.groupBy({
    by: ["productId"],
    where: { status: "DELIVERED", createdAt: { gte: since } },
    _count: { _all: true },
  });

  const rows = products.map((p) => {
    const available =
      keyCounts.find((c) => c.productId === p.id && c.status === "AVAILABLE")
        ?._count._all ?? 0;
    const files = fileCounts.find((c) => c.productId === p.id)?._count._all ?? 0;
    const links = linkCounts.find((c) => c.productId === p.id)?._count._all ?? 0;
    const sales30 = sales.find((c) => c.productId === p.id)?._count._all ?? 0;
    const needsKey = p.deliveryType === "KEY" || p.deliveryType === "BOTH";
    const ready =
      (needsKey ? available > 0 : true) &&
      (available > 0 || files > 0 || links > 0);
    return {
      id: p.id,
      title: p.title,
      imageUrl: p.imageUrl,
      shopifyProductId: p.shopifyProductId,
      category: categoryOf(p.title, p.productType, settings.adminLocale),
      needsKey,
      available,
      files,
      links,
      sales30,
      ready,
    };
  });

  return { rows, locale: settings.adminLocale };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin } = await authenticate.admin(request);

  const response = await admin.graphql(
    `#graphql
    query SyncProducts {
      products(first: 250, sortKey: TITLE) {
        edges {
          node {
            id
            title
            productType
            vendor
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
      update: {
        title: node.title,
        imageUrl,
        productType: node.productType || null,
        vendor: node.vendor || null,
      },
      create: {
        shopifyProductId: numericId(node.id),
        title: node.title,
        imageUrl,
        productType: node.productType || null,
        vendor: node.vendor || null,
      },
    });
    synced += 1;
  }

  return { synced };
};

type Row = {
  id: string;
  title: string;
  imageUrl: string | null;
  shopifyProductId: string;
  category: string;
  needsKey: boolean;
  available: number;
  files: number;
  links: number;
  sales30: number;
  ready: boolean;
};

const CATALOG_CSS = `
  .kx-toolbar { margin: 6px 0 12px; max-width: 440px; }
  .kx-sec-head { display: flex; align-items: center; gap: 8px; font-size: 15px; font-weight: 750; color: #111827; margin: 24px 0 4px; }
  .kx-sec-count { font-size: 12px; font-weight: 700; color: #475569; background: #eef2f7; padding: 2px 9px; border-radius: 999px; }
  .kx-cat-head { display: flex; align-items: center; gap: 8px; font-weight: 700; font-size: 13.5px; color: #334155; margin: 16px 0 10px; }
  .kx-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 14px; }
  .kx-card {
    display: flex; flex-direction: column; background: #fff; border: 1px solid #e5e7eb;
    border-radius: 16px; padding: 16px; text-decoration: none; color: inherit;
  }
  .kx-card-top { display: flex; gap: 12px; align-items: flex-start; }
  .kx-card-img {
    width: 52px; height: 52px; flex: 0 0 auto; border-radius: 10px; background: #f6f8fb;
    border: 1px solid #eceff2; object-fit: contain; padding: 4px; box-sizing: border-box;
    display: flex; align-items: center; justify-content: center; font-size: 9px; color: #b6bdc7;
  }
  .kx-card-title { font-weight: 650; font-size: 13.5px; line-height: 1.3; color: #111827;
    display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
  .kx-card-id { font-size: 11px; color: #9aa3af; margin-top: 3px; }
  .kx-card-foot { display: flex; align-items: center; justify-content: space-between; margin-top: 14px; gap: 8px; }
  .kx-keys { font-size: 12px; font-weight: 600; padding: 4px 10px; border-radius: 999px; white-space: nowrap; }
  .kx-manage { background: #1f48ff; color: #fff; font-weight: 600; font-size: 12.5px; padding: 8px 14px; border-radius: 9px; white-space: nowrap; }
  .kx-sold { font-size: 12px; color: #6b7280; margin-top: 12px; border-top: 1px solid #f1f3f5;
    padding-top: 10px; display: flex; justify-content: space-between; }
  .kx-sold b { color: #111827; }
  .kx-empty { color: #6b7280; font-size: 13px; padding: 10px 0; }
`;

function Card({ r, locale }: { r: Row; locale: string }) {
  return (
    <Link className="kx-card" to={`/app/products/${r.id}`}>
      <div className="kx-card-top">
        {r.imageUrl ? (
          <img className="kx-card-img" src={r.imageUrl} alt="" loading="lazy" />
        ) : (
          <span className="kx-card-img">{t(locale, "detail.noImage")}</span>
        )}
        <div style={{ minWidth: 0 }}>
          <div className="kx-card-title">{r.title}</div>
          <div className="kx-card-id">ID: {r.shopifyProductId}</div>
        </div>
      </div>
      <div className="kx-card-foot">
        {r.needsKey ? (
          <span
            className="kx-keys"
            style={
              r.available > 0
                ? { background: "#e7f7ec", color: "#1a7f37" }
                : { background: "#fde8e8", color: "#b42318" }
            }
          >
            {r.available} {t(locale, "products.keysAvailable")}
          </span>
        ) : (
          <span className="kx-keys" style={{ background: "#eef2ff", color: "#3538cd" }}>
            {r.links + r.files} {t(locale, "products.downloads")}
          </span>
        )}
        <span className="kx-manage">{t(locale, "products.manage")} →</span>
      </div>
      <div className="kx-sold">
        <span>{t(locale, "products.sold30")}</span>
        <b>{r.sales30}</b>
      </div>
    </Link>
  );
}

function groupByCategory(rows: Row[], locale: string): [string, Row[]][] {
  const order = ["Windows", "Microsoft Office", "Mac", t(locale, "products.catOther")];
  const map = new Map<string, Row[]>();
  for (const r of rows) {
    if (!map.has(r.category)) map.set(r.category, []);
    map.get(r.category)!.push(r);
  }
  return [...map.entries()].sort(
    (a, b) => order.indexOf(a[0]) - order.indexOf(b[0]),
  );
}

export default function Products() {
  const { rows, locale } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();
  const syncing = fetcher.state !== "idle";
  const [q, setQ] = useState("");

  // Native Polaris search field; read its value via DOM events for instant
  // client-side filtering.
  const searchRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = searchRef.current;
    if (!el) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const onInput = (e: any) => setQ(String(e?.target?.value ?? ""));
    el.addEventListener("input", onInput);
    el.addEventListener("change", onInput);
    return () => {
      el.removeEventListener("input", onInput);
      el.removeEventListener("change", onInput);
    };
  }, []);

  const { activeGroups, inactiveGroups, activeCount, inactiveCount } =
    useMemo(() => {
      const term = q.trim().toLowerCase();
      const filtered = term
        ? rows.filter((r) => r.title.toLowerCase().includes(term))
        : rows;
      const active = filtered.filter((r) => r.ready);
      const inactive = filtered.filter((r) => !r.ready);
      return {
        activeGroups: groupByCategory(active, locale),
        inactiveGroups: groupByCategory(inactive, locale),
        activeCount: active.length,
        inactiveCount: inactive.length,
      };
    }, [rows, q, locale]);

  return (
    <s-page heading={t(locale, "products.title")}>
      <s-button
        slot="primary-action"
        onClick={() => fetcher.submit({}, { method: "POST" })}
        {...(syncing ? { loading: true } : {})}
      >
        {t(locale, "products.sync")}
      </s-button>

      {fetcher.data?.synced !== undefined && (
        <s-banner tone="success">
          <s-paragraph>
            {fetcher.data.synced} {t(locale, "products.synced")}
          </s-paragraph>
        </s-banner>
      )}

      <s-section heading={t(locale, "products.catalog")}>
        <style>{CATALOG_CSS}</style>

        {rows.length === 0 ? (
          <s-stack direction="block" gap="base">
            <s-paragraph>{t(locale, "products.emptyState")}</s-paragraph>
            <s-button
              variant="primary"
              onClick={() => fetcher.submit({}, { method: "POST" })}
              {...(syncing ? { loading: true } : {})}
            >
              {t(locale, "products.sync")}
            </s-button>
          </s-stack>
        ) : (
          <>
            <div className="kx-toolbar">
              <s-search-field
                ref={searchRef}
                label={t(locale, "products.search")}
                placeholder={t(locale, "products.search")}
              />
            </div>

            <div className="kx-sec-head">
              ⚡ {t(locale, "products.active")}{" "}
              <span className="kx-sec-count">{activeCount}</span>
            </div>
            {activeCount === 0 ? (
              <div className="kx-empty">—</div>
            ) : (
              activeGroups.map(([cat, items]) => (
                <div key={cat}>
                  <div className="kx-cat-head">
                    {cat}
                    <span className="kx-sec-count">{items.length}</span>
                  </div>
                  <div className="kx-grid">
                    {items.map((r) => (
                      <Card key={r.id} r={r} locale={locale} />
                    ))}
                  </div>
                </div>
              ))
            )}

            {inactiveCount > 0 && (
              <>
                <div className="kx-sec-head">
                  📦 {t(locale, "products.notActivated")}{" "}
                  <span className="kx-sec-count">{inactiveCount}</span>
                </div>
                {inactiveGroups.map(([cat, items]) => (
                  <div key={cat}>
                    <div className="kx-cat-head">
                      {cat}
                      <span className="kx-sec-count">{items.length}</span>
                    </div>
                    <div className="kx-grid">
                      {items.map((r) => (
                        <Card key={r.id} r={r} locale={locale} />
                      ))}
                    </div>
                  </div>
                ))}
              </>
            )}
          </>
        )}
      </s-section>
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
