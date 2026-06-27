-- Drop FK constraints added by 20260627170000_project_leadership_roles.
-- These are plain string fields that also hold "not-needed" sentinel values,
-- so FK constraints are invalid and cause project creation to fail.
ALTER TABLE "projects"
    DROP CONSTRAINT IF EXISTS "projects_seniorInsideId_fkey",
    DROP CONSTRAINT IF EXISTS "projects_projectManagerId_fkey",
    DROP CONSTRAINT IF EXISTS "projects_insidePMId_fkey";

-- Update app_settings defaults with the actual user IDs from the users table
-- (the M12 migration seeded placeholder IDs that may not match the live DB).
UPDATE "app_settings"
SET    "value" = to_jsonb(u.id)
FROM   "users" u
WHERE  "app_settings"."key" = 'default_senior_inside_id'
  AND  lower(u.name) LIKE '%sandra%verissimo%';

UPDATE "app_settings"
SET    "value" = to_jsonb(u.id)
FROM   "users" u
WHERE  "app_settings"."key" = 'default_inside_pm_id'
  AND  lower(u.name) LIKE '%alex%behan%';
