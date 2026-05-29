-- AlterTable: admin UI language + onboarding flag
ALTER TABLE "AppSettings" ADD COLUMN "adminLocale" TEXT NOT NULL DEFAULT 'de';
ALTER TABLE "AppSettings" ADD COLUMN "onboarded" BOOLEAN NOT NULL DEFAULT false;
