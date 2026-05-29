// Billing helpers shared by the admin layout gate.
//
// SAFE ROLLOUT: the subscription gate only enforces when BILLING_ENABLED=true.
// While disabled (the default) the app behaves exactly as before — nobody is
// gated — so the billing code can ship without risk to the live store. Flip it
// on when the app is ready for public (App Store) launch.
//
//   BILLING_ENABLED=true       → enforce the subscription gate
//   BILLING_LIVE=true          → charge real money (otherwise Shopify TEST charges)
//   BILLING_EXEMPT_SHOPS=a,b   → shops that are never gated (the owner's store)

export const BILLING_ENABLED = process.env.BILLING_ENABLED === "true";

// The Pro plan price (kept in sync with the billing config in shopify.server).
export const PRO_PLAN_PRICE = 9.99;
export const PRO_PLAN_CURRENCY = "USD";

// Real charges only when explicitly enabled; otherwise Shopify test charges.
export const BILLING_TEST = process.env.BILLING_LIVE !== "true";

const EXEMPT = new Set(
  (process.env.BILLING_EXEMPT_SHOPS ?? "45dv93-bk.myshopify.com")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean),
);

export function isBillingExempt(shop: string): boolean {
  return EXEMPT.has(shop.toLowerCase());
}
