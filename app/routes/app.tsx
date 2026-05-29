import { useEffect } from "react";
import type { HeadersFunction, LoaderFunctionArgs } from "react-router";
import { Outlet, useLoaderData, useRouteError } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { AppProvider } from "@shopify/shopify-app-react-router/react";
import { NavMenu } from "@shopify/app-bridge-react";

import { authenticate } from "../shopify.server";
import { getSettings } from "../lib/settings.server";
import { t, isRtl } from "../lib/i18n";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);
  const settings = await getSettings();
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
