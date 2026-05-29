-- CreateTable: app-wide branding / e-mail template settings (single row)
CREATE TABLE "AppSettings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "shopName" TEXT NOT NULL DEFAULT 'KARINEX',
    "brandColor" TEXT NOT NULL DEFAULT '#0b3d2e',
    "logoUrl" TEXT,
    "supportEmail" TEXT NOT NULL DEFAULT 'kundenservice@karinex.de',
    "emailIntro" TEXT,
    "emailFooter" TEXT,
    "defaultLocale" TEXT NOT NULL DEFAULT 'de',
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AppSettings_pkey" PRIMARY KEY ("id")
);
