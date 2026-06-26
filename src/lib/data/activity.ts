"use server";

import type { JSONContent } from "@tiptap/core";
import {
  Prisma,
  ActivityCategory as PrismaCategory,
  type ProjectActivity as PrismaActivity,
} from "@prisma/client";
import { db } from "@/lib/db";
import type { ActivityCategory, ProjectActivity } from "@/types/activity";

// ─── Type mapper ──────────────────────────────────────────────────────────────

// Prisma ActivityCategory values are identical to the app type strings
// ("comment", "workflow", "status_change", "system") — no converter table needed.
function toActivity(p: PrismaActivity): ProjectActivity {
  return {
    id: p.id,
    projectId: p.projectId,
    category: p.category as unknown as ActivityCategory,
    activityType: p.activityType,
    userId: p.userId,
    userName: p.userName,
    message: p.message,
    richContent: p.richContent != null ? (p.richContent as JSONContent) : undefined,
    metadata: p.metadata != null ? (p.metadata as Record<string, unknown>) : undefined,
    createdAt: p.createdAt.toISOString(),
  };
}

// ─── Queries ──────────────────────────────────────────────────────────────────

export async function getProjectActivity(projectId: string): Promise<ProjectActivity[]> {
  const rows = await db.projectActivity.findMany({
    where: { projectId },
    orderBy: { createdAt: "desc" },
  });
  return rows.map(toActivity);
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export interface LogActivityInput {
  category: ActivityCategory;
  activityType: string;
  userName: string;
  userId?: string | null;
  message: string;
  richContent?: JSONContent;
  metadata?: Record<string, unknown>;
}

export async function logProjectActivity(
  projectId: string,
  input: LogActivityInput
): Promise<ProjectActivity> {
  const row = await db.projectActivity.create({
    data: {
      projectId,
      category: input.category as unknown as PrismaCategory,
      activityType: input.activityType,
      userId: input.userId ?? null,
      userName: input.userName,
      message: input.message,
      richContent: (input.richContent ?? undefined) as Prisma.InputJsonValue | undefined,
      metadata: (input.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
    },
  });
  return toActivity(row);
}

export interface CommentPayload {
  text: string;
  richContent: JSONContent;
}

export async function addProjectComment(
  projectId: string,
  userName: string,
  payload: CommentPayload,
  actingUserId?: string | null
): Promise<ProjectActivity> {
  const comment = await logProjectActivity(projectId, {
    category: "comment",
    activityType: "comment_added",
    userName,
    message: payload.text,
    richContent: payload.richContent,
  });

  // No-op: addCommentMentions and createNotification are localStorage-backed and
  // unavailable server-side. Mention audit records and notification delivery will
  // resume once those modules migrate to Postgres.
  void actingUserId;

  return comment;
}

export async function deleteProjectActivity(projectId: string, activityId: string): Promise<void> {
  // Cascade deletes in Postgres handle related Notification and CommentMention rows.
  await db.projectActivity.delete({ where: { id: activityId } });
}
