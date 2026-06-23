import { readProjectScoped, writeProjectScoped } from "@/lib/storage/local-store";
import type { ActivityCategory, ProjectActivity } from "@/types/activity";

const ACTIVITY_KEY = "activity";
const LEGACY_COMMENTS_KEY = "comments";

interface LegacyComment {
  id: string;
  projectId: string;
  author: string;
  body: string;
  createdAt: string;
}

// One-time upgrade path: projects that already had comments under the old standalone
// "comments" key get them folded into the unified activity feed the first time it's read,
// instead of silently losing that history when this feature replaced ProjectCommentsCard.
function migrateLegacyComments(projectId: string): ProjectActivity[] {
  const legacy = readProjectScoped<LegacyComment[]>(projectId, LEGACY_COMMENTS_KEY);
  if (!legacy || legacy.length === 0) return [];
  return legacy.map((comment) => ({
    id: comment.id,
    projectId,
    category: "comment" as const,
    activityType: "comment_added",
    userId: null,
    userName: comment.author,
    message: comment.body,
    createdAt: comment.createdAt,
  }));
}

export async function getProjectActivity(projectId: string): Promise<ProjectActivity[]> {
  const stored = readProjectScoped<ProjectActivity[]>(projectId, ACTIVITY_KEY);
  if (stored) return stored;

  const migrated = migrateLegacyComments(projectId);
  if (migrated.length > 0) writeProjectScoped(projectId, ACTIVITY_KEY, migrated);
  return migrated;
}

export interface LogActivityInput {
  category: ActivityCategory;
  activityType: string;
  userName: string;
  userId?: string | null;
  message: string;
  metadata?: Record<string, unknown>;
}

export async function logProjectActivity(projectId: string, input: LogActivityInput): Promise<ProjectActivity> {
  const activity = await getProjectActivity(projectId);
  const record: ProjectActivity = {
    id: crypto.randomUUID(),
    projectId,
    category: input.category,
    activityType: input.activityType,
    userId: input.userId ?? null,
    userName: input.userName,
    message: input.message,
    metadata: input.metadata,
    createdAt: new Date().toISOString(),
  };
  writeProjectScoped(projectId, ACTIVITY_KEY, [record, ...activity]);
  return record;
}

export async function addProjectComment(projectId: string, userName: string, body: string): Promise<ProjectActivity> {
  return logProjectActivity(projectId, {
    category: "comment",
    activityType: "comment_added",
    userName,
    message: body,
  });
}

export async function deleteProjectActivity(projectId: string, activityId: string): Promise<void> {
  const activity = await getProjectActivity(projectId);
  writeProjectScoped(projectId, ACTIVITY_KEY, activity.filter((a) => a.id !== activityId));
}

const LAST_VIEWED_KEY = "activity-last-viewed";

export function getActivityLastViewed(projectId: string): string | null {
  return readProjectScoped<string>(projectId, LAST_VIEWED_KEY);
}

export function markActivityViewed(projectId: string): void {
  writeProjectScoped(projectId, LAST_VIEWED_KEY, new Date().toISOString());
}
