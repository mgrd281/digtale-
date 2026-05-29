import type {
  ActionFunctionArgs,
  HeadersFunction,
  LoaderFunctionArgs,
} from "react-router";
import { useEffect, useState } from "react";
import { useLoaderData, useFetcher } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";
import { LOW_STOCK_THRESHOLD } from "../lib/shared";
import { getSettings, updateSettings } from "../lib/settings.server";
import { LOCALES, t, type TKey } from "../lib/i18n";

export const action = async ({ request }: ActionFunctionArgs) => {
  await authenticate.admin(request);
  const form = await request.formData();
  if (String(form.get("intent")) === "onboard") {
    const adminLocale = String(form.get("adminLocale") || "de");
    await updateSettings({ adminLocale, onboarded: true });
  }
  return { ok: true };
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);
  const settings = await getSettings();

  const [products, failedCount, pendingCount, deliveredCount] = await Promise.all([
    prisma.product.findMany({
      orderBy: { title: "asc" },
      include: {
        _count: {
          select: { licenseKeys: { where: { status: "AVAILABLE" } } },
        },
      },
    }),
    prisma.delivery.count({ where: { status: "FAILED" } }),
    prisma.delivery.count({ where: { status: "PENDING" } }),
    prisma.delivery.count({ where: { status: "DELIVERED" } }),
  ]);

  const lowStock = products
    .filter(
      (p) =>
        (p.deliveryType === "KEY" || p.deliveryType === "BOTH") &&
        p._count.licenseKeys < LOW_STOCK_THRESHOLD,
    )
    .map((p) => ({ id: p.id, title: p.title, available: p._count.licenseKeys }));

  return {
    onboarded: settings.onboarded,
    locale: settings.adminLocale,
    productCount: products.length,
    failedCount,
    pendingCount,
    deliveredCount,
    lowStock,
  };
};

const STAT_CSS = `
  .kx-stats {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 14px;
  }
  .kx-stat {
    background: #fff;
    border: 1px solid #e5e7eb;
    border-radius: 16px;
    padding: 18px 20px;
    box-shadow: 0 1px 2px rgba(16, 24, 40, 0.05);
  }
  .kx-stat-label { font-size: 13px; color: #6b7280; font-weight: 550; }
  .kx-stat-value { font-size: 30px; font-weight: 750; line-height: 1.1; margin-top: 8px; }
`;

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent: string;
}) {
  return (
    <div className="kx-stat">
      <div className="kx-stat-label">{label}</div>
      <div className="kx-stat-value" style={{ color: accent }}>
        {value}
      </div>
    </div>
  );
}

const WELCOME_CSS = `
  .kx-wel { max-width: 920px; margin: 8px auto; display: grid; grid-template-columns: 1.1fr .9fr; gap: 0;
    background: #fff; border: 1px solid #e5e7eb; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 30px rgba(16,24,40,.08); }
  .kx-wel-l { padding: 38px 34px; }
  .kx-wel-r { background: linear-gradient(150deg, #0b3d2e, #14573f); display: flex; align-items: center; justify-content: center; padding: 30px; }
  .kx-wel-logo { font-size: 13px; font-weight: 800; letter-spacing: 3px; color: #0b3d2e; }
  .kx-wel-h1 { font-size: 27px; font-weight: 800; color: #111827; margin: 10px 0 6px; }
  .kx-wel-sub { font-size: 15px; color: #4b5563; margin: 0 0 22px; }
  .kx-wel-feat { list-style: none; padding: 0; margin: 0 0 26px; display: grid; gap: 12px; }
  .kx-wel-feat li { display: flex; gap: 10px; font-size: 14px; color: #374151; align-items: flex-start; }
  .kx-wel-feat svg { flex: 0 0 auto; width: 20px; height: 20px; color: #1a7f37; margin-top: 1px; }
  .kx-wel-lab { font-size: 13px; color: #6b7280; font-weight: 600; margin-bottom: 6px; display: block; }
  .kx-wel-sel { width: 100%; max-width: 320px; padding: 11px 14px; border: 1px solid #d8dde3; border-radius: 11px;
    font-size: 15px; background: #fff; outline: none; }
  .kx-wel-btn { margin-top: 18px; background: #0b3d2e; color: #fff; border: 0; font-weight: 700; font-size: 15px;
    padding: 13px 26px; border-radius: 12px; cursor: pointer; }
  .kx-wel-btn:disabled { opacity: .6; cursor: default; }
  .kx-wel-badge { width: 86px; height: 86px; border-radius: 22px; background: rgba(255,255,255,.14);
    display: flex; align-items: center; justify-content: center; }
  @media (max-width: 760px) { .kx-wel { grid-template-columns: 1fr; } .kx-wel-r { display: none; } }
`;

function Welcome({ initial }: { initial: string }) {
  const onboard = useFetcher();
  const [lang, setLang] = useState(initial || "de");
  const tr = (k: TKey) => t(lang, k);
  useEffect(() => {
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
  }, [lang]);
  return (
    <>
      <style>{WELCOME_CSS}</style>
      <div className="kx-wel">
        <div className="kx-wel-l">
          <div className="kx-wel-logo">KARINEX</div>
          <h1 className="kx-wel-h1">{tr("welcome.title")}</h1>
          <p className="kx-wel-sub">{tr("welcome.subtitle")}</p>
          <ul className="kx-wel-feat">
            {(["welcome.f1", "welcome.f2", "welcome.f3", "welcome.f4"] as TKey[]).map(
              (k) => (
                <li key={k}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                  <span>{tr(k)}</span>
                </li>
              ),
            )}
          </ul>
          <label className="kx-wel-lab">{tr("welcome.selectLang")}</label>
          <select
            className="kx-wel-sel"
            value={lang}
            onChange={(e) => setLang(e.target.value)}
          >
            {LOCALES.map((l) => (
              <option key={l.code} value={l.code}>
                {l.label}
              </option>
            ))}
          </select>
          <div>
            <button
              className="kx-wel-btn"
              disabled={onboard.state !== "idle"}
              onClick={() =>
                onboard.submit(
                  { intent: "onboard", adminLocale: lang },
                  { method: "post" },
                )
              }
            >
              {tr("welcome.start")}
            </button>
          </div>
        </div>
        <div className="kx-wel-r">
          <div className="kx-wel-badge">
            <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              <path d="M8 10h8M8 13h5" />
            </svg>
          </div>
        </div>
      </div>
    </>
  );
}

export default function Dashboard() {
  const {
    onboarded,
    locale,
    productCount,
    failedCount,
    pendingCount,
    deliveredCount,
    lowStock,
  } = useLoaderData<typeof loader>();
  // Dismissals persist (per count): a banner stays hidden until the number
  // changes (e.g. a new failed delivery), then it reappears.
  const [hideFailed, setHideFailed] = useState(false);
  const [hideLowStock, setHideLowStock] = useState(false);
  useEffect(() => {
    setHideFailed(localStorage.getItem("kx_dismiss_failed") === String(failedCount));
    setHideLowStock(
      localStorage.getItem("kx_dismiss_lowstock") === String(lowStock.length),
    );
  }, [failedCount, lowStock.length]);
  const dismissFailed = () => {
    localStorage.setItem("kx_dismiss_failed", String(failedCount));
    setHideFailed(true);
  };
  const dismissLowStock = () => {
    localStorage.setItem("kx_dismiss_lowstock", String(lowStock.length));
    setHideLowStock(true);
  };

  if (!onboarded) {
    return <Welcome initial={locale} />;
  }

  return (
    <s-page heading="KARINEX – Digitale Auslieferung">
      <s-link slot="primary-action" href="/app/products">
        {t(locale, "dash.manage")}
      </s-link>

      {failedCount > 0 && !hideFailed && (
        <s-banner tone="critical" heading={t(locale, "dash.failedHeading")}>
          <s-stack direction="block" gap="small-300">
            <s-paragraph>
              {failedCount} {t(locale, "dash.failedBody")}{" "}
              <s-link href="/app/deliveries?status=FAILED">
                {t(locale, "dash.checkNow")}
              </s-link>
              .
            </s-paragraph>
            <s-button variant="tertiary" onClick={dismissFailed}>
              {t(locale, "dash.dismiss")}
            </s-button>
          </s-stack>
        </s-banner>
      )}

      {lowStock.length > 0 && !hideLowStock && (
        <s-banner
          tone="warning"
          heading={`${t(locale, "dash.lowStockHeading")} (${lowStock.length})`}
        >
          <s-stack direction="block" gap="small-300">
            <s-paragraph>
              {lowStock.length} {t(locale, "dash.lowStockBody")}{" "}
              {lowStock.slice(0, 3).map((p) => p.title).join(", ")}
              {lowStock.length > 3
                ? " " +
                  t(locale, "dash.andMore").replace(
                    "{n}",
                    String(lowStock.length - 3),
                  )
                : ""}
              .{" "}
              <s-link href="/app/products">{t(locale, "dash.manage")}</s-link>.
            </s-paragraph>
            <s-button variant="tertiary" onClick={dismissLowStock}>
              {t(locale, "dash.dismiss")}
            </s-button>
          </s-stack>
        </s-banner>
      )}

      <s-section heading={t(locale, "dash.glance")}>
        <style>{STAT_CSS}</style>
        <div className="kx-stats">
          <StatCard label={t(locale, "dash.products")} value={productCount} accent="#3538cd" />
          <StatCard label={t(locale, "dash.delivered")} value={deliveredCount} accent="#1a7f37" />
          <StatCard label={t(locale, "dash.pending")} value={pendingCount} accent="#b54708" />
          <StatCard label={t(locale, "dash.failed")} value={failedCount} accent="#b42318" />
        </div>
      </s-section>

      <s-section slot="aside" heading={t(locale, "dash.firstSteps")}>
        <s-ordered-list>
          <s-list-item>{t(locale, "dash.step1")}</s-list-item>
          <s-list-item>{t(locale, "dash.step2")}</s-list-item>
          <s-list-item>{t(locale, "dash.step3")}</s-list-item>
        </s-ordered-list>
      </s-section>
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
