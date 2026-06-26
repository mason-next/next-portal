"use server";

import { type CommentMention as PrismaMention } from "@prisma/client";
import { db } from "@/lib/db";
import type { CommentMention } from "@/types/comment-mention";

// ─── Type mapper ──────────────────────────────────────────────────────────────

function toMention(p: PrismaMention): CommentMention {
  return {
    id: p.id,
    projectId: p.projectId,
    commentId: p.commentId,
    mentionedUserId: p.mentionedUserId,
    createdAt: p.createdAt.toISOString(),
  };
}

// ─── Queries ──────────────────────────────────────────────────────────────────

export async function getCommentMentions(projectId: string): Promise<CommentMention[]> {
  const rows = await db.commentMention.findMany({
    where: { projectId },
    orderBy: { createdAt: "asc" },
  });
  return rows.map(toMention);
}

// ─── Mutations ────────────────────────────────────────────────────────────────

// Append-only — comments aren't editable, so there's no update/delete path.
// Deletion is handled by Postgres cascade when the parent ProjectActivity is deleted.
export async function addCommentMentions(
  projectId: string,
  commentId: string,
  mentionedUserIds: string[]
): Promise<CommentMention[]> {
  if (mentionedUserIds.length === 0) return [];

  const data = mentionedUserIds.map((mentionedUserId) => ({
    projectId,
    commentId,
    mentionedUserId,
  }));

  await db.commentMention.createMany({ data });

  // Re-fetch to return the created rows with server-generated id and createdAt.
  const created = await db.commentMention.findMany({
    where: { commentId, mentionedUserId: { in: mentionedUserIds } },
    orderBy: { createdAt: "asc" },
  });
  return created.map(toMention);
}
