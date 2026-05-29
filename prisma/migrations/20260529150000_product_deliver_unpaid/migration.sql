-- AlterTable: per-product Vorkasse (deliver on order creation) override
ALTER TABLE "Product" ADD COLUMN "deliverUnpaid" BOOLEAN NOT NULL DEFAULT false;
