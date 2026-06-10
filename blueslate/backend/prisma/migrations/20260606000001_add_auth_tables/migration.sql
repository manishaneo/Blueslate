-- =============================================================================
-- Migration: add_auth_tables
-- Adds: users, businesses, business_members, invitations,
--       business_contexts, business_settings
--
-- Requires PostgreSQL 13+ (gen_random_uuid built-in).
-- All existing Phase 1 tables ("BusinessContext", "Lead") are untouched.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Enum types
-- ---------------------------------------------------------------------------

CREATE TYPE "user_role" AS ENUM (
    'APP_ADMIN',
    'BUSINESS_ADMIN'
);

CREATE TYPE "business_status" AS ENUM (
    'pending_setup',
    'active',
    'disabled'
);

CREATE TYPE "member_role" AS ENUM (
    'admin',
    'viewer'
);

CREATE TYPE "invitation_status" AS ENUM (
    'pending',
    'accepted',
    'expired'
);

-- ---------------------------------------------------------------------------
-- 2. users
-- ---------------------------------------------------------------------------

CREATE TABLE "users" (
    "id"            UUID         NOT NULL DEFAULT gen_random_uuid(),
    "name"          VARCHAR(255) NOT NULL,
    "email"         VARCHAR(255) NOT NULL,
    "passwordHash"  VARCHAR(255) NOT NULL,
    "role"          "user_role"  NOT NULL,
    "emailVerified" BOOLEAN      NOT NULL DEFAULT false,
    "createdAt"     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    "updatedAt"     TIMESTAMPTZ  NOT NULL,
    "deletedAt"     TIMESTAMPTZ,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- email is the login identifier — must be globally unique
CREATE UNIQUE INDEX "users_email_key" ON "users" ("email");

-- filter by platform role
CREATE INDEX "users_role_idx" ON "users" ("role");

-- soft-delete queries
CREATE INDEX "users_deletedAt_idx" ON "users" ("deletedAt")
    WHERE "deletedAt" IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 3. businesses
-- ---------------------------------------------------------------------------

CREATE TABLE "businesses" (
    "id"        UUID              NOT NULL DEFAULT gen_random_uuid(),
    "name"      VARCHAR(255)      NOT NULL,
    "website"   VARCHAR(2048)     NOT NULL,
    "status"    "business_status" NOT NULL DEFAULT 'pending_setup',
    "createdAt" TIMESTAMPTZ       NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ       NOT NULL,
    "deletedAt" TIMESTAMPTZ,

    CONSTRAINT "businesses_pkey" PRIMARY KEY ("id")
);

-- App Admin dashboard — list by status
CREATE INDEX "businesses_status_idx"  ON "businesses" ("status");

-- Onboarding dedup — look up by website URL
CREATE INDEX "businesses_website_idx" ON "businesses" ("website");

-- soft-delete filter
CREATE INDEX "businesses_deletedAt_idx" ON "businesses" ("deletedAt")
    WHERE "deletedAt" IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 4. business_members
--    Junction table: User ↔ Business (many-to-many with role per membership)
-- ---------------------------------------------------------------------------

CREATE TABLE "business_members" (
    "id"         UUID          NOT NULL DEFAULT gen_random_uuid(),
    "businessId" UUID          NOT NULL,
    "userId"     UUID          NOT NULL,
    "role"       "member_role" NOT NULL DEFAULT 'admin',
    "createdAt"  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

    CONSTRAINT "business_members_pkey" PRIMARY KEY ("id")
);

-- Prevent duplicate memberships
CREATE UNIQUE INDEX "business_members_businessId_userId_key"
    ON "business_members" ("businessId", "userId");

-- "all members of this business"
CREATE INDEX "business_members_businessId_idx" ON "business_members" ("businessId");

-- "all businesses this user belongs to"
CREATE INDEX "business_members_userId_idx" ON "business_members" ("userId");

ALTER TABLE "business_members"
    ADD CONSTRAINT "business_members_businessId_fkey"
        FOREIGN KEY ("businessId")
        REFERENCES "businesses" ("id")
        ON DELETE CASCADE
        ON UPDATE CASCADE;

ALTER TABLE "business_members"
    ADD CONSTRAINT "business_members_userId_fkey"
        FOREIGN KEY ("userId")
        REFERENCES "users" ("id")
        ON DELETE CASCADE
        ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- 5. invitations
--    businessId is nullable: NULL = business does not exist yet.
--    invitedBy is nullable: SET NULL if the sending admin is later deleted.
-- ---------------------------------------------------------------------------

CREATE TABLE "invitations" (
    "id"           UUID                NOT NULL DEFAULT gen_random_uuid(),
    "email"        VARCHAR(255)        NOT NULL,
    "businessName" VARCHAR(255)        NOT NULL,
    "businessId"   UUID,
    "token"        VARCHAR(255)        NOT NULL,
    "status"       "invitation_status" NOT NULL DEFAULT 'pending',
    "invitedBy"    UUID,
    "expiresAt"    TIMESTAMPTZ         NOT NULL,
    "acceptedAt"   TIMESTAMPTZ,
    "createdAt"    TIMESTAMPTZ         NOT NULL DEFAULT NOW(),

    CONSTRAINT "invitations_pkey" PRIMARY KEY ("id")
);

-- token is the URL secret — must be globally unique
CREATE UNIQUE INDEX "invitations_token_key" ON "invitations" ("token");

-- "has this email already been invited?" lookup
CREATE INDEX "invitations_email_idx"     ON "invitations" ("email");

-- list pending / filter by lifecycle
CREATE INDEX "invitations_status_idx"    ON "invitations" ("status");

-- background job: mark expired tokens
CREATE INDEX "invitations_expiresAt_idx" ON "invitations" ("expiresAt");

-- Partial unique: only one pending invitation per email at a time
-- (application-layer guard; enforce in service before INSERT)
-- CREATE UNIQUE INDEX "invitations_pending_email_key"
--     ON "invitations" ("email") WHERE "status" = 'pending';

ALTER TABLE "invitations"
    ADD CONSTRAINT "invitations_invitedBy_fkey"
        FOREIGN KEY ("invitedBy")
        REFERENCES "users" ("id")
        ON DELETE SET NULL
        ON UPDATE CASCADE;

ALTER TABLE "invitations"
    ADD CONSTRAINT "invitations_businessId_fkey"
        FOREIGN KEY ("businessId")
        REFERENCES "businesses" ("id")
        ON DELETE SET NULL
        ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- 6. business_contexts
--    Versioned scraped knowledge per business.
--    isCurrent = true marks the context the AI is actively using.
--    Enforce one active context per business at the application layer
--    (wrap the SET isCurrent=true in a transaction with UPDATE … SET false first).
-- ---------------------------------------------------------------------------

CREATE TABLE "business_contexts" (
    "id"          UUID          NOT NULL DEFAULT gen_random_uuid(),
    "businessId"  UUID          NOT NULL,
    "title"       VARCHAR(512)  NOT NULL,
    "description" TEXT,
    "websiteUrl"  VARCHAR(2048) NOT NULL,
    "content"     TEXT          NOT NULL,
    "isCurrent"   BOOLEAN       NOT NULL DEFAULT false,
    "scrapedAt"   TIMESTAMPTZ   NOT NULL,
    "updatedAt"   TIMESTAMPTZ   NOT NULL,

    CONSTRAINT "business_contexts_pkey" PRIMARY KEY ("id")
);

-- all contexts for a business
CREATE INDEX "business_contexts_businessId_idx"
    ON "business_contexts" ("businessId");

-- fast active-context lookup: WHERE businessId = $1 AND isCurrent = true
CREATE INDEX "business_contexts_businessId_isCurrent_idx"
    ON "business_contexts" ("businessId", "isCurrent");

-- order by recency
CREATE INDEX "business_contexts_scrapedAt_idx"
    ON "business_contexts" ("scrapedAt");

ALTER TABLE "business_contexts"
    ADD CONSTRAINT "business_contexts_businessId_fkey"
        FOREIGN KEY ("businessId")
        REFERENCES "businesses" ("id")
        ON DELETE CASCADE
        ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- 7. business_settings
--    Exactly one row per business (enforced by UNIQUE on businessId).
--    businessHours stored as JSONB for flexible schedule representation.
-- ---------------------------------------------------------------------------

CREATE TABLE "business_settings" (
    "id"              UUID         NOT NULL DEFAULT gen_random_uuid(),
    "businessId"      UUID         NOT NULL,
    "aiPersonaName"   VARCHAR(100) NOT NULL DEFAULT 'Auri',
    "greeting"        TEXT,
    "tone"            VARCHAR(50)  NOT NULL DEFAULT 'professional',
    "language"        VARCHAR(10)  NOT NULL DEFAULT 'en',
    "businessHours"   JSONB,
    "escalationPhone" VARCHAR(50),
    "createdAt"       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    "updatedAt"       TIMESTAMPTZ  NOT NULL,

    CONSTRAINT "business_settings_pkey" PRIMARY KEY ("id")
);

-- one-to-one with businesses
CREATE UNIQUE INDEX "business_settings_businessId_key"
    ON "business_settings" ("businessId");

ALTER TABLE "business_settings"
    ADD CONSTRAINT "business_settings_businessId_fkey"
        FOREIGN KEY ("businessId")
        REFERENCES "businesses" ("id")
        ON DELETE CASCADE
        ON UPDATE CASCADE;
