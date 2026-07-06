-- Add "Not Needed" override flag to equipment rows.
-- When set, the row is excluded from procurement progress calculations so it doesn't
-- count against completion percent. Status is derived as "Not Needed" in the app layer.
ALTER TABLE "equipment_rows" ADD COLUMN IF NOT EXISTS "notNeeded" BOOLEAN NOT NULL DEFAULT FALSE;
