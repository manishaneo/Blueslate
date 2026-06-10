-- Migration: add_business_context_business_fk
--
-- Adds a nullable businessId FK to the Phase-1 "BusinessContext" table.
-- Nullable because existing rows have no businessId yet; the backfill
-- migration (20260607000002) populates them via URL-string matching.
-- After the backfill, all new rows will always carry a businessId.
--
-- Rollback: see bottom of file.

-- 1. Add the column
ALTER TABLE "BusinessContext"
    ADD COLUMN "businessId" UUID;

-- 2. Index for the FK lookup used by dashboard and future lead queries
CREATE INDEX "BusinessContext_businessId_idx"
    ON "BusinessContext" ("businessId");

-- 3. FK constraint — SET NULL if the parent Business row is ever removed
--    so the Phase-1 context (and its leads) are not cascade-deleted.
ALTER TABLE "BusinessContext"
    ADD CONSTRAINT "BusinessContext_businessId_fkey"
        FOREIGN KEY ("businessId")
        REFERENCES "businesses" ("id")
        ON DELETE SET NULL
        ON UPDATE CASCADE;

-- =============================================================================
-- ROLLBACK (run manually if needed — Prisma does not auto-rollback)
-- =============================================================================
-- ALTER TABLE "BusinessContext" DROP CONSTRAINT IF EXISTS "BusinessContext_businessId_fkey";
-- DROP INDEX IF EXISTS "BusinessContext_businessId_idx";
-- ALTER TABLE "BusinessContext" DROP COLUMN IF EXISTS "businessId";
