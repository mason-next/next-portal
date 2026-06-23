"use client";

import { useEffect, useState } from "react";
import { Activity, CheckCircle2, MessageSquare, RefreshCw, Settings2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UserAvatarImage } from "@/components/shared/AppShell/UserAvatarImage";
import { Linkify } from "@/components/shared/Linkify";
import {
  addProjectComment,
  deleteProjectActivity,
  getActivityLastViewed,
  getProjectActivity,
  markActivityViewed,
} from "@/lib/data/activity";
import { CURRENT_USER } from "@/lib/current-user";
import { useCurrentUserAvatar } from "@/lib/hooks/useCurrentUserAvatar";
import { cn } from "@/lib/utils";
import type { ActivityCategory, ProjectActivity } from "@/types/activity";

// Local-storage-backed, single-user prototype — there's no push channel, so a light poll
// while the drawer is mounted is what keeps the unread badge from going stale when an
// action on another tab of this same project (e.g. completing a workflow step) logs activity.
const POLL_INTERVAL_MS = 6000;

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

function groupByDate(activity: ProjectActivity[]): { label: string; items: ProjectActivity[] }[] {
  const groups: { label: string; items: ProjectActivity[] }[] = [];
  for (const item of activity) {
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
  const currentUserAvatar = useCurrentUserAvatar();
  const [open, setOpen] = useState(false);
  const [activity, setActivity] = useState<ProjectActivity[] | null>(null);
  const [lastViewed, setLastViewed] = useState<string | null>(() => getActivityLastViewed(projectId));
  const [draft, setDraft] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Drawer persists across project navigations (layout isn't remounted on param change), so
  // the lazy useState initializer above only fires once — re-derive lastViewed during render
  // when projectId actually changes, per React's recommended "adjusting state on prop change" pattern.
  const [trackedProjectId, setTrackedProjectId] = useState(projectId);
  if (projectId !== trackedProjectId) {
    setTrackedProjectId(projectId);
    setLastViewed(getActivityLastViewed(projectId));
  }

  async function refresh() {
    const loaded = await getProjectActivity(projectId);
    setActivity(loaded);
  }

  useEffect(() => {
    let active = true;
    const poll = () => {
      getProjectActivity(projectId).then((loaded) => {
        if (active) setActivity(loaded);
      });
    };
    poll();
    const interval = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [projectId]);

  function handleOpen() {
    setOpen(true);
    markActivityViewed(projectId);
    setLastViewed(new Date().toISOString());
  }

  async function handlePost() {
    const body = draft.trim();
    if (!body) return;
    setSubmitting(true);
    await addProjectComment(projectId, CURRENT_USER, body);
    setDraft("");
    setSubmitting(false);
    refresh();
  }

  async function handleDelete(activityId: string) {
    await deleteProjectActivity(projectId, activityId);
    refresh();
  }

  const unreadCount =
    activity?.filter((a) => !lastViewed || new Date(a.createdAt) > new Date(lastViewed)).length ?? 0;
  const groups = groupByDate(activity ?? []);

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className="fixed bottom-6 right-6 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-foreground text-background shadow-lg transition-transform hover:scale-105"
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
          "fixed inset-y-0 right-0 z-40 flex w-full max-w-md flex-col border-l bg-card shadow-2xl transition-transform duration-200 ease-out",
          open ? "translate-x-0" : "translate-x-full"
        )}
        role="dialog"
        aria-label="Project activity"
      >
        <div className="flex items-center justify-between border-b px-5 py-4">
          <span className="text-sm font-semibold">Project Activity</span>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            title="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="border-b p-4">
          <div className="flex gap-2.5">
            <UserAvatarImage name={CURRENT_USER} avatarUrl={currentUserAvatar} size={28} />
            <div className="min-w-0 flex-1">
              <textarea
                className="w-full rounded-md border border-input bg-background p-2 text-sm outline-none focus:border-primary"
                rows={2}
                placeholder="Write an update or note…"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handlePost();
                }}
              />
              <div className="mt-1.5 flex justify-end">
                <Button size="xs" onClick={handlePost} disabled={submitting || !draft.trim()}>
                  {submitting ? "Posting…" : "Comment"}
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {activity === null ? (
            <p className="text-sm text-muted-foreground">Loading activity…</p>
          ) : activity.length === 0 ? (
            <p className="text-sm text-muted-foreground">No activity yet.</p>
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
                        currentUserAvatar={currentUserAvatar}
                        onDelete={handleDelete}
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
  currentUserAvatar,
  onDelete,
}: {
  item: ProjectActivity;
  currentUserAvatar: string | null;
  onDelete: (activityId: string) => void;
}) {
  const time = new Date(item.createdAt).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });

  if (item.category === "comment") {
    return (
      <div className="flex gap-2.5">
        <UserAvatarImage
          name={item.userName}
          avatarUrl={item.userName === CURRENT_USER ? currentUserAvatar : null}
          size={28}
        />
        <div className="min-w-0 flex-1 rounded-lg bg-muted/50 p-2.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-semibold">{item.userName}</span>
            <span className="text-xs text-muted-foreground">{time}</span>
          </div>
          <p className="mt-1 whitespace-pre-wrap text-sm">
            <Linkify text={item.message} />
          </p>
          {item.userName === CURRENT_USER ? (
            <button
              type="button"
              onClick={() => onDelete(item.id)}
              className="mt-1 text-xs text-muted-foreground hover:text-foreground hover:underline"
            >
              Delete
            </button>
          ) : null}
        </div>
      </div>
    );
  }

  const Icon = CATEGORY_ICON[item.category];
  return (
    <div className="flex gap-2.5">
      <div className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-full", CATEGORY_TONE[item.category])}>
        <Icon className="h-3.5 w-3.5" />
      </div>
      <div className="min-w-0 flex-1 pt-0.5">
        <p className="text-sm">{item.message}</p>
        <span className="text-xs text-muted-foreground">
          {item.userName} · {time}
        </span>
      </div>
    </div>
  );
}
