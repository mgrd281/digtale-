// Register the orders/create webhook through the Admin API so Vorkasse
// (deliver-on-unpaid) works without a CLI config deploy. Idempotent +
// best-effort: a duplicate subscription simply means it's already set up.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function ensureOrdersCreateWebhook(admin: any): Promise<void> {
  const appUrl = (process.env.SHOPIFY_APP_URL ?? "").replace(/\/$/, "");
  if (!appUrl) return;
  try {
    await admin.graphql(
      `#graphql
      mutation RegisterOrdersCreate($url: URL!) {
        webhookSubscriptionCreate(
          topic: ORDERS_CREATE
          webhookSubscription: { callbackUrl: $url, format: JSON }
        ) {
          userErrors { message }
        }
      }`,
      { variables: { url: `${appUrl}/webhooks/orders/create` } },
    );
  } catch {
    // already registered / not permitted — ignore
  }
}
