-- Implementation Tasks module: Gantt-ready task management

CREATE TYPE "ImplementationTaskStatus" AS ENUM ('Not Started', 'In Progress', 'Blocked', 'Complete', 'Cancelled');
CREATE TYPE "TaskPriority" AS ENUM ('Low', 'Medium', 'High', 'Critical');

CREATE TABLE "implementation_tasks" (
    "id"              TEXT NOT NULL,
    "projectId"       TEXT NOT NULL,
    "title"           TEXT NOT NULL,
    "description"     TEXT NOT NULL DEFAULT '',
    "status"          "ImplementationTaskStatus" NOT NULL DEFAULT 'Not Started',
    "priority"        "TaskPriority" NOT NULL DEFAULT 'Medium',
    "percentComplete" INTEGER NOT NULL DEFAULT 0,
    "assigneeId"      TEXT,
    "createdById"     TEXT,
    "startDate"       TIMESTAMP(3),
    "dueDate"         TIMESTAMP(3),
    "completedAt"     TIMESTAMP(3),
    "sortOrder"       INTEGER NOT NULL DEFAULT 0,
    "parentTaskId"    TEXT,
    "notes"           TEXT NOT NULL DEFAULT '',
    "tags"            TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"       TIMESTAMP(3) NOT NULL,

    CONSTRAINT "implementation_tasks_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "implementation_task_deps" (
    "id"          TEXT NOT NULL,
    "taskId"      TEXT NOT NULL,
    "dependsOnId" TEXT NOT NULL,

    CONSTRAINT "implementation_task_deps_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "implementation_task_comments" (
    "id"          TEXT NOT NULL,
    "taskId"      TEXT NOT NULL,
    "userId"      TEXT,
    "userName"    TEXT NOT NULL,
    "richContent" JSONB,
    "plainText"   TEXT NOT NULL DEFAULT '',
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL,

    CONSTRAINT "implementation_task_comments_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE INDEX "implementation_tasks_projectId_sortOrder_idx" ON "implementation_tasks"("projectId", "sortOrder");
CREATE INDEX "implementation_tasks_projectId_parentTaskId_idx" ON "implementation_tasks"("projectId", "parentTaskId");
CREATE INDEX "implementation_task_comments_taskId_createdAt_idx" ON "implementation_task_comments"("taskId", "createdAt" DESC);
CREATE UNIQUE INDEX "implementation_task_deps_taskId_dependsOnId_key" ON "implementation_task_deps"("taskId", "dependsOnId");

-- Foreign keys
ALTER TABLE "implementation_tasks"
    ADD CONSTRAINT "implementation_tasks_projectId_fkey"
        FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT "implementation_tasks_assigneeId_fkey"
        FOREIGN KEY ("assigneeId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    ADD CONSTRAINT "implementation_tasks_createdById_fkey"
        FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    ADD CONSTRAINT "implementation_tasks_parentTaskId_fkey"
        FOREIGN KEY ("parentTaskId") REFERENCES "implementation_tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "implementation_task_deps"
    ADD CONSTRAINT "implementation_task_deps_taskId_fkey"
        FOREIGN KEY ("taskId") REFERENCES "implementation_tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT "implementation_task_deps_dependsOnId_fkey"
        FOREIGN KEY ("dependsOnId") REFERENCES "implementation_tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "implementation_task_comments"
    ADD CONSTRAINT "implementation_task_comments_taskId_fkey"
        FOREIGN KEY ("taskId") REFERENCES "implementation_tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT "implementation_task_comments_userId_fkey"
        FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
