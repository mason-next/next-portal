-- Add startDate to workflow_steps (Gantt scheduling needs both start and end per step).
-- Nullable — existing steps without a start date show as "Unscheduled" in the Gantt.
ALTER TABLE "workflow_steps" ADD COLUMN "startDate" TIMESTAMP(3);

-- Gantt schedule entries: tracks which workflow items the user has added to the Gantt.
-- A step or task can be in the Gantt at most once per project.
-- Deleting a GanttEntry only removes the scheduling representation; the workflow item is untouched.
CREATE TABLE "gantt_entries" (
    "id"              TEXT NOT NULL,
    "projectId"       TEXT NOT NULL,
    "workflowStepId"  TEXT,
    "taskId"          TEXT,
    "customerVisible" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder"       INTEGER NOT NULL DEFAULT 0,
    "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gantt_entries_pkey" PRIMARY KEY ("id")
);

-- Each workflow step can appear in the Gantt at most once
CREATE UNIQUE INDEX "gantt_entries_workflowStepId_key"
    ON "gantt_entries"("workflowStepId") WHERE "workflowStepId" IS NOT NULL;

-- Each task can appear in the Gantt at most once
CREATE UNIQUE INDEX "gantt_entries_taskId_key"
    ON "gantt_entries"("taskId") WHERE "taskId" IS NOT NULL;

-- Fast project-scoped lookup
CREATE INDEX "gantt_entries_projectId_idx" ON "gantt_entries"("projectId");

ALTER TABLE "gantt_entries"
    ADD CONSTRAINT "gantt_entries_projectId_fkey"
        FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "gantt_entries"
    ADD CONSTRAINT "gantt_entries_workflowStepId_fkey"
        FOREIGN KEY ("workflowStepId") REFERENCES "workflow_steps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "gantt_entries"
    ADD CONSTRAINT "gantt_entries_taskId_fkey"
        FOREIGN KEY ("taskId") REFERENCES "implementation_tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
