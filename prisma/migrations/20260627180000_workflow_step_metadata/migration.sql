-- Dynamic Workflow Steps (M13): description, dependencies, completion rules

ALTER TABLE "workflow_steps"
    ADD COLUMN IF NOT EXISTS "description"    TEXT         NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS "dependsOnKeys"  TEXT[]       DEFAULT ARRAY[]::TEXT[],
    ADD COLUMN IF NOT EXISTS "completionRule" TEXT         NOT NULL DEFAULT 'manual';
