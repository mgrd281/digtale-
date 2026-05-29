import { unauthenticated } from "../shopify.server";

export interface ShopBilling {
  shop: string;
  // "active" | "trial" | "none" | "unknown"
  state: "active" | "trial" | "none" | "unknown";
  planName: string | null;
  monthly: number; // estimated monthly amount in the plan currency
  currency: string;
  trialEndsAt: string | null;
}

const SUBSCRIPTIONS_QUERY = `#graphql
  query StaffActiveSubscriptions {
    currentAppInstallation {
      activeSubscriptions {
        name
        status
        test
        trialDays
        createdAt
        lineItems {
          plan {
            pricingDetails {
              __typename
              ... on AppRecurringPricing {
                price { amount currencyCode }
                interval
              }
            }
          }
        }
      }
    }
  }`;

// Query one installed shop's Shopify Billing state. Best-effort: any failure
// (no offline token, network, scopes) yields state "unknown" so one bad shop
// never breaks the overview.
export async function getShopBilling(shop: string): Promise<ShopBilling> {
  const base: ShopBilling = {
    shop,
    state: "unknown",
    planName: null,
    monthly: 0,
    currency: "USD",
    trialEndsAt: null,
  };
  try {
    const { admin } = await unauthenticated.admin(shop);
    const resp = await admin.graphql(SUBSCRIPTIONS_QUERY);
    const json = await resp.json();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const subs: any[] =
      json?.data?.currentAppInstallation?.activeSubscriptions ?? [];

    if (subs.length === 0) {
      return { ...base, state: "none" };
    }

    const sub = subs[0];
    let monthly = 0;
    let currency = "USD";
    for (const li of sub.lineItems ?? []) {
      const pd = li?.plan?.pricingDetails;
      if (pd?.__typename === "AppRecurringPricing" && pd.price) {
        const amount = Number(pd.price.amount) || 0;
        currency = pd.price.currencyCode || currency;
        monthly += pd.interval === "ANNUAL" ? amount / 12 : amount;
      }
    }

    let trialEndsAt: string | null = null;
    let onTrial = false;
    if (sub.trialDays && sub.createdAt) {
      const end = new Date(sub.createdAt).getTime() + sub.trialDays * 86400000;
      if (end > Date.now()) {
        onTrial = true;
        trialEndsAt = new Date(end).toISOString().slice(0, 10);
      }
    }

    return {
      shop,
      state: onTrial ? "trial" : sub.status === "ACTIVE" ? "active" : "none",
      planName: sub.name ?? null,
      monthly,
      currency,
      trialEndsAt,
    };
  } catch {
    return base;
  }
}
