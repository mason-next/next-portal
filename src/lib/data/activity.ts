import type { JSONContent } from "@tiptap/core";
import { readProjectScoped, writeProjectScoped } from "@/lib/storage/local-store";
import { addCommentMentions } from "@/lib/data/comment-mentions";
import { createNotification } from "@/lib/data/notifications";
import { getProject } from "@/lib/data/projects";
import { getUsers } from "@/lib/data/users";
import { getMentionableUsers } from "@/lib/mentions/mentionable-users";
import { extractMentionedUserIdsFromDoc } from "@/lib/mentions/tiptap-mentions";
import { truncate } from "@/lib/utils";
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
  richContent?: JSONContent;
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
    richContent: input.richContent,
    metadata: input.metadata,
    createdAt: new Date().toISOString(),
  };
  writeProjectScoped(projectId, ACTIVITY_KEY, [record, ...activity]);
  return record;
}

export interface CommentPayload {
  text: string;
  richContent: JSONContent;
}

export async function addProjectComment(
  projectId: string,
  userName: string,
  payload: CommentPayload,
  actingUserId?: string | null
): Promise<ProjectActivity> {
  const comment = await logProjectActivity(projectId, {
    category: "comment",
    activityType: "comment_added",
    userName,
    message: payload.text,
    richContent: payload.richContent,
  });

  await notifyMentionedUsers(projectId, comment, userName, payload.richContent, actingUserId ?? null);

  return comment;
}

// A mention only produces a notification if the mentioned user is currently eligible per
// getMentionableUsers — the dropdown that inserted the mention is just UX convenience, this is
// the authoritative check (eligibility can change between typing and posting).
async function notifyMentionedUsers(
  projectId: string,
  comment: ProjectActivity,
  authorName: string,
  richContent: JSONContent,
  actingUserId: string | null
): Promise<void> {
  const extractedIds = extractMentionedUserIdsFromDoc(richContent);
  if (extractedIds.length === 0) return;

  const [project, users] = await Promise.all([getProject(projectId), getUsers()]);
  if (!project) return;

  const mentionableIds = new Set(getMentionableUsers(project, users).map((u) => u.id));
  const eligibleIds = extractedIds.filter((id) => mentionableIds.has(id));
  if (eligibleIds.length === 0) return;

  // Audit record of who was tagged — written for every eligible mention, including a
  // self-mention, independent of whether a Notification gets created for it.
  await addCommentMentions(projectId, comment.id, eligibleIds);

  const notifyIds = eligibleIds.filter((id) => id !== actingUserId);
  const commentPreview = truncate(comment.message, 120);

  await Promise.all(
    notifyIds.map((userId) =>
      createNotification({
        userId,
        type: "mention",
        projectId,
        projectName: project.name,
        commentId: comment.id,
        commentAuthor: authorName,
        commentPreview,
        message: `${authorName} mentioned you in ${project.name}`,
      })
    )
  );
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
