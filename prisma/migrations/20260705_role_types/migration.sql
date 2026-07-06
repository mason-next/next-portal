-- Add roleTypes array to users — the new source-of-truth for permission assignment.
-- accountType and roleType columns are kept for DB backward compat (old data, not app logic).
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "roleTypes" TEXT[] NOT NULL DEFAULT '{}';

-- Populate roleTypes by normalizing legacy accountType + roleType values.
-- Administrator accountType users get their roleType + "Administrator".
-- All other users get their normalized roleType only.
UPDATE "users"
SET "roleTypes" = CASE
  WHEN "accountType"::text = 'Administrator' THEN
    CASE
      WHEN "roleType"::text IN ('Sales', 'Salesperson') THEN ARRAY['Sales', 'Administrator']
      WHEN "roleType"::text IN ('Engineering', 'Engineer') THEN ARRAY['Engineering', 'Administrator']
      WHEN "roleType"::text IN ('ProjectManagement', 'ProjectManager') THEN ARRAY['ProjectManagement', 'Administrator']
      WHEN "roleType"::text IN ('Management', 'Executive', 'Operations', 'HR', 'Other') THEN ARRAY['Management', 'Administrator']
      WHEN "roleType"::text IN ('Installation', 'Technician', 'FieldTechnician') THEN ARRAY['Installation', 'Administrator']
      WHEN "roleType"::text = 'Finance' THEN ARRAY['Finance', 'Administrator']
      WHEN "roleType"::text = 'Customer' THEN ARRAY['Customer', 'Administrator']
      WHEN "roleType"::text IN ('Subcontractor', 'Vendor') THEN ARRAY['Subcontractor', 'Administrator']
      ELSE ARRAY['Management', 'Administrator']
    END
  ELSE
    CASE
      WHEN "roleType"::text IN ('Sales', 'Salesperson') THEN ARRAY['Sales']
      WHEN "roleType"::text IN ('Engineering', 'Engineer') THEN ARRAY['Engineering']
      WHEN "roleType"::text IN ('ProjectManagement', 'ProjectManager') THEN ARRAY['ProjectManagement']
      WHEN "roleType"::text IN ('Management', 'Executive', 'Operations', 'HR', 'Other') THEN ARRAY['Management']
      WHEN "roleType"::text IN ('Installation', 'Technician', 'FieldTechnician') THEN ARRAY['Installation']
      WHEN "roleType"::text = 'Finance' THEN ARRAY['Finance']
      WHEN "roleType"::text = 'Customer' THEN ARRAY['Customer']
      WHEN "roleType"::text IN ('Subcontractor', 'Vendor') THEN ARRAY['Subcontractor']
      ELSE ARRAY['Management']
    END
END
WHERE "roleTypes" = '{}';
