import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { useLoaderData, useFetcher, Form, Link } from "react-router";
import { isAdmin, requireStaffAdmin, requireStaffUser } from "../lib/staff-auth.server";
import { staffDeliveryAction } from "../lib/staff-actions.server";
import prisma from "../db.server";
import type { DeliveryStatus, Prisma } from "@prisma/client";

const STATUSES: DeliveryStatus[] = ["PENDING", "DELIVERED", "FAILED"];

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const user = await requireStaffUser(request);
  const url = new URL(request.url);
  const q = url.searchParams.get("q")?.trim() ?? "";
  const status = url.searchParams.get("status") ?? "";

  const where: Prisma.DeliveryWhereInput = {};
  if (status && STATUSES.includes(status as DeliveryStatus)) {
    where.status = status as DeliveryStatus;
  }
  if (q) {
    where.OR = [
      { shopifyOrderName: { contains: q, mode: "insensitive" } },
      { customerEmail: { contains: q, mode: "insensitive" } },
      { shop: { contains: q, mode: "insensitive" } },
    ];
  }

  const deliveries = await prisma.delivery.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 150,
    include: {
      product: { select: { title: true } },
      licenseKey: { select: { keyValue: true } },
    },
  });

  return {
    q,
    status,
    canEdit: isAdmin(user),
    deliveries: deliveries.map((d) => ({
      id: d.id,
      shop: d.shop,
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

export default function StaffOrders() {
  const { deliveries, q, status, canEdit } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<{ ok: boolean; message: string }>();

  return (
    <>
      <h1 className="kxs-h1">
        Bestellungen<span className="sub">alle Shops</span>
      </h1>

      {fetcher.data?.message && (
        <div className={"kxs-banner " + (fetcher.data.ok ? "ok" : "err")}>
          {fetcher.data.message}
        </div>
      )}

      <Form method="get" className="kxs-toolbar">
        <input
          className="kxs-input"
          name="q"
          defaultValue={q}
          placeholder="Suche: Bestellung, E-Mail oder Shop"
          style={{ maxWidth: 320 }}
        />
        <select className="kxs-select" name="status" defaultValue={status} style={{ maxWidth: 200 }}>
          <option value="">Alle Status</option>
          <option value="DELIVERED">Ausgeliefert</option>
          <option value="PENDING">In Bearbeitung</option>
          <option value="FAILED">Fehlgeschlagen</option>
        </select>
        <button type="submit" className="kxs-btn sec">Filtern</button>
      </Form>

      <div className="kxs-sec">Ergebnisse ({deliveries.length})</div>
      <div className="kxs-panel">
        {deliveries.length === 0 ? (
          <div className="kxs-empty">Keine Lieferungen gefunden.</div>
        ) : (
          <table className="kxs-table">
            <thead>
              <tr>
                <th>Shop</th>
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
                    <td>
                      <Link className="kxs-link" to={`/staff/shops/${encodeURIComponent(d.shop)}`}>
                        {d.shop}
                      </Link>
                    </td>
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
                          {["resend", "revoke", "delete"].map((intent) => (
                            <fetcher.Form method="post" key={intent}>
                              <input type="hidden" name="intent" value={intent} />
                              <input type="hidden" name="deliveryId" value={d.id} />
                              <button
                                type="submit"
                                className={"kxs-btn mini " + (intent === "resend" ? "sec" : "danger")}
                              >
                                {intent === "resend" ? "Erneut" : intent === "revoke" ? "Widerrufen" : "Löschen"}
                              </button>
                            </fetcher.Form>
                          ))}
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
