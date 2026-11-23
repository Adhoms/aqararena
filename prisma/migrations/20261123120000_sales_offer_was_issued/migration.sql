-- «ملفي» counts the offers a salesperson issued: those that went out at once or on approval, even if
-- cancelled later, and not those rejected while waiting for approval. The status alone can't tell a
-- cancelled issued offer from a rejected one, so the issue is recorded once, here.

-- AlterTable
ALTER TABLE "SalesOffer" ADD COLUMN "wasIssued" BOOLEAN NOT NULL DEFAULT false;

-- Backfill: issued offers, and cancelled ones a team lead had approved. A cancelled offer issued
-- without approval can't be told apart from a rejected one; offers aren't live yet, so none exist.
UPDATE "SalesOffer" SET "wasIssued" = true WHERE "status" = 'ISSUED' OR "approvedAt" IS NOT NULL;
