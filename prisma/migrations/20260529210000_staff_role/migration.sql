-- Staff roles: ADMIN (full control) or VIEWER (read-only).
ALTER TABLE "StaffUser" ADD COLUMN "role" TEXT NOT NULL DEFAULT 'ADMIN';
