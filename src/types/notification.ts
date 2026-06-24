export const NOTIFICATION_TYPES = ["mention"] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export interface Notification {
  id: string;
  userId: string; // recipient — AppUser.id
  type: NotificationType;
  projectId: string;
  projectName: string; // frozen at creation — survives a later project rename
  commentId: string; // ProjectActivity.id
  commentAuthor: string;
  commentPreview: string;
  // Precomputed display string (e.g. "Dana mentioned you in 123 Main St") so
  // the notification bell never needs type-specific message-building logic —
  // a future NotificationType just needs its own creation call site.
  message: string;
  isRead: boolean;
  createdAt: string; // ISO 8601
}

export interface NewNotificationInput {
  userId: string;
  type: NotificationType;
  projectId: string;
  projectName: string;
  commentId: string;
  commentAuthor: string;
  commentPreview: string;
  message: string;
}
