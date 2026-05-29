-- Per-shop plan override set from the staff control panel.
ALTER TABLE "AppSettings" ADD COLUMN "plan" TEXT NOT NULL DEFAULT 'DEFAULT';

-- The currently-installed shop(s) are the owner's own store → mark as PAID
-- so the owner's account shows as a paying customer. New shops stay DEFAULT.
UPDATE "AppSettings" SET "plan" = 'PAID';
