import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

// Mandatory GDPR compliance webhook (App Store requirement).
// Shopify sends this when a customer asks a merchant to delete their personal
// data. We strip the only customer PII we keep (the email on Delivery records)
// for this shop while retaining the record itself, so burned license keys are
// never reissued and the merchant's order history stays intact.
export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, topic, payload } = await authenticate.webhook(request);
  const body = payload as { customer?: { email?: string | null } };
  const email = body.customer?.email ?? null;

  if (email) {
    await prisma.delivery.updateMany({
      where: { shop, customerEmail: email },
      data: { customerEmail: "[redacted]" },
    });
  }

  console.log(`[${topic}] ${shop} redacted customer ${email ?? "(no email)"}`);
  return new Response();
};
