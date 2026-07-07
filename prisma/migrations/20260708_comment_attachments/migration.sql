-- Add attachments JSON column to task comments and project activity rows.
-- Idempotent: ADD COLUMN IF NOT EXISTS so re-running is safe.
ALTER TABLE "implementation_task_comments"
  ADD COLUMN IF NOT EXISTS "attachments" JSONB NOT NULL DEFAULT '[]'::JSONB;

ALTER TABLE "project_activities"
  ADD COLUMN IF NOT EXISTS "attachments" JSONB NOT NULL DEFAULT '[]'::JSONB;
