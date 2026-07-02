"use server";

import {
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
  assignee: Pick<User, "name"> | null;
  workflowStep: { id: string; name: string } | null;
  _count: {
    subtasks: number;
    comments: number;
    dependencies: number;
  };
  subtasks: { status: PrismaStatus }[];
};

function toTask(p: PrismaTaskWithCounts): ImplementationTask {
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
    assigneeId: p.assigneeId,
    assigneeName: p.assignee?.name ?? null,
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
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}

function toComment(p: PrismaComment): ImplementationTaskComment {
  return {
    id: p.id,
    taskId: p.taskId,
    userId: p.userId,
    userName: p.userName,
    richContent: p.richContent as Record<string, unknown> | null,
    plainText: p.plainText,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}

const TASK_INCLUDE = {
  assignee: { select: { name: true } },
  workflowStep: { select: { id: true, name: true } },
  subtasks: { select: { status: true } },
  _count: { select: { subtasks: true, comments: true, dependencies: true } },
} as const;

// ─── Queries ──────────────────────────────────────────────────────────────────

export async function getProjectTasks(projectId: string): Promise<ImplementationTask[]> {
  const rows = await db.implementationTask.findMany({
    where: { projectId, parentTaskId: null },
    include: TASK_INCLUDE,
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
  return rows.map(toTask);
}

export async function getSubtasks(parentTaskId: string): Promise<ImplementationTask[]> {
  const rows = await db.implementationTask.findMany({
    where: { parentTaskId },
    include: TASK_INCLUDE,
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
  return rows.map(toTask);
}

export async function getTask(taskId: string): Promise<ImplementationTask | null> {
  const row = await db.implementationTask.findUnique({
    where: { id: taskId },
    include: TASK_INCLUDE,
  });
  return row ? toTask(row) : null;
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

  const row = await db.implementationTask.create({
    data: {
      ...(projectId ? { projectId } : {}),
      isPersonal,
      title: input.title,
      description: input.description ?? "",
      status: input.status ? APP_STATUS[input.status] : "NotStarted",
      priority: input.priority ? APP_PRIORITY[input.priority] : "Medium",
      percentComplete: input.percentComplete ?? 0,
      assigneeId: input.assigneeId ?? null,
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
  return toTask(row as unknown as PrismaTaskWithCounts);
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
  if ("assigneeId" in input)               data.assigneeId      = input.assigneeId ?? null;
  if ("workflowStepId" in input)           data.workflowStepId  = input.workflowStepId ?? null;
  if ("startDate" in input)                data.startDate       = input.startDate ? new Date(input.startDate) : null;
  if ("dueDate" in input)                  data.dueDate         = input.dueDate   ? new Date(input.dueDate)   : null;
  if ("completedAt" in input)              data.completedAt     = input.completedAt ? new Date(input.completedAt) : null;

  // Auto-set completedAt when status transitions to Complete
  if (input.status === "Complete" && !data.completedAt) {
    data.completedAt = new Date();
  } else if (input.status && input.status !== "Complete") {
    data.completedAt = null;
  }

  const row = await db.implementationTask.update({
    where: { id: taskId },
    data,
    include: TASK_INCLUDE,
  });
  return toTask(row);
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
  plainText: string
): Promise<ImplementationTaskComment> {
  const session = await getServerSession();
  const row = await db.implementationTaskComment.create({
    data: {
      taskId,
      userId: session?.id ?? null,
      userName: session?.name ?? "Unknown",
      richContent: richContent as Parameters<typeof db.implementationTaskComment.create>[0]["data"]["richContent"],
      plainText,
    },
  });
  return toComment(row);
}

export async function deleteTaskComment(commentId: string): Promise<void> {
  await db.implementationTaskComment.delete({ where: { id: commentId } });
}
