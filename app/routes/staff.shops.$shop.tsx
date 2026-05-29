import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { useLoaderData, useFetcher, Link } from "react-router";
import { isAdmin, requireStaffAdmin, requireStaffUser } from "../lib/staff-auth.server";
import { staffDeliveryAction } from "../lib/staff-actions.server";
import prisma from "../db.server";

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const user = await requireStaffUser(request);
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

  const keys = (productId: string, status: string) =>
    keyCounts.find((k) => k.productId === productId && k.status === status)
      ?._count._all ?? 0;

  return {
    shop,
    canEdit: isAdmin(user),
    shopName: settings?.shopName ?? "—",
    products: products.map((p) => ({
      id: p.id,
      title: p.title,
      deliveryType: p.deliveryType,
      available: keys(p.id, "AVAILABLE"),
      assigned: keys(p.id, "ASSIGNED"),
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

export const action = async ({ request }: ActionFunctionArgs) => {
  await requireStaffAdmin(request);
  const form = await request.formData();
  return staffDeliveryAction(String(form.get("intent")), String(form.get("deliveryId")));
};

const STATUS: Record<string, [string, string]> = {
  DELIVERED: ["#e7f7ec", "#176b32"],
  PENDING: ["#fef6e7", "#b54708"],
  FAILED: ["#fdecec", "#b42318"],
};

export default function StaffShopDetail() {
  const { shop, shopName, products, deliveries, canEdit } =
    useLoaderData<typeof loader>();
  const fetcher = useFetcher<{ ok: boolean; message: string }>();

  return (
    <>
      <Link to="/staff" className="kxs-back">
        ← Zurück zur Übersicht
      </Link>
      <h1 className="kxs-h1" style={{ marginTop: 8 }}>
        {shopName}
        <span className="sub">{shop}</span>
      </h1>

      {fetcher.data?.message && (
        <div className={"kxs-banner " + (fetcher.data.ok ? "ok" : "err")}>
          {fetcher.data.message}
        </div>
      )}

      <div className="kxs-sec">Produkte ({products.length})</div>
      <div className="kxs-panel">
        {products.length === 0 ? (
          <div className="kxs-empty">Keine Produkte.</div>
        ) : (
          <table className="kxs-table">
            <thead>
              <tr>
                <th>Produkt</th>
                <th>Lieferart</th>
                <th>Schlüssel frei</th>
                <th>Zugewiesen</th>
                <th>Dateien</th>
                <th>Links</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id}>
                  <td>{p.title}</td>
                  <td>{p.deliveryType}</td>
                  <td>{p.available}</td>
                  <td>{p.assigned}</td>
                  <td>{p.files}</td>
                  <td>{p.links}</td>
                  <td>
                    <Link
                      className="kxs-link"
                      to={`/staff/shops/${encodeURIComponent(shop)}/products/${p.id}`}
                    >
                      Verwalten →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="kxs-sec">Letzte Lieferungen ({deliveries.length})</div>
      <div className="kxs-panel">
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
                {canEdit && <th>Aktionen</th>}
              </tr>
            </thead>
            <tbody>
              {deliveries.map((d) => {
                const [bg, fg] = STATUS[d.status] ?? ["#eef2f7", "#475569"];
                return (
                  <tr key={d.id}>
                    <td>{d.orderName}</td>
                    <td>{d.email}</td>
                    <td>{d.product}</td>
                    <td style={{ fontFamily: "monospace" }}>{d.key}</td>
                    <td>
                      <span className="kxs-pill" style={{ background: bg, color: fg }}>
                        {d.status}
                      </span>
                    </td>
                    <td style={{ whiteSpace: "nowrap" }}>{d.createdAt}</td>
                    {canEdit && (
                      <td>
                        <div style={{ display: "flex", gap: 6 }}>
                          <DeliveryButton fetcher={fetcher} id={d.id} intent="resend" label="Erneut" cls="sec" />
                          <DeliveryButton fetcher={fetcher} id={d.id} intent="revoke" label="Widerrufen" cls="danger" />
                          <DeliveryButton fetcher={fetcher} id={d.id} intent="delete" label="Löschen" cls="danger" />
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}

function DeliveryButton({
  fetcher,
  id,
  intent,
  label,
  cls,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  fetcher: any;
  id: string;
  intent: string;
  label: string;
  cls: string;
}) {
  return (
    <fetcher.Form method="post">
      <input type="hidden" name="intent" value={intent} />
      <input type="hidden" name="deliveryId" value={id} />
      <button type="submit" className={`kxs-btn mini ${cls}`}>
        {label}
      </button>
    </fetcher.Form>
  );
}
