# Final activation step: `shopify app deploy`

Everything is built and the app is running on Railway
(`https://app-production-51af.up.railway.app`). The only remaining step is to
register the OAuth URLs, the `orders/paid` webhook, and upload the Checkout UI
extension to Shopify. This is done with **one CLI command**.

> ## ⚠️ If a previous deploy showed "Find this app in the pages where you work"
>
> That happens when the app is deployed with a placeholder `application_url`
> (`https://shopify.dev/apps/default-app-home`) instead of the Railway URL.
> Shopify then has no real embedded URL to load and **no request reaches the
> server** (empty logs). The fix is to deploy a config whose `application_url`
> and `redirect_urls` point at Railway — see **Option C** below for the
> "Karinex Fulfillment" app.

## Option A — interactive, "karinex" app (works for any org)

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

## Option C — the "Karinex Fulfillment" app (client_id `ae142…`)

Use this if the store has the **Karinex Fulfillment** app installed (a separate
app from `karinex`). The corrected config lives in
`shopify.app.karinex-fulfillment.toml`.

1. **Point Railway at this app's credentials** (this is mandatory — the embedded
   session token is signed with the app's secret, so the `client_id` in Railway
   must match the installed app):
   - `SHOPIFY_API_KEY=ae142adc161ddc372be207268f6873d8`
   - `SHOPIFY_API_SECRET=<the shpss_… secret for the Karinex Fulfillment app>`

   Get the secret from the Dev Dashboard → the Karinex Fulfillment app →
   *API credentials / Client secret*. Then redeploy the Railway service so it
   picks up the new env vars.

2. **Deploy the corrected config** (registers the real Railway `application_url`,
   redirect URLs, the `orders/paid` webhook and the extension):

   ```bash
   npx @shopify/cli@latest app deploy --config karinex-fulfillment
   ```

3. **Reinstall / reload** the app on the store by opening
   `https://app-production-51af.up.railway.app`, entering the shop domain and
   logging in. The embedded dashboard should now load instead of
   "Find this app in the pages where you work".

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
