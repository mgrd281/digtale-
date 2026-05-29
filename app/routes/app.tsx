import { useEffect } from "react";
import type { HeadersFunction, LoaderFunctionArgs } from "react-router";
import { Outlet, useLoaderData, useRouteError } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { AppProvider } from "@shopify/shopify-app-react-router/react";
import { NavMenu } from "@shopify/app-bridge-react";

import { authenticate, PRO_PLAN } from "../shopify.server";
import { getSettings } from "../lib/settings.server";
import {
  BILLING_ENABLED,
  BILLING_TEST,
  isBillingExempt,
} from "../lib/billing.server";
import { t, isRtl } from "../lib/i18n";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session, billing } = await authenticate.admin(request);

  // Subscription gate: every embedded admin page requires an active plan.
  // Disabled by default (BILLING_ENABLED) so it's safe to ship before launch.
  // The owner's store (and any BILLING_EXEMPT_SHOPS) is never gated. A 14-day
  // free trial is included; charges are test until BILLING_LIVE=true.
  if (BILLING_ENABLED && !isBillingExempt(session.shop)) {
    await billing.require({
      plans: [PRO_PLAN],
      isTest: BILLING_TEST,
      onFailure: async () => billing.request({ plan: PRO_PLAN, isTest: BILLING_TEST }),
    });
  }

  const settings = await getSettings(session.shop);
  return {
    // eslint-disable-next-line no-undef
    apiKey: process.env.SHOPIFY_API_KEY || "",
    locale: settings.adminLocale,
  };
};

export default function App() {
  const { apiKey, locale } = useLoaderData<typeof loader>();

  // Flip the embedded document to RTL for Arabic.
  useEffect(() => {
    document.documentElement.dir = isRtl(locale) ? "rtl" : "ltr";
    document.documentElement.lang = locale;
  }, [locale]);

  return (
    <AppProvider embedded apiKey={apiKey}>
      <NavMenu>
        <a href="/app" rel="home">
          {t(locale, "nav.overview")}
        </a>
        <a href="/app/products">{t(locale, "nav.products")}</a>
        <a href="/app/deliveries">{t(locale, "nav.orders")}</a>
        <a href="/app/settings">{t(locale, "nav.settings")}</a>
      </NavMenu>
      <Outlet />
    </AppProvider>
  );
}

// Shopify needs React Router to catch some thrown responses, so that their headers are included in the response.
export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
