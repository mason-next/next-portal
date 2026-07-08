export const NOTIFICATION_TYPES = [
  "mention",           // @mentioned in a comment
  "assignment",        // assigned to a task / workflow step
  "approval_needed",   // workflow step needs approval
  "approval_decision", // approval was made (approved / rejected)
  "status_change",     // project status changed
  "project_assigned",  // added to a project
  "procurement_update",// procurement event (order placed, received, etc.)
  "daily_report",      // daily report submitted
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export const NOTIFICATION_LABELS: Record<NotificationType, string> = {
  mention: "Mention",
  assignment: "Assignment",
  approval_needed: "Approval Needed",
  approval_decision: "Approval Decision",
  status_change: "Status Change",
  project_assigned: "Project Assignment",
  procurement_update: "Procurement Update",
  daily_report: "Daily Report",
};

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  projectId: string;
  projectName: string;
  commentId: string | null;
  taskCommentId: string | null;
  commentAuthor: string;
  commentPreview: string;
  message: string;
  metadata: Record<string, unknown> | null;
  isRead: boolean;
  createdAt: string;
}

export interface NewNotificationInput {
  userId: string;
  type: NotificationType;
  projectId: string;
  projectName: string;
  message: string;
  // Project comment mentions
  commentId?: string | null;
  // Implementation task comment mentions (no FK — plain dedup key)
  taskCommentId?: string | null;
  commentAuthor?: string;
  commentPreview?: string;
  // Arbitrary key-value context for future display/routing
  metadata?: Record<string, unknown>;
}
