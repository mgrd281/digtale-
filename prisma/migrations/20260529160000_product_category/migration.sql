-- AlterTable: product category metadata for the catalog grouping
ALTER TABLE "Product" ADD COLUMN "productType" TEXT;
ALTER TABLE "Product" ADD COLUMN "vendor" TEXT;
