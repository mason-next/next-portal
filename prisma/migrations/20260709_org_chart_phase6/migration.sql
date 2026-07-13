-- Phase 6: Compensation & Budget fields on org_positions
ALTER TABLE "org_positions"
  ADD COLUMN "salary_min"    DOUBLE PRECISION,
  ADD COLUMN "salary_mid"    DOUBLE PRECISION,
  ADD COLUMN "salary_max"    DOUBLE PRECISION,
  ADD COLUMN "pay_frequency" TEXT NOT NULL DEFAULT 'annual',
  ADD COLUMN "budget_status" TEXT NOT NULL DEFAULT 'budgeted';
