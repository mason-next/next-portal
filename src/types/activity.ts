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
  message: string;
  metadata?: Record<string, unknown>;
  createdAt: string; // ISO 8601
}
