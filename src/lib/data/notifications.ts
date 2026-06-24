import { readGlobal, writeGlobal } from "@/lib/storage/local-store";
import type { NewNotificationInput, Notification } from "@/types/notification";

const NOTIFICATIONS_KEY = "notifications";

// Global (not project-scoped) — a user can be mentioned across many different projects, and
// the notification bell needs to query across all of them by userId regardless of project.
function loadAll(): Notification[] {
  return readGlobal<Notification[]>(NOTIFICATIONS_KEY) ?? [];
}

export async function getNotificationsForUser(userId: string): Promise<Notification[]> {
  return loadAll()
    .filter((n) => n.userId === userId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

// Dedup key is (userId, commentId, type) — NOT (userId, projectId, type): a second comment in
// the same project mentioning the same person is a genuinely new event and should still notify.
// Returns null on a dedup no-op rather than throwing, since callers loop over multiple
// mentioned users and a skip for one of them isn't an error.
export async function createNotification(input: NewNotificationInput): Promise<Notification | null> {
  const all = loadAll();
  const isDuplicate = all.some(
    (n) => n.userId === input.userId && n.commentId === input.commentId && n.type === input.type
  );
  if (isDuplicate) return null;

  const record: Notification = {
    id: crypto.randomUUID(),
    isRead: false,
    createdAt: new Date().toISOString(),
    ...input,
  };
  writeGlobal(NOTIFICATIONS_KEY, [record, ...all]);
  return record;
}

export async function markNotificationRead(id: string): Promise<void> {
  const all = loadAll();
  writeGlobal(
    NOTIFICATIONS_KEY,
    all.map((n) => (n.id === id ? { ...n, isRead: true } : n))
  );
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  const all = loadAll();
  writeGlobal(
    NOTIFICATIONS_KEY,
    all.map((n) => (n.userId === userId ? { ...n, isRead: true } : n))
  );
}

// Used by deleteProject's cleanup — notifications aren't stored under a project-scoped key, so
// they need an explicit filter-and-rewrite instead of removeProjectScoped.
export async function deleteNotificationsForProject(projectId: string): Promise<void> {
  const all = loadAll();
  writeGlobal(NOTIFICATIONS_KEY, all.filter((n) => n.projectId !== projectId));
}
