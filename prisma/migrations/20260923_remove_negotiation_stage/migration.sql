-- "Negotiation" is not a stage in our sales workflow. Move any deals in it back to
-- Proposal (recording the move in the customer history) and drop the enum value.

INSERT INTO "sales_audit_logs" ("id", "entityType", "entityId", "companyId", "opportunityId", "action", "field", "oldValue", "newValue", "userName")
SELECT 'mig_neg_' || o."id", 'opportunity', o."id", o."companyId", o."id", 'stage_changed', 'stage', 'Negotiation', 'Proposal', 'System'
FROM "sales_opportunities" o
WHERE o."stage" = 'Negotiation';

UPDATE "sales_opportunities" SET "stage" = 'Proposal' WHERE "stage" = 'Negotiation';

-- Postgres can't drop an enum value in place; recreate the type without it.
ALTER TYPE "OppStage" RENAME TO "OppStage_old";
CREATE TYPE "OppStage" AS ENUM ('Prospecting', 'Qualifying', 'Proposal', 'Closed Won', 'Closed Lost');
ALTER TABLE "sales_opportunities" ALTER COLUMN "stage" DROP DEFAULT;
ALTER TABLE "sales_opportunities" ALTER COLUMN "stage" TYPE "OppStage" USING ("stage"::text::"OppStage");
ALTER TABLE "sales_opportunities" ALTER COLUMN "stage" SET DEFAULT 'Prospecting';
DROP TYPE "OppStage_old";
