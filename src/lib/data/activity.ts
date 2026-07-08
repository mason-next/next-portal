"use server";

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
import type { ActivityCategory, ActivityTag, ProjectActivity, RichContent } from "@/types/activity";
import type { CommentAttachment } from "@/types/attachments";

function parseAttachments(raw: unknown): CommentAttachment[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (a): a is CommentAttachment =>
      a !== null &&
      typeof a === "object" &&
      typeof (a as Record<string, unknown>).storagePath === "string"
  );
}

function toActivity(p: PrismaActivity): ProjectActivity {
  const pAny = p as unknown as { attachments?: unknown };
  const attachments = parseAttachments(pAny.attachments);
  return {
    id: p.id,
    projectId: p.projectId,
    category: p.category as unknown as ActivityCategory,
    activityType: p.activityType,
    userId: p.userId,
    userName: p.userName,
    message: p.message,
    richContent: p.richContent != null ? (p.richContent as RichContent) : undefined,
    metadata: p.metadata != null ? (p.metadata as Record<string, unknown>) : undefined,
    attachments: attachments.length > 0 ? attachments : undefined,
    tag: ((p.tag ?? "General") as ActivityTag),
    createdAt: p.createdAt.toISOString(),
  };
}

export interface LogActivityInput {
  category: ActivityCategory;
  activityType: string;
  userName: string;
  userId?: string | null;
  message: string;
  richContent?: RichContent;
  metadata?: Record<string, unknown>;
  attachments?: CommentAttachment[];
  tag?: ActivityTag;
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
      tag: input.tag ?? "General",
      ...(input.attachments && input.attachments.length > 0
        ? { attachments: input.attachments as unknown as Prisma.InputJsonValue }
        : {}),
    },
  });
  return toActivity(row);
}

// ─── Queries ──────────────────────────────────────────────────────────────────

export async function getProjectActivity(projectId: string): Promise<ProjectActivity[]> {
  const rows = await db.projectActivity.findMany({
    where: { projectId },
    orderBy: { createdAt: "desc" },
  });
  return rows.map(toActivity);
}

// Returns only comments tagged "Status" — used by the Project Brief Report.
export async function getStatusComments(projectId: string): Promise<ProjectActivity[]> {
  const rows = await db.projectActivity.findMany({
    where: { projectId, tag: "Status" },
    orderBy: { createdAt: "desc" },
  });
  return rows.map(toActivity);
}

// ─── Mutations ────────────────────────────────────────────────────────────────

// richContentJson is a JSON-serialized RichContent string — passing the raw TipTap JSONContent
// object through the RSC flight layer triggers "Cannot access toStringTag on the server" because
// the flight deserializer treats complex objects from "use client" modules as temporary client
// references. Stringifying on the client and parsing here avoids that proxy trap.
export interface CommentPayload {
  text: string;
  richContentJson: string;
  attachments?: CommentAttachment[];
  // Optional tag; defaults to "General" if omitted.
  tag?: ActivityTag;
}

export async function addProjectComment(
  projectId: string,
  userName: string,
  payload: CommentPayload,
  actingUserId?: string | null
): Promise<ProjectActivity> {
  const richContent = JSON.parse(payload.richContentJson) as RichContent;
  const comment = await logProjectActivity(projectId, {
    category: "comment",
    activityType: "comment_added",
    userName,
    message: payload.text,
    richContent,
    attachments: payload.attachments,
    tag: payload.tag ?? "General",
  });

  try {
    await notifyMentionedUsers(projectId, comment, userName, richContent, actingUserId ?? null);
  } catch (err) {
    console.error("[addProjectComment] mention notifications failed:", err);
  }

  return comment;
}

// prevMentionedIds: user IDs already notified in a prior version of this comment.
// When provided (edit path), only newly-added mentions receive a notification/email.
// CommentMention rows are always written for ALL current mentions regardless.
async function notifyMentionedUsers(
  projectId: string,
  comment: ProjectActivity,
  authorName: string,
  richContent: RichContent,
  actingUserId: string | null,
  prevMentionedIds: Set<string> = new Set()
): Promise<void> {
  const extractedIds = extractMentionedUserIdsFromDoc(richContent);
  if (extractedIds.length === 0) return;

  const [project, users] = await Promise.all([getProject(projectId), getUsers()]);
  if (!project) return;

  const mentionableIds = new Set(getMentionableUsers(project, users).map((u) => u.id));
  const eligibleIds = extractedIds.filter((id) => mentionableIds.has(id));
  if (eligibleIds.length === 0) return;

  await addCommentMentions(projectId, comment.id, eligibleIds);

  // Notify only newly-added mentions — skip author and previously-notified users.
  const notifyIds = eligibleIds.filter(
    (id) => id !== actingUserId && !prevMentionedIds.has(id)
  );
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

// Updates a comment's rich content and/or tag, then re-processes mentions.
// Only users who are *newly* added in the edit receive a notification/email —
// users already mentioned in the original comment are not re-notified.
export async function updateProjectComment(
  projectId: string,
  activityId: string,
  authorName: string,
  payload: CommentPayload,
  actingUserId: string | null
): Promise<ProjectActivity> {
  const richContent = JSON.parse(payload.richContentJson) as RichContent;

  // Capture previously mentioned user IDs before wiping the slate.
  const prevMentions = await db.commentMention.findMany({
    where: { commentId: activityId },
    select: { mentionedUserId: true },
  });
  const prevMentionedIds = new Set(prevMentions.map((m) => m.mentionedUserId));

  const row = await db.projectActivity.update({
    where: { id: activityId },
    data: {
      message: payload.text,
      richContent: richContent as Prisma.InputJsonValue,
      ...(payload.tag !== undefined ? { tag: payload.tag } : {}),
    },
  });
  const updated = toActivity(row);

  // Reset mention and notification records for this comment.
  await db.commentMention.deleteMany({ where: { commentId: activityId } });
  await db.notification.deleteMany({ where: { commentId: activityId } });

  try {
    // notifyMentionedUsers will re-create CommentMention rows for ALL current mentions,
    // but we pass prevMentionedIds so it only fires notifications for newly-added ones.
    await notifyMentionedUsers(
      projectId, updated, authorName, richContent, actingUserId, prevMentionedIds
    );
  } catch (err) {
    console.error("[updateProjectComment] mention notifications failed:", err);
  }

  return updated;
}

export async function deleteProjectActivity(projectId: string, activityId: string): Promise<void> {
  // Cascade deletes in Postgres handle related Notification and CommentMention rows.
  await db.projectActivity.delete({ where: { id: activityId } });
}
