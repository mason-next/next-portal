-- Allow users to "remove" template steps without reconciliation re-adding them.
-- isExcluded=true means the step is soft-deleted: hidden from the UI and skipped
-- by reconcileTemplateStepsDb so it won't be re-seeded on the next fetch.

ALTER TABLE "workflow_steps"
    ADD COLUMN IF NOT EXISTS "is_excluded" BOOLEAN NOT NULL DEFAULT FALSE;
