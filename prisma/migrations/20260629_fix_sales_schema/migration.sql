-- Add missing columns that the Prisma schema requires but the restructure migration omitted

-- 1. companyId on sales_activities (direct company link, separate from opportunityId)
ALTER TABLE sales_activities
  ADD COLUMN IF NOT EXISTS "companyId" TEXT REFERENCES sales_companies(id) ON DELETE SET NULL;

-- 2. closeDate on sales_opportunities
ALTER TABLE sales_opportunities
  ADD COLUMN IF NOT EXISTS "closeDate" TIMESTAMPTZ;

-- 3. Missing indexes
CREATE INDEX IF NOT EXISTS "sales_activities_companyId_idx" ON sales_activities("companyId");
CREATE INDEX IF NOT EXISTS "sales_activities_userId_weekStart_idx" ON sales_activities("userId", "weekStart");
CREATE INDEX IF NOT EXISTS "sales_activities_weekStart_idx" ON sales_activities("weekStart");
