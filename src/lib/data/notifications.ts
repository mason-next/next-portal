"use server";

import { Prisma, type Notification as PrismaNotification } from "@prisma/client";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth/server";
import { ForbiddenError } from "@/lib/access-control";
import type { NewNotificationInput, Notification, NotificationType } from "@/types/notification";

// ─── Type mapper ──────────────────────────────────────────────────────────────

function toNotification(p: PrismaNotification): Notification {
  const pAny = p as unknown as { taskCommentId?: string | null };
  return {
    id: p.id,
    userId: p.userId,
    type: (p.type as NotificationType) ?? "mention",
    projectId: p.projectId,
    projectName: p.projectName,
    commentId: p.commentId ?? null,
    taskCommentId: pAny.taskCommentId ?? null,
    commentAuthor: p.commentAuthor,
    commentPreview: p.commentPreview,
    message: p.message,
    metadata: p.metadata != null ? (p.metadata as Record<string, unknown>) : null,
    isRead: p.isRead,
    createdAt: p.createdAt.toISOString(),
  };
}

// ─── Queries ──────────────────────────────────────────────────────────────────

export async function getNotificationsForUser(_userId: string): Promise<Notification[]> {
  // Always the caller's own notifications — the passed id is ignored (never trust the client).
  const session = await requireSession();
  const rows = await db.notification.findMany({
    where: { userId: session.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return rows.map(toNotification);
}

// ─── Mutations ────────────────────────────────────────────────────────────────

// Dedup key: (userId, commentId) for project comments; (userId, taskCommentId) for task comments;
// (userId, type, projectId) for all other notification types.
export async function createNotification(input: NewNotificationInput): Promise<Notification | null> {
  // Notifications are generated for OTHER users (e.g. @mentions), so we can't pin to self —
  // but the caller must at least be an authenticated user.
  await requireSession();
  const dedup = input.commentId
    ? { userId: input.userId, commentId: input.commentId }
    : input.taskCommentId
      ? { userId: input.userId, taskCommentId: input.taskCommentId }
      : { userId: input.userId, type: input.type, projectId: input.projectId };

  const isDuplicate = await db.notification.findFirst({ where: dedup, select: { id: true } });
  if (isDuplicate) return null;

  const row = await db.notification.create({
    data: {
      userId: input.userId,
      type: input.type,
      projectId: input.projectId,
      projectName: input.projectName,
      commentId: input.commentId ?? null,
      taskCommentId: input.taskCommentId ?? null,
      commentAuthor: input.commentAuthor ?? "",
      commentPreview: input.commentPreview ?? "",
      message: input.message,
      metadata: (input.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
    },
  });
  return toNotification(row);
}

export async function markNotificationRead(id: string): Promise<void> {
  const session = await requireSession();
  const notif = await db.notification.findUnique({ where: { id }, select: { userId: true } });
  if (!notif) return;
  if (notif.userId !== session.id) throw new ForbiddenError("You can only update your own notifications");
  await db.notification.update({ where: { id }, data: { isRead: true } });
}

export async function markAllNotificationsRead(_userId: string): Promise<void> {
  // Only the caller's own notifications — passed id ignored.
  const session = await requireSession();
  await db.notification.updateMany({ where: { userId: session.id }, data: { isRead: true } });
}

export async function deleteNotificationsForProject(projectId: string): Promise<void> {
  // Housekeeping when a project's comments are removed; authenticated users only.
  await requireSession();
  await db.notification.deleteMany({ where: { projectId } });
}
