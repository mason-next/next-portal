-- Idempotent repair for gantt schema.
-- The original migrations (20260712_gantt_rebuild and 20260712_gantt_phase2) may have
-- partially applied or failed entirely because the startDate column was added manually
-- before those migrations ran, causing ALTER TABLE to error on "column already exists".
-- This migration recreates everything safely using IF NOT EXISTS guards.

-- 1. startDate on workflow_steps (no-op if already exists from the manual hotfix)
ALTER TABLE "workflow_steps" ADD COLUMN IF NOT EXISTS "startDate" TIMESTAMP(3);

-- 2. gantt_entries table
CREATE TABLE IF NOT EXISTS "gantt_entries" (
    "id"              TEXT        NOT NULL,
    "projectId"       TEXT        NOT NULL,
    "workflowStepId"  TEXT,
    "taskId"          TEXT,
    "customerVisible" BOOLEAN     NOT NULL DEFAULT true,
    "sortOrder"       INTEGER     NOT NULL DEFAULT 0,
    "scheduleMode"    TEXT        NOT NULL DEFAULT 'manual',
    "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "gantt_entries_pkey" PRIMARY KEY ("id")
);

-- 3. scheduleMode column (no-op if gantt_entries was just created above with the column)
ALTER TABLE "gantt_entries" ADD COLUMN IF NOT EXISTS "scheduleMode" TEXT NOT NULL DEFAULT 'manual';

-- 4. Indexes on gantt_entries
CREATE UNIQUE INDEX IF NOT EXISTS "gantt_entries_workflowStepId_key"
    ON "gantt_entries"("workflowStepId") WHERE "workflowStepId" IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "gantt_entries_taskId_key"
    ON "gantt_entries"("taskId") WHERE "taskId" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "gantt_entries_projectId_idx"
    ON "gantt_entries"("projectId");

-- 5. FK constraints on gantt_entries (skipped if already present)
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'gantt_entries_projectId_fkey') THEN
        ALTER TABLE "gantt_entries"
            ADD CONSTRAINT "gantt_entries_projectId_fkey"
            FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'gantt_entries_workflowStepId_fkey') THEN
        ALTER TABLE "gantt_entries"
            ADD CONSTRAINT "gantt_entries_workflowStepId_fkey"
            FOREIGN KEY ("workflowStepId") REFERENCES "workflow_steps"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'gantt_entries_taskId_fkey') THEN
        ALTER TABLE "gantt_entries"
            ADD CONSTRAINT "gantt_entries_taskId_fkey"
            FOREIGN KEY ("taskId") REFERENCES "implementation_tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- 6. gantt_dependencies table
CREATE TABLE IF NOT EXISTS "gantt_dependencies" (
    "id"          TEXT        NOT NULL,
    "projectId"   TEXT        NOT NULL,
    "fromEntryId" TEXT        NOT NULL,
    "toEntryId"   TEXT        NOT NULL,
    "type"        TEXT        NOT NULL DEFAULT 'FS',
    "lagDays"     INTEGER     NOT NULL DEFAULT 0,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "gantt_dependencies_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "gantt_dependencies_fromEntryId_toEntryId_key"
    ON "gantt_dependencies"("fromEntryId", "toEntryId");

CREATE INDEX IF NOT EXISTS "gantt_dependencies_projectId_idx"
    ON "gantt_dependencies"("projectId");

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'gantt_dependencies_projectId_fkey') THEN
        ALTER TABLE "gantt_dependencies"
            ADD CONSTRAINT "gantt_dependencies_projectId_fkey"
            FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'gantt_dependencies_fromEntryId_fkey') THEN
        ALTER TABLE "gantt_dependencies"
            ADD CONSTRAINT "gantt_dependencies_fromEntryId_fkey"
            FOREIGN KEY ("fromEntryId") REFERENCES "gantt_entries"("id") ON DELETE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'gantt_dependencies_toEntryId_fkey') THEN
        ALTER TABLE "gantt_dependencies"
            ADD CONSTRAINT "gantt_dependencies_toEntryId_fkey"
            FOREIGN KEY ("toEntryId") REFERENCES "gantt_entries"("id") ON DELETE CASCADE;
    END IF;
END $$;
