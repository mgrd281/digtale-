import type { LoaderFunctionArgs } from "react-router";
import { useLoaderData, Link } from "react-router";
import { requireStaffUser } from "../lib/staff-auth.server";
import prisma from "../db.server";

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  await requireStaffUser(request);
  const shop = decodeURIComponent(params.shop ?? "");

  const [settings, products, keyCounts, deliveries] = await Promise.all([
    prisma.appSettings.findUnique({ where: { shop } }),
    prisma.product.findMany({
      where: { shop },
      orderBy: { title: "asc" },
      include: { _count: { select: { files: true, links: true } } },
    }),
    prisma.licenseKey.groupBy({
      by: ["productId", "status"],
      where: { product: { shop } },
      _count: { _all: true },
    }),
    prisma.delivery.findMany({
      where: { shop },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        product: { select: { title: true } },
        licenseKey: { select: { keyValue: true } },
      },
    }),
  ]);

  const availableKeys = (productId: string) =>
    keyCounts.find((k) => k.productId === productId && k.status === "AVAILABLE")
      ?._count._all ?? 0;

  return {
    shop,
    shopName: settings?.shopName ?? "—",
    products: products.map((p) => ({
      id: p.id,
      title: p.title,
      deliveryType: p.deliveryType,
      keys: availableKeys(p.id),
      files: p._count.files,
      links: p._count.links,
    })),
    deliveries: deliveries.map((d) => ({
      id: d.id,
      orderName: d.shopifyOrderName,
      email: d.customerEmail,
      product: d.product.title,
      key: d.licenseKey?.keyValue ?? "—",
      status: d.status,
      createdAt: d.createdAt.toISOString().slice(0, 16).replace("T", " "),
    })),
  };
};

const STATUS_COLOR: Record<string, [string, string]> = {
  DELIVERED: ["#e7f7ec", "#1a7f37"],
  PENDING: ["#fef6e7", "#b54708"],
  FAILED: ["#fde8e8", "#b42318"],
};

export default function StaffShopDetail() {
  const { shop, shopName, products, deliveries } =
    useLoaderData<typeof loader>();
  return (
    <>
      <Link to="/staff" className="kxs-back">
        ← Zurück zur Übersicht
      </Link>
      <h1 className="kxs-h1" style={{ marginTop: 8 }}>
        {shopName}{" "}
        <span style={{ fontSize: 14, color: "#6b7280", fontWeight: 500 }}>
          {shop}
        </span>
      </h1>

      <div className="kxs-sec">Produkte ({products.length})</div>
      {products.length === 0 ? (
        <div className="kxs-empty">Keine Produkte.</div>
      ) : (
        <table className="kxs-table" style={{ marginBottom: 26 }}>
          <thead>
            <tr>
              <th>Produkt</th>
              <th>Lieferart</th>
              <th>Schlüssel verfügbar</th>
              <th>Dateien</th>
              <th>Links</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id}>
                <td>{p.title}</td>
                <td>{p.deliveryType}</td>
                <td>{p.keys}</td>
                <td>{p.files}</td>
                <td>{p.links}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div className="kxs-sec">Letzte Lieferungen ({deliveries.length})</div>
      {deliveries.length === 0 ? (
        <div className="kxs-empty">Keine Lieferungen.</div>
      ) : (
        <table className="kxs-table">
          <thead>
            <tr>
              <th>Bestellung</th>
              <th>Kunde</th>
              <th>Produkt</th>
              <th>Schlüssel</th>
              <th>Status</th>
              <th>Datum</th>
            </tr>
          </thead>
          <tbody>
            {deliveries.map((d) => {
              const [bg, fg] = STATUS_COLOR[d.status] ?? ["#eef2f7", "#475569"];
              return (
                <tr key={d.id}>
                  <td>{d.orderName}</td>
                  <td>{d.email}</td>
                  <td>{d.product}</td>
                  <td style={{ fontFamily: "monospace" }}>{d.key}</td>
                  <td>
                    <span
                      className="kxs-pill"
                      style={{ background: bg, color: fg }}
                    >
                      {d.status}
                    </span>
                  </td>
                  <td>{d.createdAt}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </>
  );
}
