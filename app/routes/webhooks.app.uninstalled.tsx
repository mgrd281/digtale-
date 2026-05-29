import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, session, topic } = await authenticate.webhook(request);

  console.log(`Received ${topic} webhook for ${shop}`);

  // Webhook requests can trigger multiple times and after an app has already been uninstalled.
  // If this webhook already ran, the session may have been deleted previously.
  if (session) {
    await db.session.deleteMany({ where: { shop } });
  }

  // Reset onboarding so a fresh re-install shows the language/welcome screen
  // again. The rest of the shop's data stays intact (full deletion happens
  // 48h later via the shop/redact GDPR webhook).
  await db.appSettings
    .updateMany({ where: { shop }, data: { onboarded: false } })
    .catch(() => {});

  return new Response();
};
