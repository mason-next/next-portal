-- Add flag to distinguish "Not Needed" from "Not Yet Assigned" for technicians
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "technicianNotNeeded" BOOLEAN NOT NULL DEFAULT FALSE;
