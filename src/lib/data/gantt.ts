"use server";

import { db } from "@/lib/db";
import { requireEditPermission } from "@/lib/access-control";
import type { GanttEntryFull } from "@/types/gantt";

// ─── Read ─────────────────────────────────────────────────────────────────────

export async function getGanttEntries(projectId: string): Promise<GanttEntryFull[]> {
  const entries = await db.ganttEntry.findMany({
    where: { projectId },
    orderBy: { sortOrder: "asc" },
    include: {
      workflowStep: {
        include: { owner: { select: { id: true, name: true } } },
      },
      task: {
        include: {
          assignee: { select: { id: true, name: true } },
          assignees: { include: { user: { select: { id: true, name: true } } } },
        },
      },
    },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (entries as any[]).map((e): GanttEntryFull => {
    if (e.workflowStep) {
      const s = e.workflowStep;
      return {
        type: "step",
        id: e.id,
        projectId: e.projectId,
        customerVisible: e.customerVisible,
        sortOrder: e.sortOrder,
        scheduleMode: (e.scheduleMode ?? "manual") as "manual" | "auto",
        workflowStepId: s.id,
        taskId: null,
        stepKey: s.key,
        stepName: s.name,
        stepSection: s.section as string,
        stepStatus: s.status as string,
        stepOwnerId: s.ownerId,
        stepOwnerName: s.owner?.name ?? null,
        stepStartDate: (s as unknown as { startDate?: Date | null }).startDate?.toISOString() ?? null,
        stepDueDate: s.dueDate?.toISOString() ?? null,
      };
    }

    if (e.task) {
      const t = e.task;
      const extraNames = t.assignees.map((a: { user: { name: string } }) => a.user.name);
      const allNames = t.assignee
        ? [t.assignee.name, ...extraNames.filter((n: string) => n !== t.assignee!.name)]
        : extraNames;

      return {
        type: "task",
        id: e.id,
        projectId: e.projectId,
        customerVisible: e.customerVisible,
        sortOrder: e.sortOrder,
        scheduleMode: (e.scheduleMode ?? "manual") as "manual" | "auto",
        workflowStepId: null,
        taskId: t.id,
        taskTitle: t.title,
        taskStatus: t.status as string,
        taskPercentComplete: t.percentComplete,
        taskAssigneeId: t.assigneeId,
        taskAssigneeName: t.assignee?.name ?? null,
        taskAssigneeNames: allNames,
        taskStartDate: t.startDate?.toISOString() ?? null,
        taskDueDate: t.dueDate?.toISOString() ?? null,
        taskParentStepId: t.workflowStepId,
      };
    }

    // Should not happen (one of step/task is always set), but satisfy the type system
    throw new Error(`GanttEntry ${e.id} has neither step nor task`);
  });
}

// ─── Import / Add ─────────────────────────────────────────────────────────────

interface ImportItem {
  stepId?: string;
  taskId?: string;
}

export async function importGanttItems(
  projectId: string,
  items: ImportItem[]
): Promise<void> {
  await requireEditPermission();

  // Determine next sortOrder
  const existing = await db.ganttEntry.findMany({
    where: { projectId },
    select: { sortOrder: true },
    orderBy: { sortOrder: "desc" },
  });
  let nextOrder = (existing[0]?.sortOrder ?? -1) + 1;

  const creates: Parameters<typeof db.ganttEntry.createMany>[0]["data"] = [];

  for (const item of items) {
    if (item.stepId) {
      const alreadyIn = await db.ganttEntry.findUnique({
        where: { workflowStepId: item.stepId },
      });
      if (!alreadyIn) {
        creates.push({
          id: crypto.randomUUID(),
          projectId,
          workflowStepId: item.stepId,
          taskId: null,
          customerVisible: true,
          sortOrder: nextOrder++,
        });
      }
    }
    if (item.taskId) {
      const alreadyIn = await db.ganttEntry.findUnique({
        where: { taskId: item.taskId },
      });
      if (!alreadyIn) {
        creates.push({
          id: crypto.randomUUID(),
          projectId,
          workflowStepId: null,
          taskId: item.taskId,
          customerVisible: true,
          sortOrder: nextOrder++,
        });
      }
    }
  }

  if (creates.length > 0) {
    await db.ganttEntry.createMany({ data: creates });
  }
}

// ─── Remove ───────────────────────────────────────────────────────────────────

export async function removeGanttEntry(entryId: string): Promise<void> {
  await requireEditPermission();
  await db.ganttEntry.delete({ where: { id: entryId } });
}

// ─── Update customer visibility ───────────────────────────────────────────────

export async function updateGanttEntryVisibility(
  entryId: string,
  customerVisible: boolean
): Promise<void> {
  await requireEditPermission();
  await db.ganttEntry.update({ where: { id: entryId }, data: { customerVisible } });
}

// ─── Update dates (syncs back to the underlying workflow item) ────────────────

export async function updateGanttStepDates(
  stepId: string,
  startDate: Date | null,
  endDate: Date | null
): Promise<void> {
  await requireEditPermission();
  await db.workflowStep.update({
    where: { id: stepId },
    data: {
      startDate: startDate ?? null,
      dueDate: endDate ?? null,
    } as Parameters<typeof db.workflowStep.update>[0]["data"],
  });
}

export async function updateGanttTaskDates(
  taskId: string,
  startDate: Date | null,
  endDate: Date | null
): Promise<void> {
  await requireEditPermission();
  await db.implementationTask.update({
    where: { id: taskId },
    data: { startDate, dueDate: endDate },
  });
}

// ─── Update percent complete (tasks only; steps derive from status) ────────────

export async function updateGanttTaskProgress(
  taskId: string,
  percentComplete: number
): Promise<void> {
  await requireEditPermission();
  await db.implementationTask.update({
    where: { id: taskId },
    data: { percentComplete: Math.max(0, Math.min(100, percentComplete)) },
  });
}

// ─── Reorder entries ──────────────────────────────────────────────────────────

export async function reorderGanttEntries(
  updates: { id: string; sortOrder: number }[]
): Promise<void> {
  await requireEditPermission();
  await db.$transaction(
    updates.map(({ id, sortOrder }) =>
      db.ganttEntry.update({ where: { id }, data: { sortOrder } })
    )
  );
}
