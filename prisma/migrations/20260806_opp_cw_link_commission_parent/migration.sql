-- AlterTable
ALTER TABLE "sales_opportunities"
  ADD COLUMN "cwLink"         TEXT,
  ADD COLUMN "commissionTeam" JSONB,
  ADD COLUMN "parentOppId"    TEXT;

-- AddForeignKey
ALTER TABLE "sales_opportunities" ADD CONSTRAINT "sales_opportunities_parentOppId_fkey" FOREIGN KEY ("parentOppId") REFERENCES "sales_opportunities"("id") ON DELETE SET NULL ON UPDATE CASCADE;
