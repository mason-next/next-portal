-- Add tag column to project_activities for General/Status classification.
-- Defaults to "General" so all existing rows are treated as ordinary comments.
ALTER TABLE "project_activities" ADD COLUMN "tag" TEXT NOT NULL DEFAULT 'General';
