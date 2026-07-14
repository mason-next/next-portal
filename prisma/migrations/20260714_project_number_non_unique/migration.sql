-- Project numbers are user-supplied codes (e.g. "26-1054") and are NOT system identifiers.
-- Multiple projects can share the same number or have no number at all.
-- Drop the unique constraint so blank project numbers don't conflict.
DROP INDEX IF EXISTS "Project_projectNumber_key";
