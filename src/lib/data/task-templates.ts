"use server";

import { db } from "@/lib/db";
import { getServerSession } from "@/lib/auth/server";
import { requireEditPermission } from "@/lib/access-control";
import { STEP_TASK_TEMPLATES } from "./task-template-config";

export interface SelectedTask {
  title: string;
  description: string;
  subtasks: string[];
}

// Checks whether tasks already exist for a workflow step (root-level only).
export async function stepHasTasks(projectId: string, workflowStepId: string): Promise<boolean> {
  const count = await db.implementationTask.count({
    where: { projectId, workflowStepId, parentTaskId: null },
  });
  return count > 0;
}

// Seeds tasks for a workflow step from either:
// 1. DB-stored templates (if any exist for the stepKey)
// 2. Hardcoded STEP_TASK_TEMPLATES fallback
// When selectedTasks is provided, uses that list instead (selective seeding from modal).
// Deduplicates by title — existing tasks with the same title are skipped.
export async function seedStepTasks(
  projectId: string,
  workflowStepId: string,
  stepKey: string,
  selectedTasks?: SelectedTask[]
): Promise<{ created: number; skipped: number }> {
  await requireEditPermission();
  const session = await getServerSession();

  let templates: SelectedTask[];

  if (selectedTasks) {
    templates = selectedTasks;
  } else {
    // Try DB templates first, fall back to hardcoded
    const dbGroups = await (db as unknown as {
      taskTemplateGroup: {
        findMany: (args: object) => Promise<{
          tasks: {
            title: string;
            description: string;
            subtasks: { title: string; sortOrder: number }[];
          }[];
        }[]>;
      };
    }).taskTemplateGroup.findMany({
      where: { stepKey },
      include: {
        tasks: {
          include: { subtasks: { orderBy: { sortOrder: "asc" } } },
          orderBy: { sortOrder: "asc" },
        },
      },
      orderBy: { sortOrder: "asc" },
    });

    if (dbGroups.length > 0) {
      templates = dbGroups.flatMap((g) =>
        g.tasks.map((t) => ({
          title: t.title,
          description: t.description,
          subtasks: t.subtasks.map((s) => s.title),
        }))
      );
    } else {
      const hardcoded = STEP_TASK_TEMPLATES[stepKey];
      if (!hardcoded?.length) return { created: 0, skipped: 0 };
      templates = hardcoded.map((t) => ({
        title: t.title,
        description: t.description ?? "",
        subtasks: t.subtasks ?? [],
      }));
    }
  }

  if (!templates.length) return { created: 0, skipped: 0 };

  // Get existing task titles for deduplication
  const existingTasks = await db.implementationTask.findMany({
    where: { projectId, workflowStepId, parentTaskId: null },
    select: { title: true },
  });
  const existingTitles = new Set(existingTasks.map((t) => t.title.toLowerCase()));

  const maxOrder = await db.implementationTask.aggregate({
    where: { projectId, parentTaskId: null },
    _max: { sortOrder: true },
  });
  let nextOrder = (maxOrder._max.sortOrder ?? -1) + 1;

  let created = 0;
  let skipped = 0;

  for (const template of templates) {
    if (existingTitles.has(template.title.toLowerCase())) {
      skipped++;
      continue;
    }

    const parent = await db.implementationTask.create({
      data: {
        projectId,
        isPersonal: false,
        title: template.title,
        description: template.description,
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

    if (template.subtasks.length) {
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

  return { created, skipped };
}
