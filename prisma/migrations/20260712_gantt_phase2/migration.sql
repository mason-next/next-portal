-- Add per-entry scheduling mode to gantt_entries.
-- "manual" = user explicitly sets dates; "auto" = start cascades from FS predecessors.
ALTER TABLE "gantt_entries" ADD COLUMN "scheduleMode" TEXT NOT NULL DEFAULT 'manual';

-- Gantt dependency relationships (Finish-to-Start, Start-to-Start, etc.).
-- Lives in the Gantt layer, not coupled to ImplementationTaskDep or WorkflowStep.dependsOnKeys.
CREATE TABLE "gantt_dependencies" (
    "id"          TEXT NOT NULL,
    "projectId"   TEXT NOT NULL,
    "fromEntryId" TEXT NOT NULL,
    "toEntryId"   TEXT NOT NULL,
    "type"        TEXT NOT NULL DEFAULT 'FS',
    "lagDays"     INTEGER NOT NULL DEFAULT 0,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gantt_dependencies_pkey" PRIMARY KEY ("id")
);

-- One dependency per ordered pair of entries
CREATE UNIQUE INDEX "gantt_dependencies_fromEntryId_toEntryId_key"
    ON "gantt_dependencies"("fromEntryId", "toEntryId");

CREATE INDEX "gantt_dependencies_projectId_idx" ON "gantt_dependencies"("projectId");

ALTER TABLE "gantt_dependencies"
    ADD CONSTRAINT "gantt_dependencies_projectId_fkey"
        FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "gantt_dependencies"
    ADD CONSTRAINT "gantt_dependencies_fromEntryId_fkey"
        FOREIGN KEY ("fromEntryId") REFERENCES "gantt_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "gantt_dependencies"
    ADD CONSTRAINT "gantt_dependencies_toEntryId_fkey"
        FOREIGN KEY ("toEntryId") REFERENCES "gantt_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;
