import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { useLoaderData, useFetcher, data } from "react-router";
import { isAdmin, requireStaffAdmin, requireStaffUser } from "../lib/staff-auth.server";
import { getShopBilling } from "../lib/staff-billing.server";
import { PRO_PLAN_PRICE, PRO_PLAN_CURRENCY } from "../lib/billing.server";
import { updateSettings } from "../lib/settings.server";
import prisma from "../db.server";

const PLANS = ["DEFAULT", "FREE", "PAID"] as const;

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const user = await requireStaffUser(request);

  const [sessions, settings] = await Promise.all([
    prisma.session.findMany({ distinct: ["shop"], select: { shop: true } }),
    prisma.appSettings.findMany({ select: { shop: true, shopName: true, plan: true } }),
  ]);

  const shopSet = new Set<string>();
  sessions.forEach((s) => shopSet.add(s.shop));
  settings.forEach((s) => shopSet.add(s.shop));
  const shops = [...shopSet].sort();
  const metaByShop = new Map(settings.map((s) => [s.shop, s]));

  // Shopify subscription state (informational; only matters for DEFAULT shops).
  const shopify = await Promise.all(shops.map((shop) => getShopBilling(shop)));
  const shopifyByShop = new Map(shopify.map((b) => [b.shop, b]));

  const rows = shops.map((shop) => {
    const plan = metaByShop.get(shop)?.plan ?? "DEFAULT";
    const sub = shopifyByShop.get(shop);
    // Monthly revenue: PAID = fixed plan price; DEFAULT follows the live
    // Shopify subscription; FREE = 0.
    let monthly = 0;
    if (plan === "PAID") monthly = PRO_PLAN_PRICE;
    else if (plan === "DEFAULT" && sub?.state === "active") monthly = sub.monthly;
    return {
      shop,
      name: metaByShop.get(shop)?.shopName ?? "—",
      plan,
      shopifyState: sub?.state ?? "unknown",
      monthly,
    };
  });

  const mrr = rows.reduce((a, r) => a + r.monthly, 0);

  return {
    canEdit: isAdmin(user),
    currency: PRO_PLAN_CURRENCY,
    rows,
    totals: {
      shops: shops.length,
      paid: rows.filter((r) => r.plan === "PAID").length,
      free: rows.filter((r) => r.plan === "FREE").length,
      mrr: Math.round(mrr * 100) / 100,
    },
  };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  await requireStaffAdmin(request);
  const form = await request.formData();
  const shop = String(form.get("shop") ?? "");
  const plan = String(form.get("plan") ?? "DEFAULT");
  if (!shop || !PLANS.includes(plan as (typeof PLANS)[number])) {
    return data({ ok: false, message: "Ungültige Eingabe." });
  }
  await updateSettings(shop, { plan });
  return data({ ok: true, message: `Plan für ${shop} auf ${plan} gesetzt.` });
};

const PLAN_PILL: Record<string, [string, string, string]> = {
  PAID: ["#e7f7ec", "#176b32", "Bezahlt"],
  FREE: ["#e7eefe", "#1f48ff", "Kostenlos (dauerhaft)"],
  DEFAULT: ["#eef2f1", "#475569", "Standard (Shopify)"],
};

const SHOPIFY_LABEL: Record<string, string> = {
  active: "Abo aktiv",
  trial: "Testphase",
  none: "kein Abo",
  unknown: "—",
};

function money(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat("de-DE", { style: "currency", currency }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

export default function StaffBilling() {
  const { rows, totals, currency, canEdit } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<{ ok: boolean; message: string }>();

  return (
    <>
      <h1 className="kxs-h1">
        Zahlungen<span className="sub">Pläne & Einnahmen</span>
      </h1>

      {fetcher.data?.message && (
        <div className={"kxs-banner " + (fetcher.data.ok ? "ok" : "err")}>
          {fetcher.data.message}
        </div>
      )}

      <div className="kxs-cards">
        <Card label="Shops" value={String(totals.shops)} color="#0b3d2e" />
        <Card label="Bezahlt" value={String(totals.paid)} color="#176b32" />
        <Card label="Kostenlos" value={String(totals.free)} color="#1f48ff" />
        <Card label="Geschätztes MRR" value={money(totals.mrr, currency)} color="#b54708" />
      </div>

      <div className="kxs-sec">Plan je Shop</div>
      <div className="kxs-panel">
        {rows.length === 0 ? (
          <div className="kxs-empty">Noch keine Shops installiert.</div>
        ) : (
          <table className="kxs-table">
            <thead>
              <tr>
                <th>Shop</th>
                <th>Name</th>
                <th>Plan</th>
                <th>Shopify-Abo</th>
                <th>Monatlich</th>
                {canEdit && <th>Plan ändern</th>}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const [bg, fg, label] = PLAN_PILL[r.plan] ?? PLAN_PILL.DEFAULT;
                return (
                  <tr key={r.shop}>
                    <td>{r.shop}</td>
                    <td>{r.name}</td>
                    <td>
                      <span className="kxs-pill" style={{ background: bg, color: fg }}>
                        {label}
                      </span>
                    </td>
                    <td className="kxs-ro">{SHOPIFY_LABEL[r.shopifyState] ?? "—"}</td>
                    <td>{r.monthly > 0 ? money(r.monthly, currency) : "—"}</td>
                    {canEdit && (
                      <td>
                        <fetcher.Form method="post">
                          <input type="hidden" name="shop" value={r.shop} />
                          <select
                            className="kxs-select"
                            name="plan"
                            defaultValue={r.plan}
                            style={{ maxWidth: 200 }}
                            onChange={(e) => fetcher.submit(e.currentTarget.form)}
                          >
                            <option value="DEFAULT">Standard (Shopify)</option>
                            <option value="PAID">Bezahlt</option>
                            <option value="FREE">Kostenlos (dauerhaft)</option>
                          </select>
                        </fetcher.Form>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <p className="kxs-ro" style={{ marginTop: 4 }}>
        „Kostenlos" = nie zur Zahlung aufgefordert. „Bezahlt" = zählt als
        zahlender Kunde (MRR). „Standard" = folgt der Shopify-Abrechnung
        (aktiv, sobald BILLING_ENABLED=true).
      </p>
    </>
  );
}

function Card({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="kxs-card">
      <div className="l">{label}</div>
      <div className="v" style={{ color }}>
        {value}
      </div>
    </div>
  );
}
