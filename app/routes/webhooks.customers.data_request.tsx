import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

// Mandatory GDPR compliance webhook (App Store requirement).
// Shopify sends this when a merchant requests a copy of the personal data an
// app stores about one of their customers. authenticate.webhook verifies the
// HMAC and returns 401 on an invalid signature, as required.
export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, topic, payload } = await authenticate.webhook(request);
  const body = payload as {
    customer?: { email?: string | null };
    data_request?: { id?: number | string };
  };
  const email = body.customer?.email ?? null;

  // The only customer PII we store is the email on Delivery records. Gather
  // what we hold for this customer (scoped to the requesting shop) so the
  // merchant can fulfil the data-subject access request.
  const deliveries = email
    ? await prisma.delivery.findMany({
        where: { shop, customerEmail: email },
        select: {
          shopifyOrderName: true,
          customerEmail: true,
          status: true,
          createdAt: true,
          product: { select: { title: true } },
        },
      })
    : [];

  console.log(
    `[${topic}] ${shop} data request ${body.data_request?.id ?? ""} for ` +
      `${email ?? "(no email)"}: ${deliveries.length} record(s) held`,
  );

  return new Response();
};
