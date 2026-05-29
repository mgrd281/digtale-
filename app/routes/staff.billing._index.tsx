import type { LoaderFunctionArgs } from "react-router";
import { useLoaderData } from "react-router";
import { requireStaffUser } from "../lib/staff-auth.server";
import { getShopBilling } from "../lib/staff-billing.server";
import prisma from "../db.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await requireStaffUser(request);

  // Installed shops = distinct shops with a stored session.
  const sessions = await prisma.session.findMany({
    distinct: ["shop"],
    select: { shop: true },
  });
  const shops = [...new Set(sessions.map((s) => s.shop))].sort();

  // Query each shop's Shopify Billing state (best-effort, in parallel).
  const billing = await Promise.all(shops.map((shop) => getShopBilling(shop)));

  const currency = billing.find((b) => b.monthly > 0)?.currency ?? "USD";
  const mrr = billing.reduce(
    (acc, b) => acc + (b.state === "active" ? b.monthly : 0),
    0,
  );
  const activeCount = billing.filter((b) => b.state === "active").length;
  const trialCount = billing.filter((b) => b.state === "trial").length;

  return {
    rows: billing,
    totals: {
      shops: shops.length,
      active: activeCount,
      trial: trialCount,
      mrr: Math.round(mrr * 100) / 100,
      currency,
    },
  };
};

const STATE: Record<string, [string, string, string]> = {
  active: ["#e7f7ec", "#176b32", "Aktiv"],
  trial: ["#fef6e7", "#b54708", "Testphase"],
  none: ["#eef2f1", "#475569", "Kein Abo"],
  unknown: ["#f1f4f3", "#94a3b8", "Unbekannt"],
};

function money(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat("de-DE", {
      style: "currency",
      currency,
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

export default function StaffBilling() {
  const { rows, totals } = useLoaderData<typeof loader>();
  return (
    <>
      <h1 className="kxs-h1">
        Zahlungen<span className="sub">Abos & Einnahmen</span>
      </h1>

      <div className="kxs-cards">
        <Card label="Shops" value={String(totals.shops)} color="#0b3d2e" />
        <Card label="Aktive Abos" value={String(totals.active)} color="#176b32" />
        <Card label="In Testphase" value={String(totals.trial)} color="#b54708" />
        <Card
          label="Geschätztes MRR"
          value={money(totals.mrr, totals.currency)}
          color="#1f48ff"
        />
      </div>

      <div className="kxs-sec">Abo-Status je Shop</div>
      <div className="kxs-panel">
        {rows.length === 0 ? (
          <div className="kxs-empty">Noch keine Shops installiert.</div>
        ) : (
          <table className="kxs-table">
            <thead>
              <tr>
                <th>Shop</th>
                <th>Plan</th>
                <th>Status</th>
                <th>Testphase bis</th>
                <th>Monatlich</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const [bg, fg, label] = STATE[r.state] ?? STATE.unknown;
                return (
                  <tr key={r.shop}>
                    <td>{r.shop}</td>
                    <td>{r.planName ?? "—"}</td>
                    <td>
                      <span className="kxs-pill" style={{ background: bg, color: fg }}>
                        {label}
                      </span>
                    </td>
                    <td>{r.trialEndsAt ?? "—"}</td>
                    <td>
                      {r.monthly > 0 ? money(r.monthly, r.currency) : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <p className="kxs-ro" style={{ marginTop: 4 }}>
        MRR ist eine Schätzung aus den aktiven Abos (Jahrespläne /12). Abos
        erscheinen, sobald die Abrechnung aktiviert ist (BILLING_ENABLED=true).
      </p>
    </>
  );
}

function Card({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
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
