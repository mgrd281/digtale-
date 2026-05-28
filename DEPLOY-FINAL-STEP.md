# Final activation step: `shopify app deploy`

Everything is built and the app is running on Railway
(`https://app-production-51af.up.railway.app`). The only remaining step is to
register the OAuth URLs, the `orders/paid` webhook, and upload the Checkout UI
extension to Shopify. This is done with **one CLI command**.

## Option A — interactive (recommended, works for any org)

Run these in a terminal on a machine with a browser available:

```bash
git clone -b claude/karinex-digital-fulfillment-4AjwD https://github.com/mgrd281/digtale-.git
cd digtale-
npm install
npx @shopify/cli@latest app deploy
```

The CLI opens a browser to log in to your Shopify account, then deploys. The
app's `shopify.app.toml` already contains the correct `client_id`,
`application_url`, `redirect_urls`, webhooks and the extension, so just confirm
the prompts.

## Option B — CI/CD with an app automation token

```bash
export SHOPIFY_APP_AUTOMATION_TOKEN="<token from Dev Dashboard → Einstellungen>"
npx @shopify/cli@latest app deploy --allow-updates
```

Note: automation-token deploys require the app's organization to support the
App Management API. If you see *"The custom token provided can't be used for
the App Management API"*, use Option A (interactive) instead.

## After deploy

1. Install the app on the KARINEX store (open
   `https://app-production-51af.up.railway.app`, enter the shop domain, Log in).
2. In the store's Checkout/Thank-you editor, add the
   **„KARINEX Digitale Auslieferung"** block to the Thank-you and Order-status
   pages.
3. In Railway, confirm the app service has the **Partners** credentials:
   - `SHOPIFY_API_KEY=1d26b3b50a07a39599a71b977bc6e467`
   - `SHOPIFY_API_SECRET=<the shpss_… client secret>`
