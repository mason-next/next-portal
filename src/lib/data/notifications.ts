"use server";

import { type Notification as PrismaNotification } from "@prisma/client";
import { db } from "@/lib/db";
import type { NewNotificationInput, Notification, NotificationType } from "@/types/notification";

// ─── Type mapper ──────────────────────────────────────────────────────────────

// The Prisma schema has no `type` column — there is currently only one notification
// type ("mention"). The field is hardcoded here; add a Prisma `type` column and
// run a migration if a second NotificationType is introduced.
function toNotification(p: PrismaNotification): Notification {
  return {
    id: p.id,
    userId: p.userId,
    type: "mention" as NotificationType,
    projectId: p.projectId,
    projectName: p.projectName,
    commentId: p.commentId,
    commentAuthor: p.commentAuthor,
    commentPreview: p.commentPreview,
    message: p.message,
    isRead: p.isRead,
    createdAt: p.createdAt.toISOString(),
  };
}

// ─── Queries ──────────────────────────────────────────────────────────────────

export async function getNotificationsForUser(userId: string): Promise<Notification[]> {
  const rows = await db.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
  return rows.map(toNotification);
}

// ─── Mutations ────────────────────────────────────────────────────────────────

// Dedup key is (userId, commentId). The original also included `type`, but since
// there is only one type ("mention") the reduced key is equivalent.
// Returns null on a dedup skip — callers loop over multiple users and a skip for
// one of them is not an error.
export async function createNotification(input: NewNotificationInput): Promise<Notification | null> {
  const isDuplicate = await db.notification.findFirst({
    where: { userId: input.userId, commentId: input.commentId },
    select: { id: true },
  });
  if (isDuplicate) return null;

  const row = await db.notification.create({
    data: {
      userId: input.userId,
      projectId: input.projectId,
      projectName: input.projectName,
      commentId: input.commentId,
      commentAuthor: input.commentAuthor,
      commentPreview: input.commentPreview,
      message: input.message,
    },
  });
  return toNotification(row);
}

export async function markNotificationRead(id: string): Promise<void> {
  await db.notification.update({ where: { id }, data: { isRead: true } });
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  await db.notification.updateMany({ where: { userId }, data: { isRead: true } });
}

// Cascade on Project.onDelete handles this automatically when deleteProject runs.
// This function is retained for API completeness and explicit call-site clarity.
export async function deleteNotificationsForProject(projectId: string): Promise<void> {
  await db.notification.deleteMany({ where: { projectId } });
}
