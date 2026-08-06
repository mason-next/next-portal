-- Create org_divisions table
CREATE TABLE IF NOT EXISTS "org_divisions" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT NOT NULL DEFAULT '#6366f1',
    "status" TEXT NOT NULL DEFAULT 'active',
    "sort_order" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "org_divisions_pkey" PRIMARY KEY ("id")
);

-- Add division_id column to org_departments (safe to run twice — IF NOT EXISTS)
ALTER TABLE "org_departments" ADD COLUMN IF NOT EXISTS "division_id" TEXT;

-- Add foreign key (only if it doesn't already exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'org_departments_division_id_fkey'
  ) THEN
    ALTER TABLE "org_departments"
      ADD CONSTRAINT "org_departments_division_id_fkey"
      FOREIGN KEY ("division_id") REFERENCES "org_divisions"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
