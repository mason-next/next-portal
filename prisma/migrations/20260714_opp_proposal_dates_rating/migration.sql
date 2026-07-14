-- AlterTable
ALTER TABLE "sales_opportunities"
  ADD COLUMN "proposal_created_at" TIMESTAMP(3),
  ADD COLUMN "rating"              TEXT;
