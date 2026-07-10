-- Remove the FK from org_position_assignments → users so the Org Chart module
-- has zero DB-level coupling to the users table.
-- user_id is now a plain TEXT column; user data is fetched via separate query.
-- Dropping these FK constraints does NOT affect the users table in any way.

ALTER TABLE "org_position_assignments"
  DROP CONSTRAINT IF EXISTS "org_position_assignments_user_id_fkey";
