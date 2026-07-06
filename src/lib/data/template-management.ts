"use server";

import { db } from "@/lib/db";
import { requireEditPermission } from "@/lib/access-control";
import { STEP_TASK_TEMPLATES } from "./task-template-config";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TemplateSubtask {
  id: string;
  title: string;
  sortOrder: number;
}

export interface TemplateItem {
  id: string;
  title: string;
  description: string;
  sortOrder: number;
  subtasks: TemplateSubtask[];
}

export interface TemplateGroup {
  id: string;
  name: string;
  stepKey: string;
  description: string;
  projectTypes: string[];
  sortOrder: number;
  isBuiltIn: boolean;
  tasks: TemplateItem[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

type PrismaGroup = {
  id: string;
  name: string;
  stepKey: string;
  description: string;
  projectTypes: string[];
  sortOrder: number;
  isBuiltIn: boolean;
  tasks: {
    id: string;
    title: string;
    description: string;
    sortOrder: number;
    subtasks: { id: string; title: string; sortOrder: number }[];
  }[];
};

function toGroup(p: PrismaGroup): TemplateGroup {
  return {
    id: p.id,
    name: p.name,
    stepKey: p.stepKey,
    description: p.description,
    projectTypes: p.projectTypes,
    sortOrder: p.sortOrder,
    isBuiltIn: p.isBuiltIn,
    tasks: p.tasks.map((t) => ({
      id: t.id,
      title: t.title,
      description: t.description,
      sortOrder: t.sortOrder,
      subtasks: t.subtasks.map((s) => ({
        id: s.id,
        title: s.title,
        sortOrder: s.sortOrder,
      })),
    })),
  };
}

const GROUP_INCLUDE = {
  tasks: {
    include: { subtasks: { orderBy: { sortOrder: "asc" as const } } },
    orderBy: { sortOrder: "asc" as const },
  },
} as const;

// ─── Queries ──────────────────────────────────────────────────────────────────

export async function getTemplateGroups(): Promise<TemplateGroup[]> {
  const rows = await (db as unknown as {
    taskTemplateGroup: {
      findMany: (args: object) => Promise<PrismaGroup[]>;
    };
  }).taskTemplateGroup.findMany({
    include: GROUP_INCLUDE,
    orderBy: { sortOrder: "asc" },
  });
  return rows.map(toGroup);
}

export async function getTemplateGroupsByStepKey(stepKey: string): Promise<TemplateGroup[]> {
  const rows = await (db as unknown as {
    taskTemplateGroup: {
      findMany: (args: object) => Promise<PrismaGroup[]>;
    };
  }).taskTemplateGroup.findMany({
    where: { stepKey },
    include: GROUP_INCLUDE,
    orderBy: { sortOrder: "asc" },
  });
  return rows.map(toGroup);
}

// Seeds built-in templates from hardcoded config if the DB has no templates yet.
// Idempotent — safe to call multiple times.
export async function ensureDefaultTemplatesSeeded(): Promise<void> {
  const count = await (db as unknown as {
    taskTemplateGroup: { count: () => Promise<number> };
  }).taskTemplateGroup.count();
  if (count > 0) return;
  await seedDefaultTemplates();
}

export async function seedDefaultTemplates(): Promise<void> {
  const db_ = db as unknown as {
    taskTemplateGroup: {
      upsert: (args: object) => Promise<unknown>;
    };
    taskTemplateItem: {
      deleteMany: (args: object) => Promise<unknown>;
      createMany: (args: object) => Promise<unknown>;
    };
    taskTemplateSubtask: {
      createMany: (args: object) => Promise<unknown>;
    };
  };

  const entries = Object.entries(STEP_TASK_TEMPLATES);
  const stepKeyOrder: Record<string, number> = {
    installation: 0,
    programming: 1,
    commissioning: 2,
  };

  for (const [stepKey, templates] of entries) {
    const name =
      stepKey === "installation"
        ? "Installation"
        : stepKey === "programming"
        ? "Programming"
        : stepKey === "commissioning"
        ? "Commissioning"
        : stepKey.charAt(0).toUpperCase() + stepKey.slice(1);

    const group = await db_.taskTemplateGroup.upsert({
      where: { id: `builtin-${stepKey}` } as unknown as { id: string },
      create: {
        id: `builtin-${stepKey}`,
        name,
        stepKey,
        description: "",
        projectTypes: [],
        sortOrder: stepKeyOrder[stepKey] ?? 99,
        isBuiltIn: true,
      },
      update: { name, sortOrder: stepKeyOrder[stepKey] ?? 99 },
    }) as { id: string };

    // Replace all tasks for this group
    await db_.taskTemplateItem.deleteMany({ where: { groupId: group.id } });

    for (let ti = 0; ti < templates.length; ti++) {
      const template = templates[ti];
      const itemId = `builtin-${stepKey}-${ti}`;
      await (db as unknown as {
        taskTemplateItem: {
          create: (args: object) => Promise<{ id: string }>;
        };
      }).taskTemplateItem.create({
        data: {
          id: itemId,
          groupId: group.id,
          title: template.title,
          description: template.description ?? "",
          sortOrder: ti,
        },
      });

      if (template.subtasks?.length) {
        const subtaskRows = template.subtasks.map((title, si) => ({
          id: `builtin-${stepKey}-${ti}-${si}`,
          taskId: itemId,
          title,
          sortOrder: si,
        }));
        await db_.taskTemplateSubtask.createMany({ data: subtaskRows });
      }
    }
  }
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export async function createTemplateGroup(input: {
  name: string;
  stepKey: string;
  description?: string;
  projectTypes?: string[];
}): Promise<TemplateGroup> {
  await requireEditPermission();
  const maxOrder = await (db as unknown as {
    taskTemplateGroup: { aggregate: (args: object) => Promise<{ _max: { sortOrder: number | null } }> };
  }).taskTemplateGroup.aggregate({ _max: { sortOrder: true } });
  const nextOrder = (maxOrder._max.sortOrder ?? -1) + 1;

  const row = await (db as unknown as {
    taskTemplateGroup: { create: (args: object) => Promise<PrismaGroup> };
  }).taskTemplateGroup.create({
    data: {
      name: input.name,
      stepKey: input.stepKey,
      description: input.description ?? "",
      projectTypes: input.projectTypes ?? [],
      sortOrder: nextOrder,
      isBuiltIn: false,
    },
    include: GROUP_INCLUDE,
  });
  return toGroup(row);
}

export async function updateTemplateGroup(
  groupId: string,
  input: { name?: string; stepKey?: string; description?: string; projectTypes?: string[]; sortOrder?: number }
): Promise<TemplateGroup> {
  await requireEditPermission();
  const row = await (db as unknown as {
    taskTemplateGroup: { update: (args: object) => Promise<PrismaGroup> };
  }).taskTemplateGroup.update({
    where: { id: groupId },
    data: input,
    include: GROUP_INCLUDE,
  });
  return toGroup(row);
}

export async function deleteTemplateGroup(groupId: string): Promise<void> {
  await requireEditPermission();
  await (db as unknown as {
    taskTemplateGroup: { delete: (args: object) => Promise<unknown> };
  }).taskTemplateGroup.delete({ where: { id: groupId } });
}

export async function createTemplateItem(
  groupId: string,
  input: { title: string; description?: string }
): Promise<TemplateItem> {
  await requireEditPermission();
  const maxOrder = await (db as unknown as {
    taskTemplateItem: { aggregate: (args: object) => Promise<{ _max: { sortOrder: number | null } }> };
  }).taskTemplateItem.aggregate({ where: { groupId }, _max: { sortOrder: true } });
  const nextOrder = (maxOrder._max.sortOrder ?? -1) + 1;

  const row = await (db as unknown as {
    taskTemplateItem: {
      create: (args: object) => Promise<{
        id: string; title: string; description: string; sortOrder: number;
        subtasks: { id: string; title: string; sortOrder: number }[];
      }>;
    };
  }).taskTemplateItem.create({
    data: {
      groupId,
      title: input.title,
      description: input.description ?? "",
      sortOrder: nextOrder,
    },
    include: { subtasks: { orderBy: { sortOrder: "asc" } } },
  });

  return { id: row.id, title: row.title, description: row.description, sortOrder: row.sortOrder, subtasks: row.subtasks };
}

export async function updateTemplateItem(
  itemId: string,
  input: { title?: string; description?: string; sortOrder?: number }
): Promise<void> {
  await requireEditPermission();
  await (db as unknown as {
    taskTemplateItem: { update: (args: object) => Promise<unknown> };
  }).taskTemplateItem.update({ where: { id: itemId }, data: input });
}

export async function deleteTemplateItem(itemId: string): Promise<void> {
  await requireEditPermission();
  await (db as unknown as {
    taskTemplateItem: { delete: (args: object) => Promise<unknown> };
  }).taskTemplateItem.delete({ where: { id: itemId } });
}

export async function createTemplateSubtask(
  taskId: string,
  title: string
): Promise<TemplateSubtask> {
  await requireEditPermission();
  const maxOrder = await (db as unknown as {
    taskTemplateSubtask: { aggregate: (args: object) => Promise<{ _max: { sortOrder: number | null } }> };
  }).taskTemplateSubtask.aggregate({ where: { taskId }, _max: { sortOrder: true } });
  const nextOrder = (maxOrder._max.sortOrder ?? -1) + 1;

  const row = await (db as unknown as {
    taskTemplateSubtask: {
      create: (args: object) => Promise<{ id: string; title: string; sortOrder: number }>;
    };
  }).taskTemplateSubtask.create({
    data: { taskId, title, sortOrder: nextOrder },
  });
  return { id: row.id, title: row.title, sortOrder: row.sortOrder };
}

export async function updateTemplateSubtask(
  subtaskId: string,
  input: { title?: string; sortOrder?: number }
): Promise<void> {
  await requireEditPermission();
  await (db as unknown as {
    taskTemplateSubtask: { update: (args: object) => Promise<unknown> };
  }).taskTemplateSubtask.update({ where: { id: subtaskId }, data: input });
}

export async function deleteTemplateSubtask(subtaskId: string): Promise<void> {
  await requireEditPermission();
  await (db as unknown as {
    taskTemplateSubtask: { delete: (args: object) => Promise<unknown> };
  }).taskTemplateSubtask.delete({ where: { id: subtaskId } });
}
