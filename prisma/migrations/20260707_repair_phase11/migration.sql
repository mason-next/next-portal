-- Phase 11 repair migration: idempotent application of all Phase 11 schema changes.
--
-- Background: 20260706_bom_status_update was blocked by a PostgreSQL restriction
-- (ALTER TYPE ADD VALUE used alongside UPDATE statements in the same transaction),
-- which prevented all subsequent 20260706_* migrations from running on Railway.
-- Additionally, 20260706_task_multi_assignee had a bug referencing "assignee_id"
-- instead of the actual column name "assigneeId".
--
-- railway.toml resolves both failed/buggy migrations as applied, then this migration
-- runs to create all missing tables and columns idempotently.

-- ============================================================
-- 1. BomStatus enum: add new values
-- (Prisma runs ADD VALUE outside the transaction automatically)
-- ============================================================
ALTER TYPE "BomStatus" ADD VALUE IF NOT EXISTS 'Not Reviewed';
ALTER TYPE "BomStatus" ADD VALUE IF NOT EXISTS 'Pending Verification';
ALTER TYPE "BomStatus" ADD VALUE IF NOT EXISTS 'Swap/Replace';

-- ============================================================
-- 2. Migrate existing BOM data + update column default
-- Uses ::text comparison so it is safe even if old enum values
-- were removed from the type at some point.
-- ============================================================
UPDATE "bom_rows" SET status = 'Not Reviewed'::"BomStatus"         WHERE status::text = 'Pending Review';
UPDATE "bom_rows" SET status = 'Pending Verification'::"BomStatus" WHERE status::text = 'Update Needed';
UPDATE "bom_rows" SET status = 'Not Reviewed'::"BomStatus"         WHERE status IS NULL;
ALTER TABLE "bom_rows" ALTER COLUMN "status" SET DEFAULT 'Not Reviewed'::"BomStatus";

-- ============================================================
-- 3. equipment_rows.notNeeded column
-- ============================================================
ALTER TABLE "equipment_rows" ADD COLUMN IF NOT EXISTS "notNeeded" BOOLEAN NOT NULL DEFAULT FALSE;

-- ============================================================
-- 4. meeting_notes table
-- ============================================================
CREATE TABLE IF NOT EXISTS "meeting_notes" (
    "id"            TEXT NOT NULL,
    "projectId"     TEXT NOT NULL,
    "title"         TEXT NOT NULL,
    "meetingDate"   TIMESTAMP(3) NOT NULL,
    "attendees"     TEXT NOT NULL DEFAULT '',
    "body"          TEXT NOT NULL DEFAULT '',
    "actionItems"   TEXT NOT NULL DEFAULT '',
    "createdById"   TEXT,
    "createdByName" TEXT,
    "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "meeting_notes_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "meeting_notes_projectId_idx" ON "meeting_notes"("projectId");

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_schema = 'public' AND constraint_name = 'meeting_notes_projectId_fkey'
  ) THEN
    ALTER TABLE "meeting_notes"
      ADD CONSTRAINT "meeting_notes_projectId_fkey"
      FOREIGN KEY ("projectId") REFERENCES "projects"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- ============================================================
-- 5. workflow_steps.is_excluded column
-- ============================================================
ALTER TABLE "workflow_steps" ADD COLUMN IF NOT EXISTS "is_excluded" BOOLEAN NOT NULL DEFAULT FALSE;

-- ============================================================
-- 6. implementation_tasks calendar columns
-- ============================================================
ALTER TABLE "implementation_tasks" ADD COLUMN IF NOT EXISTS "calendarScheduledAt" TIMESTAMP(3);
ALTER TABLE "implementation_tasks" ADD COLUMN IF NOT EXISTS "calendarEventUrl"    TEXT;

-- ============================================================
-- 7. implementation_task_assignees join table
-- The 20260706_task_multi_assignee migration had a bug: it used "assignee_id"
-- (snake_case) in the backfill SELECT, but the column is "assigneeId" (camelCase).
-- This migration creates the table and backfills correctly.
-- ============================================================
CREATE TABLE IF NOT EXISTS "implementation_task_assignees" (
    "task_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    CONSTRAINT "implementation_task_assignees_pkey" PRIMARY KEY ("task_id","user_id")
);

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_schema = 'public' AND constraint_name = 'implementation_task_assignees_task_id_fkey'
  ) THEN
    ALTER TABLE "implementation_task_assignees"
      ADD CONSTRAINT "implementation_task_assignees_task_id_fkey"
      FOREIGN KEY ("task_id") REFERENCES "implementation_tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_schema = 'public' AND constraint_name = 'implementation_task_assignees_user_id_fkey'
  ) THEN
    ALTER TABLE "implementation_task_assignees"
      ADD CONSTRAINT "implementation_task_assignees_user_id_fkey"
      FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- Backfill: migrate each task's existing single assignee into the join table.
-- Uses "assigneeId" (the correct camelCase column name), not "assignee_id".
INSERT INTO "implementation_task_assignees" ("task_id", "user_id")
SELECT "id", "assigneeId"
FROM "implementation_tasks"
WHERE "assigneeId" IS NOT NULL
ON CONFLICT DO NOTHING;

-- ============================================================
-- 8. task_template_groups / items / subtasks tables
-- ============================================================
CREATE TABLE IF NOT EXISTS "task_template_groups" (
    "id"           TEXT NOT NULL,
    "name"         TEXT NOT NULL,
    "stepKey"      TEXT NOT NULL,
    "description"  TEXT NOT NULL DEFAULT '',
    "projectTypes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "sortOrder"    INTEGER NOT NULL DEFAULT 0,
    "isBuiltIn"    BOOLEAN NOT NULL DEFAULT false,
    "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "task_template_groups_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "task_template_items" (
    "id"          TEXT NOT NULL,
    "groupId"     TEXT NOT NULL,
    "title"       TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "sortOrder"   INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "task_template_items_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "task_template_subtasks" (
    "id"        TEXT NOT NULL,
    "taskId"    TEXT NOT NULL,
    "title"     TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "task_template_subtasks_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "task_template_groups_stepKey_idx"            ON "task_template_groups"("stepKey");
CREATE INDEX IF NOT EXISTS "task_template_items_groupId_sortOrder_idx"   ON "task_template_items"("groupId", "sortOrder");
CREATE INDEX IF NOT EXISTS "task_template_subtasks_taskId_sortOrder_idx" ON "task_template_subtasks"("taskId", "sortOrder");

ALTER TABLE "task_template_items" DROP CONSTRAINT IF EXISTS "task_template_items_groupId_fkey";
ALTER TABLE "task_template_items" ADD CONSTRAINT "task_template_items_groupId_fkey"
  FOREIGN KEY ("groupId") REFERENCES "task_template_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "task_template_subtasks" DROP CONSTRAINT IF EXISTS "task_template_subtasks_taskId_fkey";
ALTER TABLE "task_template_subtasks" ADD CONSTRAINT "task_template_subtasks_taskId_fkey"
  FOREIGN KEY ("taskId") REFERENCES "task_template_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================================
-- 9. technical_kickoffs table
-- ============================================================
CREATE TABLE IF NOT EXISTS "technical_kickoffs" (
    "id"          TEXT NOT NULL,
    "projectId"   TEXT NOT NULL,
    "subject"     TEXT NOT NULL,
    "agenda"      TEXT NOT NULL,
    "attendees"   TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "startTime"   TIMESTAMP(3) NOT NULL,
    "endTime"     TIMESTAMP(3) NOT NULL,
    "scheduledBy" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "technical_kickoffs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "technical_kickoffs_projectId_key" ON "technical_kickoffs"("projectId");

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_schema = 'public' AND constraint_name = 'technical_kickoffs_projectId_fkey'
  ) THEN
    ALTER TABLE "technical_kickoffs"
      ADD CONSTRAINT "technical_kickoffs_projectId_fkey"
      FOREIGN KEY ("projectId") REFERENCES "projects"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
