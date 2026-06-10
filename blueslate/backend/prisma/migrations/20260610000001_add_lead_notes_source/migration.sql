-- AlterTable: add notes and source columns to Lead
ALTER TABLE "Lead" ADD COLUMN "notes" TEXT;
ALTER TABLE "Lead" ADD COLUMN "source" VARCHAR(100);
