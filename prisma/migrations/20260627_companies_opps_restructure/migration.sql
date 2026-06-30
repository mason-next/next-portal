-- Rename LogoStage enum to OppStage
ALTER TYPE "LogoStage" RENAME TO "OppStage";

-- Create sales_companies from existing sales_logos
CREATE TABLE sales_companies (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  domain      TEXT NOT NULL DEFAULT '',
  notes       TEXT NOT NULL DEFAULT '',
  "dealDeskId" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO sales_companies (id, name, domain, notes, "dealDeskId", "createdAt", "updatedAt")
SELECT id, company, domain, notes, "dealDeskId", "createdAt", "updatedAt"
FROM sales_logos;

-- Create sales_opportunities (one default per company, inheriting stage/owner)
CREATE TABLE sales_opportunities (
  id            TEXT PRIMARY KEY,
  "companyId"   TEXT NOT NULL REFERENCES sales_companies(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  stage         "OppStage" NOT NULL DEFAULT 'Prospecting',
  "ownerId"     TEXT,
  "ownerName"   TEXT NOT NULL DEFAULT '',
  value         INTEGER NOT NULL DEFAULT 0,
  notes         TEXT NOT NULL DEFAULT '',
  "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX "sales_opportunities_companyId_idx" ON sales_opportunities("companyId");

INSERT INTO sales_opportunities (id, "companyId", name, stage, "ownerId", "ownerName", "createdAt", "updatedAt")
SELECT
  'opp_' || id,
  id,
  company,
  stage,
  "ownerId",
  "ownerName",
  "createdAt",
  "updatedAt"
FROM sales_logos;

-- Update sales_activities: add new columns
ALTER TABLE sales_activities
  ADD COLUMN "opportunityId" TEXT REFERENCES sales_opportunities(id) ON DELETE SET NULL,
  ADD COLUMN contacts        JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN "aiGenerated"   BOOLEAN NOT NULL DEFAULT false;

-- Migrate logoId → opportunityId
UPDATE sales_activities sa
SET "opportunityId" = 'opp_' || sl.id
FROM sales_logos sl
WHERE sa."logoId" = sl.id;

-- Drop old columns from activities
ALTER TABLE sales_activities
  DROP COLUMN "logoId",
  DROP COLUMN "durationMins";

-- Drop old table
DROP TABLE sales_logos;
