-- Expand subcontractors table with contact info, location, manpower, reach, rating, notes
ALTER TABLE "subcontractors"
    ADD COLUMN IF NOT EXISTS "contactName"        TEXT NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS "contactEmail"       TEXT NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS "contactPhone"       TEXT NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS "location"           TEXT NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS "manpower"           INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS "geographicalReach"  TEXT NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS "rating"             DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS "notes"              TEXT NOT NULL DEFAULT '';
