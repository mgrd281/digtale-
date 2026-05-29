import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

// Mandatory GDPR compliance webhook (App Store requirement).
// Shopify sends this 48 hours after a shop uninstalls the app: we must delete
// ALL data we hold for that shop. Deletes are ordered so foreign keys resolve:
// deliveries first (they reference products + license keys and cascade their
// download tokens), then products (cascades keys/files/links), then the shop's
// settings and sessions.
export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, topic } = await authenticate.webhook(request);

  await prisma.$transaction([
    prisma.delivery.deleteMany({ where: { shop } }),
    prisma.product.deleteMany({ where: { shop } }),
    prisma.appSettings.deleteMany({ where: { shop } }),
    prisma.session.deleteMany({ where: { shop } }),
  ]);

  console.log(`[${topic}] ${shop}: all shop data deleted`);
  return new Response();
};
