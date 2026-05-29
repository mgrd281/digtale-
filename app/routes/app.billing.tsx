import type {
  ActionFunctionArgs,
  HeadersFunction,
  LoaderFunctionArgs,
} from "react-router";
import { useLoaderData, Form } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import { getSettings } from "../lib/settings.server";
import { PLANS, PLAN_IDS, BILLING_TEST } from "../lib/billing.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session, billing } = await authenticate.admin(request);
  const settings = await getSettings(session.shop);

  let current: string | null = null;
  try {
    const res = await billing.check({ plans: PLAN_IDS, isTest: BILLING_TEST });
    current = res.appSubscriptions?.[0]?.name ?? null;
  } catch {
    current = null;
  }

  return {
    locale: settings.adminLocale,
    plan: settings.plan, // DEFAULT | FREE | PAID (manual override)
    current,
    plans: PLANS,
  };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { billing } = await authenticate.admin(request);
  const form = await request.formData();
  const plan = String(form.get("plan"));
  if (!PLAN_IDS.includes(plan)) {
    return { error: "Unbekannter Plan." };
  }
  const appUrl = (process.env.SHOPIFY_APP_URL ?? "").replace(/\/$/, "");
  return billing.request({
    plan,
    isTest: BILLING_TEST,
    returnUrl: `${appUrl}/app/billing`,
  });
};

type L = {
  title: string;
  lead: string;
  current: string;
  choose: string;
  active: string;
  paid: string;
  free: string;
  perMonth: string;
  trial: string;
  features: string;
  popular: string;
};

const T: Record<string, L> = {
  de: { title: "Abonnement", lead: "Wähle den Plan, der zu deinem Shop passt. 14 Tage kostenlos testen.", current: "Aktueller Plan", choose: "Auswählen", active: "Aktiv", paid: "Dein Konto ist freigeschaltet (Bezahlt) – es fallen keine Gebühren an.", free: "Dein Konto ist dauerhaft kostenlos.", perMonth: "/ Monat", trial: "14 Tage kostenlos", features: "Alle Funktionen inklusive", popular: "Beliebt" },
  en: { title: "Subscription", lead: "Choose the plan that fits your shop. 14-day free trial.", current: "Current plan", choose: "Choose", active: "Active", paid: "Your account is unlocked (Paid) – no charges apply.", free: "Your account is free forever.", perMonth: "/ month", trial: "14 days free", features: "All features included", popular: "Popular" },
  fr: { title: "Abonnement", lead: "Choisissez le forfait adapté à votre boutique. Essai gratuit de 14 jours.", current: "Forfait actuel", choose: "Choisir", active: "Actif", paid: "Votre compte est débloqué (Payé) – aucun frais.", free: "Votre compte est gratuit à vie.", perMonth: "/ mois", trial: "14 jours gratuits", features: "Toutes les fonctions incluses", popular: "Populaire" },
  es: { title: "Suscripción", lead: "Elige el plan ideal para tu tienda. Prueba gratis de 14 días.", current: "Plan actual", choose: "Elegir", active: "Activo", paid: "Tu cuenta está desbloqueada (Pagado) – sin cargos.", free: "Tu cuenta es gratis para siempre.", perMonth: "/ mes", trial: "14 días gratis", features: "Todas las funciones incluidas", popular: "Popular" },
  it: { title: "Abbonamento", lead: "Scegli il piano adatto al tuo negozio. 14 giorni di prova gratis.", current: "Piano attuale", choose: "Scegli", active: "Attivo", paid: "Il tuo account è sbloccato (Pagato) – nessun costo.", free: "Il tuo account è gratis per sempre.", perMonth: "/ mese", trial: "14 giorni gratis", features: "Tutte le funzioni incluse", popular: "Popolare" },
  nl: { title: "Abonnement", lead: "Kies het plan dat bij je winkel past. 14 dagen gratis proberen.", current: "Huidig plan", choose: "Kiezen", active: "Actief", paid: "Je account is vrijgeschakeld (Betaald) – geen kosten.", free: "Je account is voor altijd gratis.", perMonth: "/ maand", trial: "14 dagen gratis", features: "Alle functies inbegrepen", popular: "Populair" },
  pl: { title: "Subskrypcja", lead: "Wybierz plan dopasowany do sklepu. 14 dni za darmo.", current: "Bieżący plan", choose: "Wybierz", active: "Aktywny", paid: "Twoje konto jest odblokowane (Płatne) – bez opłat.", free: "Twoje konto jest darmowe na zawsze.", perMonth: "/ miesiąc", trial: "14 dni za darmo", features: "Wszystkie funkcje w zestawie", popular: "Popularny" },
  pt: { title: "Assinatura", lead: "Escolha o plano ideal para a sua loja. 14 dias grátis.", current: "Plano atual", choose: "Escolher", active: "Ativo", paid: "A sua conta está desbloqueada (Pago) – sem cobranças.", free: "A sua conta é gratuita para sempre.", perMonth: "/ mês", trial: "14 dias grátis", features: "Todos os recursos incluídos", popular: "Popular" },
  uk: { title: "Підписка", lead: "Оберіть план для вашого магазину. 14 днів безкоштовно.", current: "Поточний план", choose: "Обрати", active: "Активний", paid: "Ваш акаунт розблоковано (Оплачено) – без оплати.", free: "Ваш акаунт безкоштовний назавжди.", perMonth: "/ місяць", trial: "14 днів безкоштовно", features: "Усі функції включено", popular: "Популярний" },
  ar: { title: "الاشتراك", lead: "اختر الخطة المناسبة لمتجرك. تجربة مجانية 14 يوماً.", current: "الخطة الحالية", choose: "اختيار", active: "نشط", paid: "حسابك مُفعّل (مدفوع) – لا توجد أي رسوم.", free: "حسابك مجاني دائماً.", perMonth: "/ شهر", trial: "14 يوماً مجاناً", features: "كل الميزات مشمولة", popular: "الأكثر شيوعاً" },
};

function money(amount: number) {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

export default function AppBilling() {
  const { locale, plan, current, plans } = useLoaderData<typeof loader>();
  const tr = T[locale] ?? T.en;
  const comped = plan === "PAID" || plan === "FREE";

  return (
    <s-page heading={tr.title}>
      <style>{`
        .ab-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:16px;margin-top:8px}
        .ab-card{position:relative;background:#fff;border:1px solid #e5e7eb;border-radius:18px;padding:24px;display:flex;flex-direction:column;box-shadow:0 1px 2px rgba(16,24,40,.05)}
        .ab-card.pop{border-color:#0b3d2e;box-shadow:0 10px 30px rgba(11,61,46,.12)}
        .ab-pop{position:absolute;top:-11px;left:50%;transform:translateX(-50%);background:#0b3d2e;color:#fff;font-size:11px;font-weight:700;padding:4px 12px;border-radius:999px}
        .ab-name{font-size:17px;font-weight:750;color:#0b3d2e}
        .ab-amt{font-size:34px;font-weight:820;margin:10px 0 2px;color:#111827}
        .ab-amt span{font-size:14px;font-weight:600;color:#6b7280}
        .ab-trial{font-size:12px;color:#1a7f37;font-weight:600;margin-bottom:14px}
        .ab-feat{font-size:13.5px;color:#475569;margin:0 0 18px;display:flex;gap:8px;align-items:center}
        .ab-btn{margin-top:auto;background:#0b3d2e;color:#fff;border:0;border-radius:11px;padding:12px;font-size:14px;font-weight:700;cursor:pointer;width:100%}
        .ab-btn:hover{background:#14573f}
        .ab-btn.cur{background:#e7f7ec;color:#176b32;cursor:default}
      `}</style>

      <s-section>
        <s-paragraph>{tr.lead}</s-paragraph>

        {comped && (
          <s-banner tone={plan === "FREE" ? "info" : "success"}>
            <s-paragraph>{plan === "FREE" ? tr.free : tr.paid}</s-paragraph>
          </s-banner>
        )}

        <div className="ab-grid">
          {plans.map((p) => {
            const isCurrent = current === p.id;
            return (
              <div key={p.id} className={"ab-card" + (p.popular ? " pop" : "")}>
                {p.popular && <div className="ab-pop">{tr.popular}</div>}
                <div className="ab-name">{p.id}</div>
                <div className="ab-amt">
                  {money(p.price)}
                  <span> {tr.perMonth}</span>
                </div>
                <div className="ab-trial">{tr.trial}</div>
                <div className="ab-feat">✓ {tr.features}</div>
                {isCurrent ? (
                  <button className="ab-btn cur" disabled>
                    {tr.active}
                  </button>
                ) : comped ? (
                  <button className="ab-btn cur" disabled>
                    {plan === "PAID" ? tr.active : "—"}
                  </button>
                ) : (
                  <Form method="post">
                    <input type="hidden" name="plan" value={p.id} />
                    <button className="ab-btn" type="submit">
                      {tr.choose}
                    </button>
                  </Form>
                )}
              </div>
            );
          })}
        </div>
      </s-section>
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
