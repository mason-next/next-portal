-- BOM status update: add new pre-procurement review statuses and migrate existing data.
-- Old values (Pending Review, Update Needed) are kept in the DB enum for compatibility
-- but no rows will have those values after this migration runs.

-- Add new enum values
ALTER TYPE "BomStatus" ADD VALUE IF NOT EXISTS 'Not Reviewed';
ALTER TYPE "BomStatus" ADD VALUE IF NOT EXISTS 'Pending Verification';
ALTER TYPE "BomStatus" ADD VALUE IF NOT EXISTS 'Swap/Replace';

-- Migrate existing data to new values
UPDATE "bom_rows" SET status = 'Not Reviewed'::"BomStatus"         WHERE status = 'Pending Review'::"BomStatus";
UPDATE "bom_rows" SET status = 'Pending Verification'::"BomStatus" WHERE status = 'Update Needed'::"BomStatus";

-- Also handle any NULL or unmapped statuses (shouldn't exist but defensive)
UPDATE "bom_rows" SET status = 'Not Reviewed'::"BomStatus" WHERE status IS NULL;

-- Update column default to Not Reviewed
ALTER TABLE "bom_rows" ALTER COLUMN "status" SET DEFAULT 'Not Reviewed'::"BomStatus";
