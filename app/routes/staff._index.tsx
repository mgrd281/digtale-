import type { LoaderFunctionArgs } from "react-router";
import { useLoaderData, Link } from "react-router";
import { requireStaffUser } from "../lib/staff-auth.server";
import { deliveriesByDay, topProducts } from "../lib/staff-analytics.server";
import prisma from "../db.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await requireStaffUser(request);

  const [sessions, settings, productsByShop, deliveriesByShop, trend, top] =
    await Promise.all([
      prisma.session.findMany({ distinct: ["shop"], select: { shop: true } }),
      prisma.appSettings.findMany({ select: { shop: true, shopName: true } }),
      prisma.product.groupBy({ by: ["shop"], _count: { _all: true } }),
      prisma.delivery.groupBy({
        by: ["shop", "status"],
        _count: { _all: true },
      }),
      deliveriesByDay(30),
      topProducts(8),
    ]);

  // Build the shop registry from every shop we have a trace of.
  const shopSet = new Set<string>();
  sessions.forEach((s) => shopSet.add(s.shop));
  settings.forEach((s) => shopSet.add(s.shop));
  productsByShop.forEach((p) => shopSet.add(p.shop));
  deliveriesByShop.forEach((d) => shopSet.add(d.shop));

  const nameByShop = new Map(settings.map((s) => [s.shop, s.shopName]));
  const productCount = (shop: string) =>
    productsByShop.find((p) => p.shop === shop)?._count._all ?? 0;
  const delivCount = (shop: string, status: string) =>
    deliveriesByShop.find((d) => d.shop === shop && d.status === status)?._count
      ._all ?? 0;

  const shops = [...shopSet].sort().map((shop) => ({
    shop,
    name: nameByShop.get(shop) ?? "—",
    products: productCount(shop),
    delivered: delivCount(shop, "DELIVERED"),
    pending: delivCount(shop, "PENDING"),
    failed: delivCount(shop, "FAILED"),
  }));

  const sum = (k: "products" | "delivered" | "pending" | "failed") =>
    shops.reduce((acc, s) => acc + s[k], 0);

  return {
    totals: {
      shops: shops.length,
      products: sum("products"),
      delivered: sum("delivered"),
      pending: sum("pending"),
      failed: sum("failed"),
    },
    shops,
    trend,
    top,
  };
};

const CHART_CSS = `
  .kxs-charts { display: grid; grid-template-columns: 1.5fr 1fr; gap: 18px; margin-bottom: 26px; }
  @media (max-width: 860px){ .kxs-charts { grid-template-columns: 1fr; } }
  .kxs-chart { background:#fff; border:1px solid #e3e8e6; border-radius:16px; padding:18px; box-shadow:0 1px 2px rgba(16,24,40,.04); }
  .kxs-chart h3 { font-size:14px; margin:0 0 14px; font-weight:700; }
  .kxs-bars { display:flex; align-items:flex-end; gap:3px; height:150px; }
  .kxs-bars .b { flex:1; background:linear-gradient(180deg,#1a7f37,#0b3d2e); border-radius:3px 3px 0 0; min-height:2px; }
  .kxs-bars .b:hover { opacity:.8; }
  .kxs-xaxis { display:flex; justify-content:space-between; font-size:11px; color:#94a3b8; margin-top:8px; }
  .kxs-top .row { display:flex; align-items:center; gap:10px; margin-bottom:10px; }
  .kxs-top .nm { font-size:13px; width:42%; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  .kxs-top .track { flex:1; background:#eef2f1; border-radius:6px; height:14px; overflow:hidden; }
  .kxs-top .fill { height:100%; background:#3538cd; border-radius:6px; }
  .kxs-top .ct { font-size:12px; font-weight:700; color:#334155; width:30px; text-align:right; }
`;

function TrendChart({ data }: { data: { date: string; count: number }[] }) {
  const max = Math.max(1, ...data.map((d) => d.count));
  const first = data[0]?.date.slice(5) ?? "";
  const last = data[data.length - 1]?.date.slice(5) ?? "";
  const total = data.reduce((a, d) => a + d.count, 0);
  return (
    <div className="kxs-chart">
      <h3>Lieferungen – letzte 30 Tage ({total})</h3>
      <div className="kxs-bars">
        {data.map((d) => (
          <div
            key={d.date}
            className="b"
            style={{ height: `${(d.count / max) * 100}%` }}
            title={`${d.date}: ${d.count}`}
          />
        ))}
      </div>
      <div className="kxs-xaxis">
        <span>{first}</span>
        <span>{last}</span>
      </div>
    </div>
  );
}

function TopProducts({ data }: { data: { title: string; count: number }[] }) {
  const max = Math.max(1, ...data.map((d) => d.count));
  return (
    <div className="kxs-chart kxs-top">
      <h3>Top-Produkte</h3>
      {data.length === 0 ? (
        <div style={{ fontSize: 13, color: "#94a3b8" }}>Noch keine Daten.</div>
      ) : (
        data.map((d) => (
          <div className="row" key={d.title}>
            <div className="nm" title={d.title}>
              {d.title}
            </div>
            <div className="track">
              <div className="fill" style={{ width: `${(d.count / max) * 100}%` }} />
            </div>
            <div className="ct">{d.count}</div>
          </div>
        ))
      )}
    </div>
  );
}

export default function StaffDashboard() {
  const { totals, shops, trend, top } = useLoaderData<typeof loader>();
  return (
    <>
      <style>{CHART_CSS}</style>
      <h1 className="kxs-h1">Übersicht – alle Shops</h1>

      <div className="kxs-cards">
        <Stat label="Shops" value={totals.shops} color="#0b3d2e" />
        <Stat label="Produkte" value={totals.products} color="#3538cd" />
        <Stat label="Ausgeliefert" value={totals.delivered} color="#1a7f37" />
        <Stat label="In Bearbeitung" value={totals.pending} color="#b54708" />
        <Stat label="Fehlgeschlagen" value={totals.failed} color="#b42318" />
      </div>

      <div className="kxs-charts">
        <TrendChart data={trend} />
        <TopProducts data={top} />
      </div>

      <div className="kxs-sec">Installierte Shops</div>
      <div className="kxs-panel">
      {shops.length === 0 ? (
        <div className="kxs-empty">Noch keine Shops installiert.</div>
      ) : (
        <table className="kxs-table">
          <thead>
            <tr>
              <th>Shop</th>
              <th>Name</th>
              <th>Produkte</th>
              <th>Ausgeliefert</th>
              <th>Offen</th>
              <th>Fehler</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {shops.map((s) => (
              <tr key={s.shop}>
                <td>{s.shop}</td>
                <td>{s.name}</td>
                <td>{s.products}</td>
                <td>{s.delivered}</td>
                <td>{s.pending}</td>
                <td>{s.failed}</td>
                <td>
                  <Link
                    className="kxs-link"
                    to={`/staff/shops/${encodeURIComponent(s.shop)}`}
                  >
                    Öffnen →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      </div>
    </>
  );
}

function Stat({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="kxs-card">
      <div className="l">{label}</div>
      <div className="v" style={{ color }}>
        {value}
      </div>
    </div>
  );
}
