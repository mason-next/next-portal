"use server";

import { db } from "@/lib/db";
import { getServerSession } from "@/lib/auth/server";
import { requireEditPermission } from "@/lib/access-control";
import { STEP_TASK_TEMPLATES } from "./task-template-config";

// Re-export so server-side callers that previously imported from here still work.
export type { TaskTemplate } from "./task-template-config";
export { STEP_TASK_TEMPLATES } from "./task-template-config";

export async function seedStepTasks(
  projectId: string,
  workflowStepId: string,
  stepKey: string
): Promise<{ created: number; skipped: boolean }> {
  await requireEditPermission();
  const session = await getServerSession();

  const templates = STEP_TASK_TEMPLATES[stepKey];
  if (!templates?.length) return { created: 0, skipped: true };

  // Check if tasks already exist for this step to avoid duplicates
  const existing = await db.implementationTask.count({
    where: { projectId, workflowStepId, parentTaskId: null },
  });
  if (existing > 0) return { created: 0, skipped: true };

  // Get current max sortOrder for this project's tasks
  const maxOrder = await db.implementationTask.aggregate({
    where: { projectId, parentTaskId: null },
    _max: { sortOrder: true },
  });
  let nextOrder = (maxOrder._max.sortOrder ?? -1) + 1;

  let created = 0;
  for (const template of templates) {
    const parent = await db.implementationTask.create({
      data: {
        projectId,
        isPersonal: false,
        title: template.title,
        description: template.description ?? "",
        status: "NotStarted",
        priority: "Medium",
        percentComplete: 0,
        createdById: session?.id ?? null,
        workflowStepId,
        sortOrder: nextOrder++,
        notes: "",
        tags: [],
        parentTaskId: null,
      } as Parameters<typeof db.implementationTask.create>[0]["data"],
    });

    if (template.subtasks?.length) {
      let subOrder = 0;
      for (const subtaskTitle of template.subtasks) {
        await db.implementationTask.create({
          data: {
            projectId,
            isPersonal: false,
            title: subtaskTitle,
            description: "",
            status: "NotStarted",
            priority: "Medium",
            percentComplete: 0,
            createdById: session?.id ?? null,
            workflowStepId,
            sortOrder: subOrder++,
            notes: "",
            tags: [],
            parentTaskId: parent.id,
          } as Parameters<typeof db.implementationTask.create>[0]["data"],
        });
      }
    }
    created++;
  }

  return { created, skipped: false };
}
