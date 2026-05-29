-- AlterTable: public shareable delivery-page token
ALTER TABLE "Delivery" ADD COLUMN "accessToken" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Delivery_accessToken_key" ON "Delivery"("accessToken");
