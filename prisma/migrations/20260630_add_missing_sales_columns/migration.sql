-- Replacement for the failed 20260629_fix_sales_schema migration.
-- That migration failed because it referenced sales_companies before it existed.
-- This version uses IF NOT EXISTS throughout and omits the FK constraint.

ALTER TABLE sales_activities
  ADD COLUMN IF NOT EXISTS "companyId" TEXT;

ALTER TABLE sales_opportunities
  ADD COLUMN IF NOT EXISTS "closeDate" TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS "sales_activities_companyId_idx"        ON sales_activities("companyId");
CREATE INDEX IF NOT EXISTS "sales_activities_userId_weekStart_idx" ON sales_activities("userId", "weekStart");
CREATE INDEX IF NOT EXISTS "sales_activities_weekStart_idx"        ON sales_activities("weekStart");
