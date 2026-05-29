import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import { fulfillPaidOrder, type PaidOrder } from "../lib/fulfillment.server";

interface OrdersPaidPayload {
  id: number | string;
  name: string;
  email?: string | null;
  contact_email?: string | null;
  customer_locale?: string | null;
  customer?: { email?: string | null } | null;
  line_items?: { product_id: number | string | null; quantity: number }[];
}

export const action = async ({ request }: ActionFunctionArgs) => {
  // authenticate.webhook verifies the Shopify HMAC and rejects (401) if it is
  // missing or invalid, so every handler below runs on a trusted payload.
  const { topic, shop, payload } = await authenticate.webhook(request);
  const order = payload as OrdersPaidPayload;

  const email =
    order.email || order.contact_email || order.customer?.email || "";

  if (!email) {
    console.warn(`[${topic}] ${shop} order ${order.name}: no customer email; skipping`);
    return new Response();
  }

  const paid: PaidOrder = {
    id: order.id,
    name: order.name,
    email,
    locale: order.customer_locale ?? null,
    lineItems: (order.line_items ?? []).map((li) => ({
      productId: li.product_id,
      quantity: li.quantity,
    })),
  };

  try {
    await fulfillPaidOrder(paid);
  } catch (error) {
    // Failures are recorded as FAILED deliveries and the merchant is alerted
    // inside fulfillPaidOrder. We swallow here and return 200 so Shopify does
    // not retry and risk a duplicate email; the merchant can resend from the
    // admin. Fulfillment itself is idempotent (dedupe by order + product).
    console.error(`[${topic}] ${shop} fulfillment error for ${order.name}:`, error);
  }

  return new Response();
};
