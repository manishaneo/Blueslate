-- AlterTable
ALTER TABLE "business_contexts" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "business_members" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "business_settings" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "businesses" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "invitations" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "id" DROP DEFAULT;
