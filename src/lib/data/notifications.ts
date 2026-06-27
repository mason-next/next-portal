"use server";

import { Prisma, type Notification as PrismaNotification } from "@prisma/client";
import { db } from "@/lib/db";
import type { NewNotificationInput, Notification, NotificationType } from "@/types/notification";

// ─── Type mapper ──────────────────────────────────────────────────────────────

function toNotification(p: PrismaNotification): Notification {
  return {
    id: p.id,
    userId: p.userId,
    type: (p.type as NotificationType) ?? "mention",
    projectId: p.projectId,
    projectName: p.projectName,
    commentId: p.commentId ?? null,
    commentAuthor: p.commentAuthor,
    commentPreview: p.commentPreview,
    message: p.message,
    metadata: p.metadata != null ? (p.metadata as Record<string, unknown>) : null,
    isRead: p.isRead,
    createdAt: p.createdAt.toISOString(),
  };
}

// ─── Queries ──────────────────────────────────────────────────────────────────

export async function getNotificationsForUser(userId: string): Promise<Notification[]> {
  const rows = await db.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return rows.map(toNotification);
}

// ─── Mutations ────────────────────────────────────────────────────────────────

// Dedup key: (userId, commentId) for comment notifications; (userId, type, projectId) otherwise.
export async function createNotification(input: NewNotificationInput): Promise<Notification | null> {
  // Dedup: prevent spamming the same notification
  const dedup = input.commentId
    ? { userId: input.userId, commentId: input.commentId }
    : { userId: input.userId, type: input.type, projectId: input.projectId };

  const isDuplicate = await db.notification.findFirst({
    where: dedup,
    select: { id: true },
  });
  if (isDuplicate) return null;

  const row = await db.notification.create({
    data: {
      userId: input.userId,
      type: input.type,
      projectId: input.projectId,
      projectName: input.projectName,
      commentId: input.commentId ?? null,
      commentAuthor: input.commentAuthor ?? "",
      commentPreview: input.commentPreview ?? "",
      message: input.message,
      metadata: (input.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
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

export async function deleteNotificationsForProject(projectId: string): Promise<void> {
  await db.notification.deleteMany({ where: { projectId } });
}
