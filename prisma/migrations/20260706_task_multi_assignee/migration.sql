-- CreateTable: implementation_task_assignees (composite PK, no separate id column)
CREATE TABLE "implementation_task_assignees" (
    "task_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    CONSTRAINT "implementation_task_assignees_pkey" PRIMARY KEY ("task_id","user_id")
);

-- AddForeignKey
ALTER TABLE "implementation_task_assignees" ADD CONSTRAINT "implementation_task_assignees_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "implementation_tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "implementation_task_assignees" ADD CONSTRAINT "implementation_task_assignees_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill: migrate every task that already has a single assignee_id into the join table
INSERT INTO "implementation_task_assignees" ("task_id", "user_id")
SELECT "id", "assignee_id"
FROM "implementation_tasks"
WHERE "assignee_id" IS NOT NULL
ON CONFLICT DO NOTHING;
