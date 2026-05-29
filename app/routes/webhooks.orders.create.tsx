import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import { fulfillPaidOrder, type PaidOrder } from "../lib/fulfillment.server";

interface OrdersCreatePayload {
  id: number | string;
  name: string;
  email?: string | null;
  contact_email?: string | null;
  customer_locale?: string | null;
  customer?: { email?: string | null } | null;
  line_items?: { product_id: number | string | null; quantity: number }[];
}

// Fires when an order is created (before payment). Used for Vorkasse / bank
// transfer: we only deliver here when the merchant has opted in via Settings.
// Fulfillment is idempotent (dedupe by order + product), so a later orders/paid
// for the same order is a safe no-op.
export const action = async ({ request }: ActionFunctionArgs) => {
  const { topic, shop, payload } = await authenticate.webhook(request);

  const order = payload as OrdersCreatePayload;
  const email =
    order.email || order.contact_email || order.customer?.email || "";
  if (!email) {
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
    // unpaidMode: only products opted into Vorkasse (globally or per product)
    // are delivered here.
    await fulfillPaidOrder(shop, paid, { unpaidMode: true });
  } catch (error) {
    console.error(`[${topic}] ${shop} fulfillment error for ${order.name}:`, error);
  }

  return new Response();
};
