-- AlterTable: per-product custom delivery message
ALTER TABLE "Product" ADD COLUMN "deliveryMessage" TEXT;

-- CreateTable: static per-product download links
CREATE TABLE "ProductLink" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProductLink_productId_idx" ON "ProductLink"("productId");

-- AddForeignKey
ALTER TABLE "ProductLink" ADD CONSTRAINT "ProductLink_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
