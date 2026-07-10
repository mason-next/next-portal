"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  Bell,
  Calendar,
  CheckCircle2,
  ChevronRight,
  CircleDot,
  Clock,
  GitBranch,
  ListChecks,
  Plus,
  Upload,
} from "lucide-react";
import { SkeletonList } from "@/components/shared/Skeleton";
import { Modal } from "@/components/shared/Modal";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useSession } from "@/lib/auth/client";
import { useUsersContext } from "@/components/shared/AppShell/UsersProvider";
import { usePersistentFilter } from "@/lib/storage/use-persistent-filter";
import { TaskDrawer } from "@/modules/implementation/components/TaskDrawer";
import { TaskImportModal } from "@/modules/implementation/components/TaskImportModal";
import { OutlookEventModal } from "@/modules/implementation/components/OutlookEventModal";
import type { OutlookTaskInfo } from "@/modules/implementation/components/OutlookEventModal";
import { updateTask, deleteTask } from "@/lib/data/implementation";
import type { ImplementationTask } from "@/types/implementation";
import type { UpdateTaskInput } from "@/types/implementation";

// ─── Types ────────────────────────────────────────────────────────────────────

type Priority = "Low" | "Medium" | "High" | "Critical";
type TaskStatus = "NotStarted" | "InProgress" | "Blocked" | "Complete" | "Cancelled";
type StepStatus = "Not Started" | "In Progress" | "Complete" | "Not Needed";

interface ApiTask {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: Priority;
  dueDate: string | null;
  percentComplete: number;
  project: { id: string; name: string };
  assignees?: { id: string; name: string }[];
  assignee?: { id: string; name: string } | null;
  workflowStep?: { id: string; name: string; section: string } | null;
  subtasks: { status: TaskStatus }[];
  _count: { subtasks: number; comments: number };
  calendarScheduledAt?: string | null;
  calendarEventUrl?: string | null;
}

interface ApiStep {
  id: string;
  key: string;
  name: string;
  status: StepStatus;
  dueDate: string | null;
  project: { id: string; name: string };
  owner?: { id: string; name: string } | null;
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
  InProgress:  "In Progress",
  Blocked:     "Blocked",
  Complete:    "Complete",
  Cancelled:   "Cancelled",
};

const PRIORITY_COLOR: Record<Priority, string> = {
  Low:      "text-muted-foreground",
  Medium:   "text-blue-600 dark:text-blue-400",
  High:     "text-amber-600 dark:text-amber-400",
  Critical: "text-red-600 dark:text-red-400",
};

const STATUS_ICON: Record<TaskStatus, React.ReactNode> = {
  NotStarted: <CircleDot className="size-4 text-muted-foreground" />,
  InProgress:  <CircleDot className="size-4 text-blue-500" />,
  Blocked:     <AlertCircle className="size-4 text-red-500" />,
  Complete:    <CheckCircle2 className="size-4 text-emerald-500" />,
  Cancelled:   <CheckCircle2 className="size-4 text-muted-foreground" />,
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

const FILTER_SELECT_CLASS =
  "h-9 rounded-md border border-input bg-background px-3 text-sm outline-none focus:border-primary";

export default function TasksPage() {
  const session = useSession();
  const { users } = useUsersContext();
  const isAdmin = session.roleTypes.includes("Administrator");
  const [adminUserId, setAdminUserId] = usePersistentFilter<string | null>("tasks:adminUserId", null);
  const [tasks, setTasks] = useState<ApiTask[] | null>(null);
  const [ownedSteps, setOwnedSteps] = useState<ApiStep[]>([]);
  const [notifications, setNotifications] = useState<ApiNotification[] | null>(null);
  const [tab, setTab] = usePersistentFilter<"tasks" | "followups">("tasks:tab", "tasks");
  const [error, setError] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [outlookTask, setOutlookTask] = useState<OutlookTaskInfo | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  // Task drawer (personal and project tasks)
  const [activeTaskLoading, setActiveTaskLoading] = useState(false);
  const [activeTaskDrawer, setActiveTaskDrawer] = useState<ImplementationTask | null>(null);

  const isAllTeam = isAdmin && adminUserId === "__all__";

  useEffect(() => {
    if (isAllTeam && tab === "followups") setTab("tasks");
  }, [isAllTeam, tab]);

  useEffect(() => {
    setTasks(null);
    setError(false);
    let url = "/api/tasks/mine";
    if (isAdmin && adminUserId === "__all__") url = "/api/tasks/mine?userId=all";
    else if (isAdmin && adminUserId) url = `/api/tasks/mine?userId=${adminUserId}`;
    fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error(r.statusText);
        return r.json();
      })
      .then(({ tasks: t, notifications: n, ownedSteps: s }) => {
        setTasks(t ?? []);
        setOwnedSteps(s ?? []);
        setNotifications(n ?? []);
      })
      .catch(() => {
        setError(true);
        setTasks([]);
        setNotifications([]);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminUserId, isAdmin, reloadKey]);

  const loading = tasks === null && !error;
  const taskCount = (tasks?.length ?? 0) + ownedSteps.length;
  const followCount = notifications?.length ?? 0;

  function reload() {
    setReloadKey((k) => k + 1);
  }

  function handleOpenCalendar(task: ApiTask) {
    setOutlookTask({
      id: task.id,
      title: task.title,
      description: task.description ?? "",
      priority: task.priority,
      dueDate: task.dueDate,
      projectName: task.project.id === "personal" ? null : task.project.name,
      calendarScheduledAt: task.calendarScheduledAt ?? null,
      calendarEventUrl: task.calendarEventUrl ?? null,
    });
  }

  function handleTaskScheduled(taskId: string, scheduledAt: string, eventUrl: string) {
    setTasks((prev) =>
      prev
        ? prev.map((t) =>
            t.id === taskId
              ? { ...t, calendarScheduledAt: scheduledAt, calendarEventUrl: eventUrl }
              : t
          )
        : prev
    );
  }

  async function handleOpenTask(taskId: string) {
    setActiveTaskLoading(true);
    try {
      const res = await fetch(`/api/tasks/${taskId}`);
      if (res.ok) {
        const task = (await res.json()) as ImplementationTask;
        setActiveTaskDrawer(task);
      }
    } finally {
      setActiveTaskLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl p-4 sm:p-8 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight flex items-center gap-2">
            <ListChecks className="size-5" />
            {isAllTeam ? "All Team Tasks" : "Tasks"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {isAllTeam
              ? "Active tasks and workflow steps across your whole team."
              : "Tasks assigned to you and follow-ups from activity mentions."}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button size="sm" variant="outline" onClick={() => setShowImport(true)}>
            <Upload className="size-4 mr-1" />
            Import CSV
          </Button>
          <Button size="sm" onClick={() => setShowCreate(true)}>
            <Plus className="size-4 mr-1" />
            New Task
          </Button>
        </div>
      </div>

      {showCreate && (
        <CreateTaskModal onClose={() => setShowCreate(false)} onCreated={reload} />
      )}

      {showImport && (
        <TaskImportModal onClose={() => setShowImport(false)} onImported={reload} />
      )}

      {outlookTask && (
        <OutlookEventModal
          task={outlookTask}
          onClose={() => setOutlookTask(null)}
          onScheduled={handleTaskScheduled}
        />
      )}

      {isAdmin ? (
        <div className="flex items-center gap-2">
          <label className="text-sm text-muted-foreground">View:</label>
          <select
            className={FILTER_SELECT_CLASS}
            value={adminUserId ?? ""}
            onChange={(e) => setAdminUserId(e.target.value || null)}
          >
            <option value="">My tasks</option>
            <option value="__all__">All team tasks</option>
            {users.filter((u) => u.isActive).map((u) => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
        </div>
      ) : null}

      {!isAllTeam ? (
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
      ) : null}

      {error ? (
        <div className="rounded-xl border border-dashed py-14 text-center">
          <AlertCircle className="mx-auto mb-3 size-8 text-muted-foreground/40" />
          <p className="text-sm font-medium">Couldn&apos;t load tasks</p>
          <p className="mt-1 text-xs text-muted-foreground">Refresh the page to try again.</p>
        </div>
      ) : loading ? (
        <SkeletonList count={5} />
      ) : tab === "tasks" || isAllTeam ? (
        <TasksTab
          tasks={tasks!}
          ownedSteps={ownedSteps}
          showAssignee={isAllTeam}
          onOpenTask={handleOpenTask}
          taskLoading={activeTaskLoading}
          onOpenCalendar={handleOpenCalendar}
        />
      ) : (
        <FollowUpsTab notifications={notifications!} />
      )}

      {/* Task drawer — personal and project tasks */}
      {activeTaskDrawer && (
        <TaskDrawer
          key={activeTaskDrawer.id}
          task={activeTaskDrawer}
          users={users}
          availableSteps={[]}
          allTasks={[]}
          onClose={() => {
            setActiveTaskDrawer(null);
            reload();
          }}
          onSave={async (id: string, input: UpdateTaskInput) => {
            const updated = await updateTask(id, input);
            setActiveTaskDrawer((prev) => (prev?.id === id ? updated : prev));
          }}
          onCreate={async () => {}}
          onDelete={async (id: string) => {
            await deleteTask(id);
            setActiveTaskDrawer(null);
            reload();
          }}
        />
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

function TasksTab({
  tasks,
  ownedSteps,
  showAssignee,
  onOpenTask,
  taskLoading,
  onOpenCalendar,
}: {
  tasks: ApiTask[];
  ownedSteps: ApiStep[];
  showAssignee?: boolean;
  onOpenTask: (id: string) => void;
  taskLoading: boolean;
  onOpenCalendar: (task: ApiTask) => void;
}) {
  if (tasks.length === 0 && ownedSteps.length === 0) {
    return (
      <div className="rounded-xl border border-dashed py-14 text-center">
        <CheckCircle2 className="mx-auto mb-3 size-8 text-muted-foreground/40" />
        <p className="text-sm font-medium">All caught up!</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {showAssignee ? "No active tasks across the team." : "No tasks assigned to you right now."}
        </p>
      </div>
    );
  }

  const personalTasks = tasks.filter((t) => t.project.id === "personal");
  const projectTasks  = tasks.filter((t) => t.project.id !== "personal");

  const byProject = projectTasks.reduce<Record<string, { name: string; tasks: ApiTask[] }>>(
    (acc, t) => {
      const key = t.project.id;
      if (!acc[key]) acc[key] = { name: t.project.name, tasks: [] };
      acc[key].tasks.push(t);
      return acc;
    },
    {}
  );

  const stepsByProject = ownedSteps.reduce<Record<string, { name: string; steps: ApiStep[] }>>(
    (acc, s) => {
      const key = s.project.id;
      if (!acc[key]) acc[key] = { name: s.project.name, steps: [] };
      acc[key].steps.push(s);
      return acc;
    },
    {}
  );

  const allProjectIds = [...new Set([...Object.keys(byProject), ...Object.keys(stepsByProject)])];

  return (
    <div className="space-y-5">
      {/* Personal tasks */}
      {personalTasks.length > 0 && (
        <div className="rounded-xl border border-indigo-200 bg-card shadow-sm overflow-hidden dark:border-indigo-800/40">
          <div className="flex items-center justify-between px-5 py-3 border-b border-indigo-200 bg-indigo-50 dark:border-indigo-800/40 dark:bg-indigo-950/30">
            <span className="text-sm font-semibold text-indigo-800 dark:text-indigo-300">
              Personal Tasks
            </span>
            <span className="text-xs text-indigo-600 dark:text-indigo-400">
              {personalTasks.length} item{personalTasks.length !== 1 ? "s" : ""}
            </span>
          </div>
          <div className="divide-y">
            {personalTasks.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                showAssignee={showAssignee}
                onOpenTask={onOpenTask}
                taskLoading={taskLoading}
                onOpenCalendar={onOpenCalendar}
              />
            ))}
          </div>
        </div>
      )}

      {/* Project task groups */}
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
                <StepRow key={step.id} step={step} projectId={projectId} showOwner={showAssignee} />
              ))}
              {(taskGroup?.tasks ?? []).map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  showAssignee={showAssignee}
                  onOpenTask={onOpenTask}
                  taskLoading={taskLoading}
                  onOpenCalendar={onOpenCalendar}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function StepRow({
  step,
  projectId,
  showOwner,
}: {
  step: ApiStep;
  projectId: string;
  showOwner?: boolean;
}) {
  const due = formatDueDate(step.dueDate);
  const isInProgress = step.status === "In Progress";
  return (
    <Link
      href={`/projects/${projectId}`}
      className="flex items-center gap-3 px-5 py-3.5 hover:bg-accent transition-colors"
    >
      <GitBranch
        className={cn("size-4 shrink-0", isInProgress ? "text-blue-500" : "text-muted-foreground")}
      />

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{step.name}</p>
        <div className="mt-0.5 flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{step.status}</span>
          <span className="text-xs text-muted-foreground/50">·</span>
          <span className="text-xs text-muted-foreground">Workflow step</span>
          {showOwner && step.owner ? (
            <>
              <span className="text-xs text-muted-foreground/50">·</span>
              <span className="text-xs text-muted-foreground">{step.owner.name}</span>
            </>
          ) : null}
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

function TaskRow({
  task,
  showAssignee,
  onOpenTask,
  taskLoading,
  onOpenCalendar,
}: {
  task: ApiTask;
  showAssignee?: boolean;
  onOpenTask: (id: string) => void;
  taskLoading: boolean;
  onOpenCalendar: (task: ApiTask) => void;
}) {
  const due = formatDueDate(task.dueDate);
  const completedSubs = task.subtasks.filter((s) => s.status === "Complete").length;

  const inner = (
    <>
      <span className="shrink-0">{STATUS_ICON[task.status]}</span>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{task.title}</p>
        <div className="mt-0.5 flex items-center gap-2 flex-wrap">
          <span className="text-xs text-muted-foreground">{STATUS_LABEL[task.status]}</span>
          {task.workflowStep && (
            <>
              <span className="text-xs text-muted-foreground/50">·</span>
              <span className="text-xs text-muted-foreground">{task.workflowStep.name}</span>
            </>
          )}
          {showAssignee && task.assignee ? (
            <>
              <span className="text-xs text-muted-foreground/50">·</span>
              <span className="text-xs text-muted-foreground">{task.assignee.name}</span>
            </>
          ) : null}
          {task._count.subtasks > 0 && (
            <span className="text-xs text-muted-foreground">
              {completedSubs}/{task._count.subtasks} subtasks
            </span>
          )}
          {task.project.id !== "personal" && (
            <Link
              href={`/projects/${task.project.id}/implementation`}
              onClick={(e) => e.stopPropagation()}
              className="text-xs text-primary/70 hover:text-primary hover:underline underline-offset-2 shrink-0"
            >
              {task.project.name}
            </Link>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
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
        <button
          type="button"
          title={task.calendarScheduledAt ? "Already scheduled in Outlook — click to reschedule" : "Create Outlook event"}
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onOpenCalendar(task); }}
          className={cn(
            "rounded p-1 transition-colors hover:bg-accent",
            task.calendarScheduledAt
              ? "text-blue-500 dark:text-blue-400"
              : "text-muted-foreground/50 hover:text-muted-foreground"
          )}
        >
          <Calendar className="size-3.5" />
        </button>
        <ChevronRight className="size-4 text-muted-foreground/50" />
      </div>
    </>
  );

  return (
    <div
      role="button"
      tabIndex={taskLoading ? -1 : 0}
      onClick={() => !taskLoading && onOpenTask(task.id)}
      onKeyDown={(e) => {
        if ((e.key === "Enter" || e.key === " ") && !taskLoading) {
          e.preventDefault();
          onOpenTask(task.id);
        }
      }}
      aria-disabled={taskLoading}
      className={cn(
        "flex w-full items-center gap-3 px-5 py-3.5 hover:bg-accent transition-colors text-left cursor-pointer",
        taskLoading && "opacity-60 cursor-not-allowed"
      )}
    >
      {inner}
    </div>
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
          <p className="text-xs text-muted-foreground line-clamp-2">
            &ldquo;{n.commentPreview}&rdquo;
          </p>
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

// ─── Create Task Modal ────────────────────────────────────────────────────────

const FIELD_CLASS =
  "mt-1 h-9 w-full rounded-md border px-3 text-sm outline-none focus:border-primary bg-background";

function CreateTaskModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const session = useSession();
  const { users } = useUsersContext();
  const [title, setTitle] = useState("");
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);
  const [projectId, setProjectId] = useState<string>("");
  const [steps, setSteps] = useState<{ id: string; name: string }[]>([]);
  const [stepId, setStepId] = useState<string>("");
  const [assigneeIds, setAssigneeIds] = useState<string[]>([session.id]);
  const [priority, setPriority] = useState<"Low" | "Medium" | "High" | "Critical">("Medium");
  const [dueDate, setDueDate] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch("/api/projects/list")
      .then((r) => r.json())
      .then((data) => setProjects(data ?? []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    setStepId("");
    setSteps([]);
    if (!projectId) return;
    fetch(`/api/projects/${projectId}/steps`)
      .then((r) => r.json())
      .then((data) => setSteps(data ?? []))
      .catch(() => {});
  }, [projectId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setSubmitting(true);
    try {
      await fetch("/api/tasks/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description,
          projectId: projectId || null,
          workflowStepId: stepId || null,
          assigneeIds,
          priority,
          dueDate: dueDate || null,
        }),
      });
      onCreated();
      onClose();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open onClose={onClose}>
      <h2 className="mb-4 text-lg font-semibold">New Task</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="block">
          <span className="text-xs font-semibold text-muted-foreground">Title *</span>
          <input
            className={FIELD_CLASS}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            autoFocus
          />
        </label>

        <label className="block">
          <span className="text-xs font-semibold text-muted-foreground">Project</span>
          <select
            className={FIELD_CLASS}
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
          >
            <option value="">Personal task (no project)</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </label>

        {steps.length > 0 && (
          <label className="block">
            <span className="text-xs font-semibold text-muted-foreground">Link to Workflow Step</span>
            <select
              className={FIELD_CLASS}
              value={stepId}
              onChange={(e) => setStepId(e.target.value)}
            >
              <option value="">None</option>
              {steps.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </label>
        )}

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="text-xs font-semibold text-muted-foreground">Priority</span>
            <select
              className={FIELD_CLASS}
              value={priority}
              onChange={(e) => setPriority(e.target.value as typeof priority)}
            >
              {(["Low", "Medium", "High", "Critical"] as const).map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-muted-foreground">Due Date</span>
            <input
              type="date"
              className={FIELD_CLASS}
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </label>
        </div>

        <label className="block">
          <span className="text-xs font-semibold text-muted-foreground">Assign To</span>
          <select
            className={FIELD_CLASS}
            value={assigneeIds[0] ?? ""}
            onChange={(e) => setAssigneeIds(e.target.value ? [e.target.value] : [])}
          >
            <option value="">Unassigned</option>
            {users.filter((u) => u.isActive).map((u) => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-xs font-semibold text-muted-foreground">Description</span>
          <textarea
            className="mt-1 w-full rounded-md border px-3 py-2 text-sm outline-none focus:border-primary bg-background"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" type="button" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={submitting || !title.trim()}>
            {submitting ? "Creating…" : "Create Task"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
