-- Multi-tenancy: scope all domain data per installed shop.
--
-- Existing rows belong to the single store the app was installed on so far.
-- We backfill `shop` from the live Session row (self-correcting regardless of
-- the exact domain); if no session exists we fall back to the known live store.

-- ---------------------------------------------------------------------------
-- Product: add shop, re-key uniqueness per shop.
-- ---------------------------------------------------------------------------
ALTER TABLE "Product" ADD COLUMN "shop" TEXT;
UPDATE "Product"
  SET "shop" = COALESCE(
    (SELECT "shop" FROM "Session" ORDER BY "expires" DESC NULLS LAST LIMIT 1),
    '45dv93-bk.myshopify.com'
  )
  WHERE "shop" IS NULL;
ALTER TABLE "Product" ALTER COLUMN "shop" SET NOT NULL;

DROP INDEX "Product_shopifyProductId_key";
CREATE UNIQUE INDEX "Product_shop_shopifyProductId_key" ON "Product"("shop", "shopifyProductId");
CREATE INDEX "Product_shop_idx" ON "Product"("shop");

-- ---------------------------------------------------------------------------
-- LicenseKey: uniqueness now scoped to its (shop-scoped) product.
-- ---------------------------------------------------------------------------
DROP INDEX "LicenseKey_keyValue_key";
CREATE UNIQUE INDEX "LicenseKey_productId_keyValue_key" ON "LicenseKey"("productId", "keyValue");

-- ---------------------------------------------------------------------------
-- Delivery: add shop, re-key idempotency uniqueness per shop.
-- ---------------------------------------------------------------------------
ALTER TABLE "Delivery" ADD COLUMN "shop" TEXT;
UPDATE "Delivery"
  SET "shop" = COALESCE(
    (SELECT "shop" FROM "Session" ORDER BY "expires" DESC NULLS LAST LIMIT 1),
    '45dv93-bk.myshopify.com'
  )
  WHERE "shop" IS NULL;
ALTER TABLE "Delivery" ALTER COLUMN "shop" SET NOT NULL;

DROP INDEX "Delivery_shopifyOrderId_productId_key";
CREATE UNIQUE INDEX "Delivery_shop_shopifyOrderId_productId_key" ON "Delivery"("shop", "shopifyOrderId", "productId");
CREATE INDEX "Delivery_shop_idx" ON "Delivery"("shop");

-- ---------------------------------------------------------------------------
-- AppSettings: switch the singleton (id = 'default') to one row per shop,
-- keyed by the shop domain. Preserve the existing branding/onboarding row.
-- ---------------------------------------------------------------------------
ALTER TABLE "AppSettings" ADD COLUMN "shop" TEXT;
UPDATE "AppSettings"
  SET "shop" = COALESCE(
    (SELECT "shop" FROM "Session" ORDER BY "expires" DESC NULLS LAST LIMIT 1),
    '45dv93-bk.myshopify.com'
  )
  WHERE "shop" IS NULL;
ALTER TABLE "AppSettings" ALTER COLUMN "shop" SET NOT NULL;

ALTER TABLE "AppSettings" DROP CONSTRAINT "AppSettings_pkey";
ALTER TABLE "AppSettings" DROP COLUMN "id";
ALTER TABLE "AppSettings" ADD CONSTRAINT "AppSettings_pkey" PRIMARY KEY ("shop");
