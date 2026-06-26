"use server";

import type { JSONContent } from "@tiptap/core";
import {
  Prisma,
  ActivityCategory as PrismaCategory,
  type ProjectActivity as PrismaActivity,
} from "@prisma/client";
import { db } from "@/lib/db";
import { addCommentMentions } from "@/lib/data/comment-mentions";
import { createNotification } from "@/lib/data/notifications";
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

  await notifyMentionedUsers(projectId, comment, userName, payload.richContent, actingUserId ?? null);

  return comment;
}

// addCommentMentions is now Prisma-backed and live.
// createNotification is still localStorage-backed — calls below are silent no-ops on
// the server (isBrowser() guard in local-store.ts). Notification delivery will resume
// once the Notifications module migrates to Postgres.
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
      createNotification({
        userId,
        type: "mention",
        projectId,
        projectName: project.name,
        commentId: comment.id,
        commentAuthor: authorName,
        commentPreview,
        message: `${authorName} mentioned you in ${project.name}`,
      })
    )
  );
}

export async function deleteProjectActivity(projectId: string, activityId: string): Promise<void> {
  // Cascade deletes in Postgres handle related Notification and CommentMention rows.
  await db.projectActivity.delete({ where: { id: activityId } });
}
