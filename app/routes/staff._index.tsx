import type { LoaderFunctionArgs } from "react-router";
import { useLoaderData, Link } from "react-router";
import { requireStaffUser } from "../lib/staff-auth.server";
import prisma from "../db.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await requireStaffUser(request);

  const [sessions, settings, productsByShop, deliveriesByShop] =
    await Promise.all([
      prisma.session.findMany({ distinct: ["shop"], select: { shop: true } }),
      prisma.appSettings.findMany({ select: { shop: true, shopName: true } }),
      prisma.product.groupBy({ by: ["shop"], _count: { _all: true } }),
      prisma.delivery.groupBy({
        by: ["shop", "status"],
        _count: { _all: true },
      }),
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
  };
};

export default function StaffDashboard() {
  const { totals, shops } = useLoaderData<typeof loader>();
  return (
    <>
      <h1 className="kxs-h1">Übersicht – alle Shops</h1>

      <div className="kxs-cards">
        <Stat label="Shops" value={totals.shops} color="#0b3d2e" />
        <Stat label="Produkte" value={totals.products} color="#3538cd" />
        <Stat label="Ausgeliefert" value={totals.delivered} color="#1a7f37" />
        <Stat label="In Bearbeitung" value={totals.pending} color="#b54708" />
        <Stat label="Fehlgeschlagen" value={totals.failed} color="#b42318" />
      </div>

      <div className="kxs-sec">Installierte Shops</div>
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
