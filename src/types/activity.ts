import type { JSONContent } from "@tiptap/core";

export const ACTIVITY_CATEGORIES = ["comment", "workflow", "status_change", "system"] as const;

export type ActivityCategory = (typeof ACTIVITY_CATEGORIES)[number];

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
  richContent?: JSONContent;
  metadata?: Record<string, unknown>;
  createdAt: string; // ISO 8601
}
