// Local mirror of Tiptap's JSONContent — lets server-side files type-check richContent
// without importing from the @tiptap client package and triggering an RSC boundary error.
export interface RichContent {
  type?: string;
  attrs?: Record<string, unknown>;
  content?: RichContent[];
  marks?: Array<{ type: string; attrs?: Record<string, unknown>; [key: string]: unknown }>;
  text?: string;
  [key: string]: unknown;
}

export const ACTIVITY_CATEGORIES = ["comment", "workflow", "status_change", "system"] as const;
export type ActivityCategory = (typeof ACTIVITY_CATEGORIES)[number];

// User-visible classification on a project comment.
// "General" — ordinary project note (default, no badge shown)
// "Status"  — customer-facing status update (appears in Project Brief Reports)
export type ActivityTag = "General" | "Status";

export interface ProjectActivity {
  id: string;
  projectId: string;
  category: ActivityCategory;
  // Machine-readable subtype (e.g. "comment_added", "step_completed", "field_changed",
  // "welcome_letter_sent") — lets future UI filter/icon-match without parsing `message`.
  activityType: string;
  userId: string | null;
  userName: string;
  // Plain-text body. For comments authored via the rich editor, this is a plain-text
  // extraction of richContent (used for notification previews and as the render fallback for
  // any caller that doesn't know about richContent). For every other category, unchanged.
  message: string;
  // Present only on comments authored via RichCommentEditor (see ProjectActivityDrawer).
  // Comments from before this field existed have none — they keep rendering through the
  // legacy markdown-lite MentionText path off `message` alone, forever. Fully additive.
  richContent?: RichContent;
  metadata?: Record<string, unknown>;
  attachments?: import("@/types/attachments").CommentAttachment[];
  // Classification tag — defaults to "General" for all pre-existing rows.
  tag: ActivityTag;
  createdAt: string; // ISO 8601
}

// A task comment surfaced in the unified Project Activity feed.
// These come from ImplementationTaskComment joined through the task to the project.
export interface TaskCommentFeedItem {
  _kind: "task";
  id: string;       // ImplementationTaskComment.id
  taskId: string;
  taskName: string;
  userId: string | null;
  userName: string;
  richContent: RichContent | null;
  plainText: string;
  attachments?: import("@/types/attachments").CommentAttachment[];
  createdAt: string; // ISO 8601
  stepSection?: string | null; // WorkflowSection of the task's linked workflow step
}
