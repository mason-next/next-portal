import { readProjectScoped, writeProjectScoped } from "@/lib/storage/local-store";
import type { CommentMention } from "@/types/comment-mention";

const COMMENT_MENTIONS_KEY = "comment-mentions";

export async function getCommentMentions(projectId: string): Promise<CommentMention[]> {
  return readProjectScoped<CommentMention[]>(projectId, COMMENT_MENTIONS_KEY) ?? [];
}

// Append-only — comments aren't editable today, so there's no update/delete path yet.
export async function addCommentMentions(
  projectId: string,
  commentId: string,
  mentionedUserIds: string[]
): Promise<CommentMention[]> {
  const existing = await getCommentMentions(projectId);
  const now = new Date().toISOString();
  const created: CommentMention[] = mentionedUserIds.map((mentionedUserId) => ({
    id: crypto.randomUUID(),
    projectId,
    commentId,
    mentionedUserId,
    createdAt: now,
  }));
  const next = [...existing, ...created];
  writeProjectScoped(projectId, COMMENT_MENTIONS_KEY, next);
  return created;
}
