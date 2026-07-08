"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Activity, BarChart2, CheckCircle2, CheckSquare, MessageSquare, RefreshCw, Search, Settings2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UserAvatarImage } from "@/components/shared/AppShell/UserAvatarImage";
import { useUsersContext } from "@/components/shared/AppShell/UsersProvider";
import { MentionText } from "@/components/shared/MentionText";
import { RichCommentEditor, type RichCommentEditorHandle } from "@/components/shared/RichCommentEditor";
import { RichCommentView } from "@/components/shared/RichCommentView";
import { CommentAttachmentArea } from "@/components/shared/CommentAttachmentArea";
import {
  addProjectComment,
  deleteProjectActivity,
  getProjectActivity,
  updateProjectComment,
} from "@/lib/data/activity";
import { addTaskComment, getProjectTaskComments, getProjectTasks } from "@/lib/data/implementation";
import { getActivityLastViewed, markActivityViewed } from "@/lib/data/activity-client";
import { useSession } from "@/lib/auth/client";
import { useCurrentUserAvatar } from "@/lib/hooks/useCurrentUserAvatar";
import { getMentionableUsers } from "@/lib/mentions/mentionable-users";
import { readGlobal, writeGlobal } from "@/lib/storage/local-store";
import { cn } from "@/lib/utils";
import { useProjectContext } from "@/modules/project-command-center/hooks/ProjectContext";
import type { ActivityCategory, ActivityTag, ProjectActivity, TaskCommentFeedItem } from "@/types/activity";
import type { CommentAttachment } from "@/types/attachments";
import type { ImplementationTask } from "@/types/implementation";
import type { AppUser } from "@/types/user";

// Local-storage-backed, single-user prototype — there's no push channel, so a light poll
// while the drawer is mounted is what keeps the unread badge from going stale when an
// action on another tab of this same project (e.g. completing a workflow step) logs activity.
const POLL_INTERVAL_MS = 6000;

// Display-only preference — never affects what's logged, the unread badge, or the
// underlying activity records, just which rows render in the panel.
const HIDE_NON_COMMENTS_KEY = "project-activity:hide-non-comments";

const CATEGORY_ICON: Record<ActivityCategory, typeof MessageSquare> = {
  comment: MessageSquare,
  workflow: CheckCircle2,
  status_change: RefreshCw,
  system: Settings2,
};

const CATEGORY_TONE: Record<ActivityCategory, string> = {
  comment: "bg-sky-100 text-sky-700",
  workflow: "bg-emerald-100 text-emerald-700",
  status_change: "bg-amber-100 text-amber-700",
  system: "bg-slate-100 text-slate-700",
};

// Unified feed item — either a project-level activity or a task comment.
type FeedItem =
  | (ProjectActivity & { _kind: "project" })
  | TaskCommentFeedItem;

function dateGroupLabel(isoDate: string): string {
  const date = new Date(isoDate);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

  if (sameDay(date, today)) return "Today";
  if (sameDay(date, yesterday)) return "Yesterday";
  return date.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
}

function groupByDate(items: FeedItem[]): { label: string; items: FeedItem[] }[] {
  const groups: { label: string; items: FeedItem[] }[] = [];
  for (const item of items) {
    const label = dateGroupLabel(item.createdAt);
    const lastGroup = groups[groups.length - 1];
    if (lastGroup?.label === label) {
      lastGroup.items.push(item);
    } else {
      groups.push({ label, items: [item] });
    }
  }
  return groups;
}

export function ProjectActivityDrawer({ projectId }: { projectId: string }) {
  const session = useSession();
  const { project } = useProjectContext();
  const { users } = useUsersContext();
  const dbAvatar = users?.find((u) => u.id === session.id)?.avatarUrl ?? null;
  const currentUserAvatar = useCurrentUserAvatar(dbAvatar);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const [activity, setActivity] = useState<ProjectActivity[] | null>(null);
  const [taskComments, setTaskComments] = useState<TaskCommentFeedItem[]>([]);
  const [lastViewed, setLastViewed] = useState<string | null>(() => getActivityLastViewed(projectId));
  const [isDraftEmpty, setIsDraftEmpty] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [postError, setPostError] = useState<string | null>(null);
  const [pendingAttachments, setPendingAttachments] = useState<CommentAttachment[]>([]);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const [hideNonComments, setHideNonComments] = useState(false);
  // Slash-command state — tracks what "/" selected before the user types the comment body.
  const [slashTag, setSlashTag] = useState<"status" | "task" | null>(null);
  const [attachedTask, setAttachedTask] = useState<{ id: string; title: string } | null>(null);
  const [showTaskPicker, setShowTaskPicker] = useState(false);
  const [taskPickerQuery, setTaskPickerQuery] = useState("");
  const [projectTasks, setProjectTasks] = useState<ImplementationTask[] | null>(null);
  const editorRef = useRef<RichCommentEditorHandle>(null);

  useEffect(() => {
    queueMicrotask(() => setHideNonComments(readGlobal<boolean>(HIDE_NON_COMMENTS_KEY) ?? false));
  }, []);

  function toggleHideNonComments() {
    setHideNonComments((prev) => {
      const next = !prev;
      writeGlobal(HIDE_NON_COMMENTS_KEY, next);
      return next;
    });
  }

  // Drawer persists across project navigations (layout isn't remounted on param change), so
  // the lazy useState initializer above only fires once — re-derive lastViewed during render
  // when projectId actually changes, per React's recommended "adjusting state on prop change" pattern.
  const [trackedProjectId, setTrackedProjectId] = useState(projectId);
  if (projectId !== trackedProjectId) {
    setTrackedProjectId(projectId);
    setLastViewed(getActivityLastViewed(projectId));
  }

  async function refresh() {
    const [loaded, taskLoaded] = await Promise.all([
      getProjectActivity(projectId),
      getProjectTaskComments(projectId),
    ]);
    setActivity(loaded);
    setTaskComments(taskLoaded);
  }

  useEffect(() => {
    let active = true;
    const poll = () => {
      Promise.all([
        getProjectActivity(projectId).catch(() => null),
        getProjectTaskComments(projectId).catch(() => null),
      ]).then(([loaded, taskLoaded]) => {
        if (!active) return;
        if (loaded) setActivity(loaded);
        if (taskLoaded) setTaskComments(taskLoaded);
      });
    };
    poll();
    const interval = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [projectId]);

  // Deep link from a notification: "?activity=<commentId>" forces the drawer open, scrolls to
  // and briefly highlights the matching comment, then strips the param so a later refresh
  // doesn't redundantly reopen/rescroll. Fails soft (opens with no scroll) if the id is stale.
  useEffect(() => {
    const targetId = searchParams.get("activity");
    if (!targetId || activity === null) return;

    let timeout: ReturnType<typeof setTimeout> | undefined;
    queueMicrotask(() => {
      setOpen(true);
      if (activity.some((a) => a.id === targetId) || taskComments.some((tc) => tc.id === targetId)) {
        document.getElementById(`activity-${targetId}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
        setHighlightedId(targetId);
        timeout = setTimeout(() => setHighlightedId(null), 2500);
      }
      router.replace(pathname, { scroll: false });
    });

    return () => {
      if (timeout) clearTimeout(timeout);
    };
  }, [searchParams, activity, taskComments, pathname, router]);

  function handleOpen() {
    setOpen(true);
    markActivityViewed(projectId);
    setLastViewed(new Date().toISOString());
  }

  function handleSlashCommand(cmd: "status" | "task") {
    setSlashTag(cmd);
    if (cmd === "task") {
      setShowTaskPicker(true);
      // Lazy-load project tasks the first time the task picker is opened.
      if (!projectTasks) {
        getProjectTasks(projectId).then(setProjectTasks).catch(() => setProjectTasks([]));
      }
    }
  }

  function clearSlashCommand() {
    setSlashTag(null);
    setAttachedTask(null);
    setShowTaskPicker(false);
    setTaskPickerQuery("");
  }

  function handleTaskSelect(task: ImplementationTask) {
    setAttachedTask({ id: task.id, title: task.title });
    setShowTaskPicker(false);
    setTaskPickerQuery("");
    editorRef.current?.focus();
  }

  async function handlePost() {
    const editor = editorRef.current;
    if (!editor || (editor.isEmpty() && pendingAttachments.length === 0)) return;
    // "task" mode requires a task to be selected before posting.
    if (slashTag === "task" && !attachedTask) return;
    setSubmitting(true);
    setPostError(null);
    try {
      const { richContent, text } = editor.getPayload();
      if (slashTag === "task" && attachedTask) {
        // Route directly into the task's comment thread — surfaces in both the TaskDrawer
        // and the ActivityDrawer's unified feed (via getProjectTaskComments poll).
        await addTaskComment(attachedTask.id, JSON.stringify(richContent), text, pendingAttachments);
      } else {
        await addProjectComment(
          projectId,
          session.name,
          {
            text,
            richContentJson: JSON.stringify(richContent),
            attachments: pendingAttachments,
            tag: slashTag === "status" ? "Status" : "General",
          },
          session.id
        );
      }
      editor.clear();
      setIsDraftEmpty(true);
      setPendingAttachments([]);
      setSlashTag(null);
      setAttachedTask(null);
    } catch (err) {
      console.error("[handlePost] failed:", err);
      setPostError(err instanceof Error ? err.message : "Failed to post comment. Please try again.");
    } finally {
      setSubmitting(false);
      refresh();
    }
  }

  async function handleDelete(activityId: string) {
    await deleteProjectActivity(projectId, activityId);
    refresh();
  }

  const mentionableUsers = project ? getMentionableUsers(project, users) : [];

  // Build the unified feed: merge project activity + task comments, sort newest-first.
  const feedItems: FeedItem[] = [
    ...(activity ?? []).map((a) => ({ ...a, _kind: "project" as const })),
    ...taskComments,
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const unreadCount = feedItems.filter(
    (item) => !lastViewed || new Date(item.createdAt) > new Date(lastViewed)
  ).length;

  const visibleItems = hideNonComments
    ? feedItems.filter((item) => item._kind === "task" || item.category === "comment")
    : feedItems;

  const groups = groupByDate(visibleItems);

  const filteredTasks = (projectTasks ?? []).filter(
    (t) => !taskPickerQuery || t.title.toLowerCase().includes(taskPickerQuery.toLowerCase())
  );

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-foreground text-background shadow-lg transition-transform hover:scale-105"
        title="Project activity"
      >
        <Activity className="h-6 w-6" />
        {unreadCount > 0 ? (
          <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-xs font-semibold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        ) : null}
      </button>

      <div
        className={cn(
          "fixed inset-0 z-40 bg-black/30 transition-opacity",
          open ? "opacity-100" : "pointer-events-none opacity-0"
        )}
        onClick={() => setOpen(false)}
      />

      <div
        className={cn(
          "fixed inset-y-0 right-0 z-40 flex w-full sm:max-w-md flex-col border-l bg-card shadow-2xl transition-transform duration-200 ease-out",
          open ? "translate-x-0" : "translate-x-full"
        )}
        role="dialog"
        aria-label="Project activity"
      >
        <div className="flex items-center justify-between border-b px-5 py-4">
          <span className="text-sm font-semibold">Project Activity</span>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={toggleHideNonComments}
              className="text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
            >
              {hideNonComments ? "Show all activity" : "Hide activity"}
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              title="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="border-b p-4">
          <div className="flex gap-2.5">
            <UserAvatarImage name={session.name} avatarUrl={currentUserAvatar} size={28} />
            <div className="min-w-0 flex-1">
              {open && (
                <>
                  <RichCommentEditor
                    // Tiptap's useEditor only re-creates the editor (and its closure-captured
                    // extension config, incl. the mention suggestion's user roster) when this
                    // component remounts — the drawer persists across project navigations, so key
                    // on projectId to force a fresh editor (and fresh roster) per project.
                    key={projectId}
                    ref={editorRef}
                    placeholder="Write an update or note… (type / for commands, @ to mention)"
                    users={mentionableUsers}
                    onSubmitShortcut={handlePost}
                    onEmptyChange={setIsDraftEmpty}
                    onSlashCommand={handleSlashCommand}
                  />
                  <CommentAttachmentArea
                    attachments={pendingAttachments}
                    onAdd={(a) => setPendingAttachments((prev) => [...prev, a])}
                    onRemove={(i) => setPendingAttachments((prev) => prev.filter((_, idx) => idx !== i))}
                    disabled={submitting}
                  />

                  {/* Task picker — rendered inline when "Project Task" is selected */}
                  {showTaskPicker && (
                    <div className="mt-1.5 rounded-md border bg-card shadow-md">
                      <div className="flex items-center gap-2 border-b px-2.5 py-1.5">
                        <Search className="size-3.5 shrink-0 text-muted-foreground" />
                        <input
                          autoFocus
                          type="text"
                          placeholder="Search tasks…"
                          value={taskPickerQuery}
                          onChange={(e) => setTaskPickerQuery(e.target.value)}
                          className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                          onKeyDown={(e) => {
                            if (e.key === "Escape") {
                              clearSlashCommand();
                              editorRef.current?.focus();
                            }
                          }}
                          onBlur={() => {
                            // Delay so mousedown on a task row fires before blur dismisses the picker.
                            setTimeout(() => {
                              setShowTaskPicker(false);
                              if (!attachedTask) setSlashTag(null);
                              setTaskPickerQuery("");
                            }, 150);
                          }}
                        />
                      </div>
                      <div className="max-h-44 overflow-y-auto py-1">
                        {!projectTasks ? (
                          <p className="px-3 py-2 text-xs text-muted-foreground">Loading tasks…</p>
                        ) : filteredTasks.length === 0 ? (
                          <p className="px-3 py-2 text-xs text-muted-foreground">No tasks found.</p>
                        ) : (
                          filteredTasks.map((task) => (
                            <button
                              key={task.id}
                              type="button"
                              onMouseDown={(e) => {
                                e.preventDefault();
                                handleTaskSelect(task);
                              }}
                              className="flex w-full flex-col gap-0.5 px-3 py-2 text-left text-sm hover:bg-accent"
                            >
                              <span className="truncate font-medium">{task.title}</span>
                              {task.workflowStepName && (
                                <span className="text-xs text-muted-foreground">{task.workflowStepName}</span>
                              )}
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  )}

                  {/* Active-tag chips with X-to-remove */}
                  {(slashTag === "status" || (slashTag === "task" && attachedTask)) && (
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {slashTag === "status" && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-700 dark:bg-violet-900/40 dark:text-violet-300">
                          <BarChart2 className="size-3" />
                          Status Update
                          <button
                            type="button"
                            onClick={clearSlashCommand}
                            className="ml-0.5 rounded-full p-0.5 hover:bg-violet-200 dark:hover:bg-violet-800/60"
                            title="Remove"
                          >
                            <X className="size-2.5" />
                          </button>
                        </span>
                      )}
                      {slashTag === "task" && attachedTask && (
                        <span className="inline-flex max-w-full items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                          <CheckSquare className="size-3 shrink-0" />
                          <span className="truncate">Task: {attachedTask.title}</span>
                          <button
                            type="button"
                            onClick={clearSlashCommand}
                            className="ml-0.5 shrink-0 rounded-full p-0.5 hover:bg-amber-200 dark:hover:bg-amber-800/60"
                            title="Remove"
                          >
                            <X className="size-2.5" />
                          </button>
                        </span>
                      )}
                    </div>
                  )}

                  {postError && (
                    <p className="mt-1 text-xs text-destructive">{postError}</p>
                  )}
                  <div className="mt-1.5 flex items-center justify-end gap-2">
                    <Button
                      size="xs"
                      onClick={handlePost}
                      disabled={
                        submitting ||
                        (isDraftEmpty && pendingAttachments.length === 0) ||
                        (slashTag === "task" && !attachedTask)
                      }
                    >
                      {submitting
                        ? "Posting…"
                        : slashTag === "task" && !attachedTask
                          ? "Select a task above"
                          : "Comment"}
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {activity === null ? (
            <p className="text-sm text-muted-foreground">Loading activity…</p>
          ) : visibleItems.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {hideNonComments && feedItems.length > 0 ? "No comments yet." : "No activity yet."}
            </p>
          ) : (
            <div className="space-y-5">
              {groups.map((group) => (
                <div key={group.label}>
                  <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {group.label}
                  </div>
                  <div className="space-y-3">
                    {group.items.map((item) => (
                      <ActivityRow
                        key={item.id}
                        item={item}
                        projectId={projectId}
                        currentUserName={session.name}
                        currentUserId={session.id}
                        currentUserAvatar={currentUserAvatar}
                        mentionableUsers={mentionableUsers}
                        onDelete={handleDelete}
                        onEdited={refresh}
                        highlighted={item.id === highlightedId}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function ActivityRow({
  item,
  projectId,
  currentUserName,
  currentUserId,
  currentUserAvatar,
  mentionableUsers,
  onDelete,
  onEdited,
  highlighted,
}: {
  item: FeedItem;
  projectId: string;
  currentUserName: string;
  currentUserId: string;
  currentUserAvatar: string | null;
  mentionableUsers: AppUser[];
  onDelete: (activityId: string) => void;
  onEdited: () => void;
  highlighted: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editEmpty, setEditEmpty] = useState(false);
  const [editIsStatus, setEditIsStatus] = useState(false);
  const editRef = useRef<RichCommentEditorHandle>(null);

  const time = new Date(item.createdAt).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });

  // ── Task comment row ──────────────────────────────────────────────────────────
  if (item._kind === "task") {
    const implUrl = `/projects/${projectId}/implementation`;
    return (
      <div id={`activity-${item.id}`} className={cn("flex gap-2.5", highlighted && "ring-2 ring-primary rounded-lg")}>
        <UserAvatarImage
          name={item.userName}
          avatarUrl={item.userName === currentUserName ? currentUserAvatar : null}
          size={28}
        />
        <div className="min-w-0 flex-1 rounded-lg bg-violet-50 dark:bg-violet-950/20 border border-violet-200 dark:border-violet-800 p-2.5">
          <div className="flex flex-wrap items-center justify-between gap-1">
            <span className="text-sm font-semibold">{item.userName}</span>
            <span className="text-xs text-muted-foreground">{time}</span>
          </div>
          <Link
            href={implUrl}
            className="mt-1 inline-flex items-center gap-1 rounded-full bg-violet-100 dark:bg-violet-900/40 px-2 py-0.5 text-xs font-medium text-violet-700 dark:text-violet-300 hover:bg-violet-200 dark:hover:bg-violet-800/60 transition-colors"
            title={`Open task: ${item.taskName}`}
          >
            <span className="opacity-60">Task:</span>
            <span className="truncate max-w-[180px]">{item.taskName}</span>
          </Link>
          <div className="prose-comment mt-1.5 text-sm">
            {item.richContent ? (
              <RichCommentView doc={item.richContent} attachments={item.attachments} />
            ) : (
              <p className="text-sm text-foreground">{item.plainText}</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── Project comment row ───────────────────────────────────────────────────────
  const projItem = item as ProjectActivity & { _kind: "project" };
  const isOwn = projItem.userName === currentUserName;

  function handleStartEdit() {
    setEditIsStatus(projItem.tag === "Status");
    setEditing(true);
  }

  async function handleSaveEdit() {
    const editor = editRef.current;
    if (!editor || editor.isEmpty()) return;
    setSaving(true);
    try {
      const { richContent, text } = editor.getPayload();
      await updateProjectComment(
        projectId,
        projItem.id,
        currentUserName,
        { text, richContentJson: JSON.stringify(richContent), tag: editIsStatus ? "Status" : "General" },
        currentUserId
      );
      setEditing(false);
      onEdited();
    } finally {
      setSaving(false);
    }
  }

  if (projItem.category === "comment") {
    return (
      <div id={`activity-${projItem.id}`} className="flex gap-2.5">
        <UserAvatarImage
          name={projItem.userName}
          avatarUrl={projItem.userName === currentUserName ? currentUserAvatar : null}
          size={28}
        />
        <div
          className={cn(
            "min-w-0 flex-1 rounded-lg bg-muted/50 p-2.5 transition-colors",
            highlighted && "ring-2 ring-primary"
          )}
        >
          <div className="flex flex-wrap items-center justify-between gap-1">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-semibold">{projItem.userName}</span>
              {projItem.tag === "Status" && (
                <span className="rounded-full bg-violet-100 dark:bg-violet-900/40 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-violet-700 dark:text-violet-300">
                  Status
                </span>
              )}
            </div>
            <span className="text-xs text-muted-foreground">{time}</span>
          </div>

          {editing ? (
            <div className="mt-1.5">
              <RichCommentEditor
                key={projItem.id}
                ref={editRef}
                users={mentionableUsers}
                initialContent={projItem.richContent ?? undefined}
                onSubmitShortcut={handleSaveEdit}
                onEmptyChange={setEditEmpty}
                placeholder="Edit your comment…"
              />
              <div className="mt-1.5 flex flex-wrap items-center gap-3">
                <label className="flex cursor-pointer items-center gap-1.5 text-xs text-muted-foreground select-none">
                  <input
                    type="checkbox"
                    checked={editIsStatus}
                    onChange={(e) => setEditIsStatus(e.target.checked)}
                    className="h-3.5 w-3.5 rounded border-muted-foreground accent-violet-600"
                  />
                  Status update
                </label>
                <Button size="xs" onClick={handleSaveEdit} disabled={saving || editEmpty}>
                  {saving ? "Saving…" : "Save"}
                </Button>
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="text-xs text-muted-foreground hover:text-foreground hover:underline"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="prose-comment mt-1 text-sm">
              {projItem.richContent ? (
                <RichCommentView doc={projItem.richContent} attachments={projItem.attachments} />
              ) : (
                <MentionText text={projItem.message} />
              )}
            </div>
          )}

          {isOwn && !editing ? (
            <div className="mt-1 flex gap-3">
              <button
                type="button"
                onClick={handleStartEdit}
                className="text-xs text-muted-foreground hover:text-foreground hover:underline"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => onDelete(projItem.id)}
                className="text-xs text-muted-foreground hover:text-foreground hover:underline"
              >
                Delete
              </button>
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  // ── System / workflow / status_change row ─────────────────────────────────────
  const Icon = CATEGORY_ICON[projItem.category];
  return (
    <div id={`activity-${projItem.id}`} className="flex gap-2.5">
      <div className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-full", CATEGORY_TONE[projItem.category])}>
        <Icon className="h-3.5 w-3.5" />
      </div>
      <div className="min-w-0 flex-1 pt-0.5">
        <p className="text-sm">{projItem.message}</p>
        <span className="text-xs text-muted-foreground">
          {projItem.userName} · {time}
        </span>
      </div>
    </div>
  );
}
