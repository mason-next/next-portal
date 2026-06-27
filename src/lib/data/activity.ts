"use server";

import type { JSONContent } from "@tiptap/core";
import {
  Prisma,
  ActivityCategory as PrismaCategory,
  type ProjectActivity as PrismaActivity,
} from "@prisma/client";
import { db } from "@/lib/db";
import { addCommentMentions } from "@/lib/data/comment-mentions";
import { notifyMention } from "@/lib/services/notification-service";
import { getProject } from "@/lib/data/projects";
import { getUsers } from "@/lib/data/users";
import { getMentionableUsers } from "@/lib/mentions/mentionable-users";
import { extractMentionedUserIdsFromDoc } from "@/lib/mentions/tiptap-mentions";
import { truncate } from "@/lib/utils";
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

  try {
    await notifyMentionedUsers(projectId, comment, userName, payload.richContent, actingUserId ?? null);
  } catch (err) {
    console.error("[addProjectComment] mention notifications failed:", err);
  }

  return comment;
}

async function notifyMentionedUsers(
  projectId: string,
  comment: ProjectActivity,
  authorName: string,
  richContent: JSONContent,
  actingUserId: string | null
): Promise<void> {
  const extractedIds = extractMentionedUserIdsFromDoc(richContent);
  if (extractedIds.length === 0) return;

  const [project, users] = await Promise.all([getProject(projectId), getUsers()]);
  if (!project) return;

  const mentionableIds = new Set(getMentionableUsers(project, users).map((u) => u.id));
  const eligibleIds = extractedIds.filter((id) => mentionableIds.has(id));
  if (eligibleIds.length === 0) return;

  await addCommentMentions(projectId, comment.id, eligibleIds);

  const notifyIds = eligibleIds.filter((id) => id !== actingUserId);
  if (notifyIds.length === 0) return;

  const commentPreview = truncate(comment.message, 120);
  await Promise.all(
    notifyIds.map((userId) =>
      notifyMention({
        recipientId: userId,
        authorName,
        projectId,
        projectName: project.name,
        commentId: comment.id,
        commentPreview,
      })
    )
  );
}

// Updates a comment's rich content and re-processes mentions.
// Old CommentMention and Notification rows for this comment are replaced with fresh ones
// so edits that add/remove mentions stay in sync.
export async function updateProjectComment(
  projectId: string,
  activityId: string,
  authorName: string,
  payload: CommentPayload,
  actingUserId: string | null
): Promise<ProjectActivity> {
  const row = await db.projectActivity.update({
    where: { id: activityId },
    data: {
      message: payload.text,
      richContent: payload.richContent as Prisma.InputJsonValue,
    },
  });
  const updated = toActivity(row);

  // Re-process mentions: delete old records for this comment, then re-create from new content
  await db.commentMention.deleteMany({ where: { commentId: activityId } });
  await db.notification.deleteMany({ where: { commentId: activityId } });

  try {
    await notifyMentionedUsers(projectId, updated, authorName, payload.richContent, actingUserId);
  } catch (err) {
    console.error("[updateProjectComment] mention notifications failed:", err);
  }

  return updated;
}

export async function deleteProjectActivity(projectId: string, activityId: string): Promise<void> {
  // Cascade deletes in Postgres handle related Notification and CommentMention rows.
  await db.projectActivity.delete({ where: { id: activityId } });
}
