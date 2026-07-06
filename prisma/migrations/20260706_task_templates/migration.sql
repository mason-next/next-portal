-- CreateTable
CREATE TABLE IF NOT EXISTS "task_template_groups" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "stepKey" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "projectTypes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isBuiltIn" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "task_template_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "task_template_items" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "task_template_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "task_template_subtasks" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "task_template_subtasks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "task_template_groups_stepKey_idx" ON "task_template_groups"("stepKey");
CREATE INDEX IF NOT EXISTS "task_template_items_groupId_sortOrder_idx" ON "task_template_items"("groupId", "sortOrder");
CREATE INDEX IF NOT EXISTS "task_template_subtasks_taskId_sortOrder_idx" ON "task_template_subtasks"("taskId", "sortOrder");

-- AddForeignKey
ALTER TABLE "task_template_items" DROP CONSTRAINT IF EXISTS "task_template_items_groupId_fkey";
ALTER TABLE "task_template_items" ADD CONSTRAINT "task_template_items_groupId_fkey"
    FOREIGN KEY ("groupId") REFERENCES "task_template_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "task_template_subtasks" DROP CONSTRAINT IF EXISTS "task_template_subtasks_taskId_fkey";
ALTER TABLE "task_template_subtasks" ADD CONSTRAINT "task_template_subtasks_taskId_fkey"
    FOREIGN KEY ("taskId") REFERENCES "task_template_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
