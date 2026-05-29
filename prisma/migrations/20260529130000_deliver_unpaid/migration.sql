-- AlterTable: opt-in to delivering on order creation (Vorkasse / unpaid)
ALTER TABLE "AppSettings" ADD COLUMN "deliverUnpaidOrders" BOOLEAN NOT NULL DEFAULT false;
