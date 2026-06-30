"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  Bell,
  CheckCircle2,
  ChevronRight,
  CircleDot,
  Clock,
  GitBranch,
  ListChecks,
} from "lucide-react";
import { SkeletonList } from "@/components/shared/Skeleton";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

type Priority = "Low" | "Medium" | "High" | "Critical";
type TaskStatus = "NotStarted" | "InProgress" | "Blocked" | "Complete" | "Cancelled";
type StepStatus = "Not Started" | "In Progress" | "Complete" | "Not Needed";

interface ApiTask {
  id: string;
  title: string;
  status: TaskStatus;
  priority: Priority;
  dueDate: string | null;
  percentComplete: number;
  project: { id: string; name: string };
  subtasks: { status: TaskStatus }[];
  _count: { subtasks: number; comments: number };
}

interface ApiStep {
  id: string;
  key: string;
  name: string;
  status: StepStatus;
  dueDate: string | null;
  project: { id: string; name: string };
}

interface ApiNotification {
  id: string;
  projectId: string;
  projectName: string;
  commentAuthor: string;
  commentPreview: string;
  message: string;
  createdAt: string;
  isRead: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_LABEL: Record<TaskStatus, string> = {
  NotStarted: "Not Started",
  InProgress: "In Progress",
  Blocked:    "Blocked",
  Complete:   "Complete",
  Cancelled:  "Cancelled",
};

const PRIORITY_COLOR: Record<Priority, string> = {
  Low:      "text-muted-foreground",
  Medium:   "text-blue-600 dark:text-blue-400",
  High:     "text-amber-600 dark:text-amber-400",
  Critical: "text-red-600 dark:text-red-400",
};

const STATUS_ICON: Record<TaskStatus, React.ReactNode> = {
  NotStarted: <CircleDot className="size-4 text-muted-foreground" />,
  InProgress: <CircleDot className="size-4 text-blue-500" />,
  Blocked:    <AlertCircle className="size-4 text-red-500" />,
  Complete:   <CheckCircle2 className="size-4 text-emerald-500" />,
  Cancelled:  <CheckCircle2 className="size-4 text-muted-foreground" />,
};

function formatDueDate(iso: string | null): { label: string; overdue: boolean } | null {
  if (!iso) return null;
  const d = new Date(iso);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const overdue = d < today;
  const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return { label, overdue };
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TasksPage() {
  const [tasks, setTasks] = useState<ApiTask[] | null>(null);
  const [ownedSteps, setOwnedSteps] = useState<ApiStep[]>([]);
  const [notifications, setNotifications] = useState<ApiNotification[] | null>(null);
  const [tab, setTab] = useState<"tasks" | "followups">("tasks");
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch("/api/tasks/mine")
      .then((r) => {
        if (!r.ok) throw new Error(r.statusText);
        return r.json();
      })
      .then(({ tasks, notifications, ownedSteps }) => {
        setTasks(tasks ?? []);
        setOwnedSteps(ownedSteps ?? []);
        setNotifications(notifications ?? []);
      })
      .catch(() => {
        setError(true);
        setTasks([]);
        setNotifications([]);
      });
  }, []);

  const loading = tasks === null && !error;
  const taskCount = (tasks?.length ?? 0) + ownedSteps.length;
  const followCount = notifications?.length ?? 0;

  return (
    <div className="mx-auto max-w-3xl p-6 sm:p-8 space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight flex items-center gap-2">
          <ListChecks className="size-5" />
          My Tasks
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Tasks assigned to you and follow-ups from activity mentions.
        </p>
      </div>

      <div className="flex items-center gap-0 border-b">
        <TabBtn active={tab === "tasks"} onClick={() => setTab("tasks")}>
          <ListChecks className="size-4" />
          Assigned Tasks
          {!loading && taskCount > 0 && (
            <span className="ml-1.5 rounded-full bg-primary/10 px-1.5 py-px text-[10px] font-semibold text-primary">
              {taskCount}
            </span>
          )}
        </TabBtn>
        <TabBtn active={tab === "followups"} onClick={() => setTab("followups")}>
          <Bell className="size-4" />
          Follow-Ups
          {!loading && followCount > 0 && (
            <span className="ml-1.5 rounded-full bg-amber-100 px-1.5 py-px text-[10px] font-semibold text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
              {followCount}
            </span>
          )}
        </TabBtn>
      </div>

      {error ? (
        <div className="rounded-xl border border-dashed py-14 text-center">
          <AlertCircle className="mx-auto mb-3 size-8 text-muted-foreground/40" />
          <p className="text-sm font-medium">Couldn&apos;t load tasks</p>
          <p className="mt-1 text-xs text-muted-foreground">Refresh the page to try again.</p>
        </div>
      ) : loading ? (
        <SkeletonList count={5} />
      ) : tab === "tasks" ? (
        <TasksTab tasks={tasks!} ownedSteps={ownedSteps} />
      ) : (
        <FollowUpsTab notifications={notifications!} />
      )}
    </div>
  );
}

// ─── Tabs ─────────────────────────────────────────────────────────────────────

function TabBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors",
        active
          ? "border-foreground text-foreground"
          : "border-transparent text-muted-foreground hover:text-foreground"
      )}
    >
      {children}
    </button>
  );
}

function TasksTab({ tasks, ownedSteps }: { tasks: ApiTask[]; ownedSteps: ApiStep[] }) {
  if (tasks.length === 0 && ownedSteps.length === 0) {
    return (
      <div className="rounded-xl border border-dashed py-14 text-center">
        <CheckCircle2 className="mx-auto mb-3 size-8 text-muted-foreground/40" />
        <p className="text-sm font-medium">All caught up!</p>
        <p className="mt-1 text-xs text-muted-foreground">No tasks assigned to you right now.</p>
      </div>
    );
  }

  // Group implementation tasks by project
  const byProject = tasks.reduce<Record<string, { name: string; tasks: ApiTask[] }>>(
    (acc, t) => {
      const key = t.project.id;
      if (!acc[key]) acc[key] = { name: t.project.name, tasks: [] };
      acc[key].tasks.push(t);
      return acc;
    },
    {}
  );

  // Group owned workflow steps by project
  const stepsByProject = ownedSteps.reduce<Record<string, { name: string; steps: ApiStep[] }>>(
    (acc, s) => {
      const key = s.project.id;
      if (!acc[key]) acc[key] = { name: s.project.name, steps: [] };
      acc[key].steps.push(s);
      return acc;
    },
    {}
  );

  // Merge all project IDs preserving order
  const allProjectIds = [...new Set([...Object.keys(byProject), ...Object.keys(stepsByProject)])];

  return (
    <div className="space-y-5">
      {allProjectIds.map((projectId) => {
        const taskGroup = byProject[projectId];
        const stepGroup = stepsByProject[projectId];
        const projectName = taskGroup?.name ?? stepGroup?.name ?? "";
        return (
          <div key={projectId} className="rounded-xl border bg-card shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b bg-muted/20">
              <Link
                href={`/projects/${projectId}/implementation`}
                className="text-sm font-semibold hover:underline underline-offset-2"
              >
                {projectName}
              </Link>
              <span className="text-xs text-muted-foreground">
                {(taskGroup?.tasks.length ?? 0) + (stepGroup?.steps.length ?? 0)} item
                {(taskGroup?.tasks.length ?? 0) + (stepGroup?.steps.length ?? 0) !== 1 ? "s" : ""}
              </span>
            </div>
            <div className="divide-y">
              {(stepGroup?.steps ?? []).map((step) => (
                <StepRow key={step.id} step={step} projectId={projectId} />
              ))}
              {(taskGroup?.tasks ?? []).map((task) => (
                <TaskRow key={task.id} task={task} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function StepRow({ step, projectId }: { step: ApiStep; projectId: string }) {
  const due = formatDueDate(step.dueDate);
  const isInProgress = step.status === "In Progress";
  return (
    <Link
      href={`/projects/${projectId}`}
      className="flex items-center gap-3 px-5 py-3.5 hover:bg-accent transition-colors"
    >
      <GitBranch className={cn("size-4 shrink-0", isInProgress ? "text-blue-500" : "text-muted-foreground")} />

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{step.name}</p>
        <div className="mt-0.5 flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{step.status}</span>
          <span className="text-xs text-muted-foreground/50">·</span>
          <span className="text-xs text-muted-foreground">Workflow step</span>
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        {due && (
          <span
            className={cn(
              "flex items-center gap-1 text-xs",
              due.overdue ? "text-red-500 font-medium" : "text-muted-foreground"
            )}
          >
            <Clock className="size-3" />
            {due.label}
          </span>
        )}
        <ChevronRight className="size-4 text-muted-foreground/50" />
      </div>
    </Link>
  );
}

function TaskRow({ task }: { task: ApiTask }) {
  const due = formatDueDate(task.dueDate);
  const completedSubs = task.subtasks.filter((s) => s.status === "Complete").length;

  return (
    <Link
      href={`/projects/${task.project.id}/implementation`}
      className="flex items-center gap-3 px-5 py-3.5 hover:bg-accent transition-colors"
    >
      <span className="shrink-0">{STATUS_ICON[task.status]}</span>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{task.title}</p>
        <div className="mt-0.5 flex items-center gap-2 flex-wrap">
          <span className="text-xs text-muted-foreground">{STATUS_LABEL[task.status]}</span>
          {task._count.subtasks > 0 && (
            <span className="text-xs text-muted-foreground">
              {completedSubs}/{task._count.subtasks} subtasks
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <span className={cn("text-xs font-medium", PRIORITY_COLOR[task.priority])}>
          {task.priority}
        </span>
        {due && (
          <span
            className={cn(
              "flex items-center gap-1 text-xs",
              due.overdue ? "text-red-500 font-medium" : "text-muted-foreground"
            )}
          >
            <Clock className="size-3" />
            {due.label}
          </span>
        )}
        <ChevronRight className="size-4 text-muted-foreground/50" />
      </div>
    </Link>
  );
}

function FollowUpsTab({ notifications }: { notifications: ApiNotification[] }) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const visible = notifications.filter((n) => !dismissed.has(n.id));

  async function markRead(id: string) {
    setDismissed((prev) => new Set([...prev, id]));
    await fetch(`/api/notifications/${id}/read`, { method: "POST" }).catch(() => null);
  }

  async function markAllRead() {
    const ids = visible.map((n) => n.id);
    setDismissed((prev) => new Set([...prev, ...ids]));
    await Promise.all(
      ids.map((id) => fetch(`/api/notifications/${id}/read`, { method: "POST" }).catch(() => null))
    );
  }

  if (visible.length === 0) {
    return (
      <div className="rounded-xl border border-dashed py-14 text-center">
        <Bell className="mx-auto mb-3 size-8 text-muted-foreground/40" />
        <p className="text-sm font-medium">No follow-ups</p>
        <p className="mt-1 text-xs text-muted-foreground">
          When someone @mentions you in a project, it will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={markAllRead}
          className="text-xs text-primary hover:underline underline-offset-2"
        >
          Mark all as read
        </button>
      </div>
      <div className="rounded-xl border bg-card shadow-sm divide-y overflow-hidden">
        {visible.map((n) => (
          <FollowUpRow key={n.id} notification={n} onDismiss={() => markRead(n.id)} />
        ))}
      </div>
    </div>
  );
}

function FollowUpRow({
  notification: n,
  onDismiss,
}: {
  notification: ApiNotification;
  onDismiss: () => void;
}) {
  return (
    <div className="flex items-start gap-3 px-5 py-4">
      <span className="mt-0.5 shrink-0 flex h-7 w-7 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
        <Bell className="size-3.5 text-amber-600 dark:text-amber-400" />
      </span>

      <div className="flex-1 min-w-0 space-y-0.5">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium">{n.commentAuthor || "Someone"}</span>
          <span className="text-sm text-muted-foreground">mentioned you in</span>
          <Link
            href={`/projects/${n.projectId}`}
            className="text-sm font-medium text-primary hover:underline underline-offset-2"
          >
            {n.projectName}
          </Link>
        </div>
        {n.commentPreview && (
          <p className="text-xs text-muted-foreground line-clamp-2">&ldquo;{n.commentPreview}&rdquo;</p>
        )}
        <p className="text-xs text-muted-foreground/60">{timeAgo(n.createdAt)}</p>
      </div>

      <button
        type="button"
        onClick={onDismiss}
        title="Mark as read"
        className="shrink-0 rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
      >
        <CheckCircle2 className="size-4" />
      </button>
    </div>
  );
}
