# KARINEX – Digital Fulfillment App

A custom Shopify app for the store **KARINEX** (karinex.de) that automatically
delivers digital goods after an order is **paid**:

1. Assigns one unused **license key** (per-product pool) to the order.
2. Generates secure, **signed, time-limited, download-count-limited** download
   links for the product file(s).
3. Sends a branded **German** email with the key(s) + download link(s).
4. Shows the key(s) + download button(s) on the **Thank-you** page and the
   **Order-status** page (checkout UI extension).

Plus an embedded **Polaris admin** to manage products, upload keys (CSV/paste),
upload files, and view / resend / revoke deliveries.

## Tech stack

- Shopify app — **React Router** template + TypeScript
- **Polaris web components** + App Bridge (embedded admin)
- **Prisma** ORM with **PostgreSQL** (session storage + app data)
- **nodemailer** over SMTP on the KARINEX domain (`kundenservice@karinex.de`)
- **S3-compatible** object storage for downloadable files (AWS S3, Cloudflare
  R2, Backblaze B2, MinIO, …)

## Architecture

| Concern | Location |
| --- | --- |
| `orders/paid` webhook | `app/routes/webhooks.orders.paid.tsx` |
| Fulfillment (key assignment, tokens, email) | `app/lib/fulfillment.server.ts` |
| Secure download endpoint | `app/routes/download.$token.tsx` |
| Extension data API (signed) | `app/routes/api.deliveries.tsx` |
| Admin: dashboard / products / deliveries | `app/routes/app.*.tsx` |
| Email template (German) | `app/lib/email.server.ts` + `strings.server.ts` |
| S3 storage | `app/lib/storage.server.ts` |
| Checkout UI extension | `extensions/digital-delivery/` |
| Data model | `prisma/schema.prisma` |

## Data model

`Product` · `LicenseKey` · `DigitalFile` · `Delivery` · `DownloadToken`
(+ the template `Session`). See `prisma/schema.prisma`. Idempotency is enforced
by a unique `(shopifyOrderId, productId)` on `Delivery`; keys are claimed with
`SELECT … FOR UPDATE SKIP LOCKED` so they can never be double-assigned.

## Environment variables

Copy `.env.example` to `.env` and fill in:

| Variable | Description |
| --- | --- |
| `SHOPIFY_API_KEY` / `SHOPIFY_API_SECRET` | From the Partner dashboard / `shopify app dev` |
| `SHOPIFY_APP_URL` | Public HTTPS URL of the app |
| `SCOPES` | `read_orders,read_products` |
| `DATABASE_URL` | PostgreSQL connection string |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_SECURE` | KARINEX mail server |
| `SMTP_USER` / `SMTP_PASS` | SMTP credentials |
| `MAIL_FROM` | `KARINEX <kundenservice@karinex.de>` |
| `MERCHANT_ALERT_EMAIL` | Where low-stock / failure alerts go |
| `S3_ENDPOINT` / `S3_REGION` / `S3_BUCKET` | Object storage |
| `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY` | Storage credentials |
| `S3_FORCE_PATH_STYLE` | `true` for R2 / MinIO, `false`/unset for AWS S3 |

> Secrets live only in `.env` (git-ignored) and never in client code. The only
> value baked into the extension is the public app URL.

## Local development

```bash
npm install

# 1. Start PostgreSQL and set DATABASE_URL, then apply migrations:
npm run setup            # prisma generate && prisma migrate deploy
#   for local schema changes use: npx prisma migrate dev

# 2. Run the app (opens a tunnel, installs on your dev store):
npm run dev              # shopify app dev
```

`shopify app dev` registers the `orders/paid` webhook, serves the embedded
admin, and hot-reloads the checkout UI extension on your development store.

## How to upload license keys

1. Open the app → **Produkte** → **Mit Shopify synchronisieren** to import the
   catalog.
2. Open a product, set **Lieferart** (`KEY` / `FILE` / `BOTH`),
   **Max. Downloads** and **Gültigkeit (Stunden)**.
3. Under **Schlüssel hochladen**, paste keys (one per line) **or** upload a CSV
   (first column = key). Duplicates are skipped. Available vs. assigned counts
   are shown, with a low-stock warning under 10.
4. Under **Dateien hochladen**, upload the downloadable file(s) to storage.

## Deployment

1. **Database** — provision PostgreSQL, set `DATABASE_URL`, run
   `npm run setup` (runs `prisma migrate deploy`).
2. **App config** — set all env vars on the host. Deploy the app
   (`npm run build` + `npm run start`, or the provided `Dockerfile` which runs
   `npm run docker-start`).
3. **Extension URL** — set `APP_URL` in
   `extensions/digital-delivery/src/config.ts` to your `SHOPIFY_APP_URL`
   (UI extensions have no runtime env vars).
4. **Push to Shopify** — `npm run deploy` (`shopify app deploy`) to register the
   webhook subscription, scopes, and the checkout UI extension.
5. In the store theme/checkout editor, add the **KARINEX Digitale Auslieferung**
   block to the Thank-you and Order-status pages.

## Security notes

- Every webhook is **HMAC-verified** (`authenticate.webhook`).
- Extension → backend requests are **signed** with the Shopify session token,
  verified by `authenticate.public.checkout` / `customerAccount`.
- Download tokens are 256-bit random, single-purpose, expiring and
  count-limited; the endpoint atomically consumes a download and never returns
  a raw 404 (always a localized page).
- Revoking a delivery expires its tokens and **burns** the key (kept assigned so
  it is never re-issued).

## Legal (Germany)

The email and the Thank-you / Order-status block display, per § 356 Abs. 5 BGB:

> *Mit dem Download beginnt die Ausführung des Vertrags. Ihr Widerrufsrecht
> erlischt gemäß § 356 Abs. 5 BGB.*

Consent to the waiver of the Widerrufsrecht is assumed to be captured at
checkout.

## Known limitations / next steps

- One key is assigned per (order, product) line, regardless of quantity — matches
  the single-`licenseKeyId` data model.
- Fulfillment runs inline in the webhook; for very high volume move it to a
  background queue.
- File uploads are buffered in memory; for very large files switch to streaming
  / multipart S3 uploads.
- The extension matches deliveries by order id presented by the (token-verified)
  session; add explicit buyer-to-order ownership checks if stricter isolation is
  required.
