"use server";

import {
  Prisma,
  ImplementationTaskStatus as PrismaStatus,
  TaskPriority as PrismaPriority,
  type ImplementationTask as PrismaTask,
  type ImplementationTaskComment as PrismaComment,
  type User,
} from "@prisma/client";
import { db } from "@/lib/db";
import { getServerSession } from "@/lib/auth/server";
import { requireEditPermission } from "@/lib/access-control";
import type {
  ImplementationTask,
  ImplementationTaskComment,
  ImplementationTaskStatus,
  TaskPriority,
  CreateTaskInput,
  UpdateTaskInput,
} from "@/types/implementation";
import type { CommentAttachment } from "@/types/attachments";

// ─── Status/Priority maps ─────────────────────────────────────────────────────

const PRISMA_STATUS: Record<PrismaStatus, ImplementationTaskStatus> = {
  NotStarted: "Not Started",
  InProgress: "In Progress",
  Blocked:    "Blocked",
  Complete:   "Complete",
  Cancelled:  "Cancelled",
};

const APP_STATUS: Record<ImplementationTaskStatus, PrismaStatus> = {
  "Not Started": "NotStarted",
  "In Progress": "InProgress",
  Blocked:       "Blocked",
  Complete:      "Complete",
  Cancelled:     "Cancelled",
};

const PRISMA_PRIORITY: Record<PrismaPriority, TaskPriority> = {
  Low:      "Low",
  Medium:   "Medium",
  High:     "High",
  Critical: "Critical",
};

const APP_PRIORITY: Record<TaskPriority, PrismaPriority> = {
  Low:      "Low",
  Medium:   "Medium",
  High:     "High",
  Critical: "Critical",
};

// ─── Mappers ──────────────────────────────────────────────────────────────────

type PrismaTaskWithCounts = PrismaTask & {
  assignee: Pick<User, "id" | "name"> | null;
  workflowStep: { id: string; name: string } | null;
  _count: {
    subtasks: number;
    comments: number;
    dependencies: number;
  };
  subtasks: { status: PrismaStatus }[];
};

type TaskAssigneeRow = { taskId: string; user: { id: string; name: string } };

function toTask(p: PrismaTaskWithCounts, assignees: { id: string; name: string }[]): ImplementationTask {
  const completedSubs = p.subtasks.filter((s: { status: string }) => s.status === "Complete").length;
  const pAny = p as unknown as { isPersonal?: boolean; projectId: string | null; workflowStepId: string | null; workflowStep: { name: string } | null };
  return {
    id: p.id,
    projectId: pAny.projectId ?? null,
    isPersonal: pAny.isPersonal ?? false,
    title: p.title,
    description: p.description,
    status: PRISMA_STATUS[p.status],
    priority: PRISMA_PRIORITY[p.priority],
    percentComplete: p.percentComplete,
    assignees,
    createdById: p.createdById,
    startDate: p.startDate?.toISOString() ?? null,
    dueDate: p.dueDate?.toISOString() ?? null,
    completedAt: p.completedAt?.toISOString() ?? null,
    sortOrder: p.sortOrder,
    parentTaskId: p.parentTaskId,
    notes: p.notes,
    tags: p.tags,
    subtaskCount: p._count.subtasks,
    completedSubtaskCount: completedSubs,
    commentCount: p._count.comments,
    workflowStepId: pAny.workflowStepId ?? null,
    workflowStepName: pAny.workflowStep?.name ?? null,
    dependencyCount: (p._count as unknown as { dependencies?: number }).dependencies ?? 0,
    calendarScheduledAt: (p as unknown as { calendarScheduledAt?: Date | null }).calendarScheduledAt?.toISOString() ?? null,
    calendarEventUrl: (p as unknown as { calendarEventUrl?: string | null }).calendarEventUrl ?? null,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}

function parseAttachments(raw: unknown): CommentAttachment[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (a): a is CommentAttachment =>
      a !== null &&
      typeof a === "object" &&
      typeof (a as Record<string, unknown>).storagePath === "string"
  );
}

function toComment(p: PrismaComment): ImplementationTaskComment {
  return {
    id: p.id,
    taskId: p.taskId,
    userId: p.userId,
    userName: p.userName,
    richContent: p.richContent as Record<string, unknown> | null,
    plainText: p.plainText,
    attachments: parseAttachments((p as unknown as { attachments?: unknown }).attachments),
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}

const TASK_INCLUDE = {
  assignee: { select: { id: true, name: true } },
  workflowStep: { select: { id: true, name: true } },
  subtasks: { select: { status: true } },
  _count: { select: { subtasks: true, comments: true, dependencies: true } },
} as const;

// Batch-loads all assignee join-table rows for a set of task IDs in one query.
// Falls back to the legacy assigneeId column if the join table has no entries yet
// (handles tasks created before multi-assignee was added).
async function batchLoadAssignees(
  taskIds: string[],
  fallbackMap: Map<string, { id: string; name: string } | null>
): Promise<Map<string, { id: string; name: string }[]>> {
  const result = new Map<string, { id: string; name: string }[]>();
  if (taskIds.length === 0) return result;

  try {
    const rows: TaskAssigneeRow[] = await (db as any).implementationTaskAssignee.findMany({
      where: { taskId: { in: taskIds } },
      include: { user: { select: { id: true, name: true } } },
    });
    for (const r of rows) {
      if (!result.has(r.taskId)) result.set(r.taskId, []);
      result.get(r.taskId)!.push(r.user);
    }
  } catch {
    // Join table not yet migrated — fall through to scalar FK fallback
  }

  // Backfill tasks not yet in the join table from the scalar FK
  for (const taskId of taskIds) {
    if (!result.has(taskId)) {
      const fallback = fallbackMap.get(taskId);
      result.set(taskId, fallback ? [fallback] : []);
    }
  }

  return result;
}

// Replaces all assignee join-table rows for a task. The scalar assigneeId is kept in sync
// by the caller (updateTask sets it in the main update data before calling this).
async function syncAssignees(taskId: string, assigneeIds: string[]): Promise<void> {
  try {
    await (db as any).implementationTaskAssignee.deleteMany({ where: { taskId } });
    if (assigneeIds.length > 0) {
      await (db as any).implementationTaskAssignee.createMany({
        data: assigneeIds.map((userId) => ({ taskId, userId })),
        skipDuplicates: true,
      });
    }
  } catch {
    // Join table not yet migrated on this env — scalar assigneeId is the only record
  }
}

// ─── Queries ──────────────────────────────────────────────────────────────────

export async function getProjectTasks(projectId: string): Promise<ImplementationTask[]> {
  const rows = await db.implementationTask.findMany({
    where: { projectId, parentTaskId: null },
    include: TASK_INCLUDE,
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
  const fallback = new Map(rows.map((r) => [r.id, r.assignee ? { id: r.assignee.id, name: r.assignee.name } : null]));
  const assigneesById = await batchLoadAssignees(rows.map((r) => r.id), fallback);
  return rows.map((r) => toTask(r, assigneesById.get(r.id) ?? []));
}

export async function getSubtasks(parentTaskId: string): Promise<ImplementationTask[]> {
  const rows = await db.implementationTask.findMany({
    where: { parentTaskId },
    include: TASK_INCLUDE,
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
  const fallback = new Map(rows.map((r) => [r.id, r.assignee ? { id: r.assignee.id, name: r.assignee.name } : null]));
  const assigneesById = await batchLoadAssignees(rows.map((r) => r.id), fallback);
  return rows.map((r) => toTask(r, assigneesById.get(r.id) ?? []));
}

export async function getTask(taskId: string): Promise<ImplementationTask | null> {
  const row = await db.implementationTask.findUnique({
    where: { id: taskId },
    include: TASK_INCLUDE,
  });
  if (!row) return null;
  const fallback = new Map([[row.id, row.assignee ? { id: row.assignee.id, name: row.assignee.name } : null]]);
  const assigneesById = await batchLoadAssignees([row.id], fallback);
  return toTask(row, assigneesById.get(row.id) ?? []);
}

export async function getTaskComments(taskId: string): Promise<ImplementationTaskComment[]> {
  const rows = await db.implementationTaskComment.findMany({
    where: { taskId },
    orderBy: { createdAt: "asc" },
  });
  return rows.map(toComment);
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export async function createTask(
  input: CreateTaskInput
): Promise<ImplementationTask> {
  await requireEditPermission();
  const session = await getServerSession();
  const projectId = input.projectId ?? null;
  const isPersonal = input.isPersonal ?? !projectId;

  const whereClause = projectId
    ? { projectId, parentTaskId: input.parentTaskId ?? null }
    : { assigneeId: session?.id ?? undefined, parentTaskId: null as string | null };

  const maxOrder = await db.implementationTask.aggregate({
    where: whereClause,
    _max: { sortOrder: true },
  });
  const nextOrder = (maxOrder._max.sortOrder ?? -1) + 1;

  const assigneeIds = input.assigneeIds ?? [];
  const primaryAssigneeId = assigneeIds[0] ?? null;

  const row = await db.implementationTask.create({
    data: {
      ...(projectId ? { projectId } : {}),
      isPersonal,
      title: input.title,
      description: input.description ?? "",
      status: input.status ? APP_STATUS[input.status] : "NotStarted",
      priority: input.priority ? APP_PRIORITY[input.priority] : "Medium",
      percentComplete: input.percentComplete ?? 0,
      assigneeId: primaryAssigneeId,
      createdById: session?.id ?? null,
      startDate: input.startDate ? new Date(input.startDate) : null,
      dueDate: input.dueDate ? new Date(input.dueDate) : null,
      parentTaskId: input.parentTaskId ?? null,
      notes: input.notes ?? "",
      tags: input.tags ?? [],
      sortOrder: nextOrder,
      workflowStepId: input.workflowStepId ?? null,
    } as Parameters<typeof db.implementationTask.create>[0]["data"],
    include: TASK_INCLUDE,
  });
  if (assigneeIds.length > 0) {
    await (db as any).implementationTaskAssignee.createMany({
      data: assigneeIds.map((userId: string) => ({ taskId: row.id, userId })),
      skipDuplicates: true,
    });
  }
  const assignees = assigneeIds.length > 0
    ? await db.user.findMany({ where: { id: { in: assigneeIds } }, select: { id: true, name: true } })
    : [];
  return toTask(row as unknown as PrismaTaskWithCounts, assignees);
}

export async function updateTask(
  taskId: string,
  input: UpdateTaskInput
): Promise<ImplementationTask> {
  await requireEditPermission();
  const data: Parameters<typeof db.implementationTask.update>[0]["data"] = {};
  if (input.title !== undefined)           data.title           = input.title;
  if (input.description !== undefined)     data.description     = input.description;
  if (input.status !== undefined)          data.status          = APP_STATUS[input.status];
  if (input.priority !== undefined)        data.priority        = APP_PRIORITY[input.priority];
  if (input.percentComplete !== undefined) data.percentComplete = input.percentComplete;
  if (input.notes !== undefined)           data.notes           = input.notes;
  if (input.tags !== undefined)            data.tags            = input.tags;
  if ("workflowStepId" in input)           data.workflowStepId  = input.workflowStepId ?? null;
  if ("projectId" in input)               data.projectId       = input.projectId ?? null;
  if ("isPersonal" in input)              data.isPersonal      = input.isPersonal ?? false;
  if ("startDate" in input)                data.startDate       = input.startDate ? new Date(input.startDate) : null;
  if ("dueDate" in input)                  data.dueDate         = input.dueDate   ? new Date(input.dueDate)   : null;
  if ("completedAt" in input)              data.completedAt     = input.completedAt ? new Date(input.completedAt) : null;
  if ("calendarScheduledAt" in input)      (data as Record<string, unknown>).calendarScheduledAt = input.calendarScheduledAt ? new Date(input.calendarScheduledAt) : null;
  if ("calendarEventUrl" in input)         (data as Record<string, unknown>).calendarEventUrl = input.calendarEventUrl ?? null;

  // Auto-set completedAt when status transitions to Complete
  if (input.status === "Complete" && !data.completedAt) {
    data.completedAt = new Date();
  } else if (input.status && input.status !== "Complete") {
    data.completedAt = null;
  }

  // Keep assigneeId (primary) in sync when assigneeIds is provided
  if ("assigneeIds" in input && input.assigneeIds !== undefined) {
    data.assigneeId = input.assigneeIds[0] ?? null;
  }

  const row = await db.implementationTask.update({
    where: { id: taskId },
    data,
    include: TASK_INCLUDE,
  });

  // Sync the join table if assigneeIds was provided
  if ("assigneeIds" in input && input.assigneeIds !== undefined) {
    await syncAssignees(taskId, input.assigneeIds);
  }

  const fallback = new Map([[row.id, row.assignee ? { id: row.assignee.id, name: row.assignee.name } : null]]);
  const assigneesById = await batchLoadAssignees([row.id], fallback);
  return toTask(row, assigneesById.get(row.id) ?? []);
}

export async function deleteTask(taskId: string): Promise<void> {
  await requireEditPermission();
  await db.implementationTask.delete({ where: { id: taskId } });
}

export async function reorderTasks(
  projectId: string,
  parentTaskId: string | null,
  orderedIds: string[]
): Promise<void> {
  await requireEditPermission();
  await db.$transaction(
    orderedIds.map((id, i) =>
      db.implementationTask.update({
        where: { id, projectId },
        data: { sortOrder: i },
      })
    )
  );
}

export async function addTaskComment(
  taskId: string,
  richContent: Record<string, unknown>,
  plainText: string,
  attachments?: CommentAttachment[]
): Promise<ImplementationTaskComment> {
  const session = await getServerSession();
  const richContentJson = richContent as unknown as Prisma.InputJsonValue;
  const attachmentsJson =
    attachments === undefined
      ? undefined
      : attachments === null
        ? Prisma.JsonNull
        : (attachments as unknown as Prisma.InputJsonValue);
  const row = await db.implementationTaskComment.create({
    data: {
      taskId,
      userId: session?.id ?? null,
      userName: session?.name ?? "Unknown",
      richContent: richContentJson,
      plainText,
      ...(attachmentsJson !== undefined ? { attachments: attachmentsJson } : {}),
    },
  });
  return toComment(row);
}

export async function deleteTaskComment(commentId: string): Promise<void> {
  await db.implementationTaskComment.delete({ where: { id: commentId } });
}
