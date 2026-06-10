-- Migration: backfill_business_context_business_id
--
-- Populates BusinessContext.businessId for existing rows by matching
-- BusinessContext.websiteUrl against businesses.website (exact string).
--
-- Rows that do not match remain NULL — they belong to businesses whose
-- website field was never set (invitation-path businesses start with
-- website = '') or where the URL was written differently. Those rows
-- are unaffected and continue to return zeroed dashboard stats.
--
-- This is the last time the URL-string bridge is intentionally used.
-- All rows created after this migration carry a businessId directly.

UPDATE "BusinessContext" bc
SET    "businessId" = b.id
FROM   businesses b
WHERE  b.website = bc."websiteUrl"
  AND  bc."websiteUrl" <> ''
  AND  bc."businessId" IS NULL;

-- =============================================================================
-- ROLLBACK (resets all backfilled values — does not touch rows already NULL)
-- =============================================================================
-- UPDATE "BusinessContext"
-- SET    "businessId" = NULL
-- WHERE  "businessId" IS NOT NULL;
