-- AlterTable
-- Idempotent: these columns may already exist from an earlier `prisma db push`
-- during branch development, so guard each add to avoid error 42701 on re-apply.
ALTER TABLE "sales_opportunities"
  ADD COLUMN IF NOT EXISTS "cwLink"         TEXT,
  ADD COLUMN IF NOT EXISTS "commissionTeam" JSONB,
  ADD COLUMN IF NOT EXISTS "parentOppId"    TEXT;

-- AddForeignKey
-- Postgres has no `ADD CONSTRAINT IF NOT EXISTS`, so add it conditionally.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'sales_opportunities_parentOppId_fkey'
  ) THEN
    ALTER TABLE "sales_opportunities"
      ADD CONSTRAINT "sales_opportunities_parentOppId_fkey"
      FOREIGN KEY ("parentOppId") REFERENCES "sales_opportunities"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
