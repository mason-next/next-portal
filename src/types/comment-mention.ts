export interface CommentMention {
  id: string;
  projectId: string;
  commentId: string; // ProjectActivity.id
  mentionedUserId: string;
  createdAt: string; // ISO 8601
}
