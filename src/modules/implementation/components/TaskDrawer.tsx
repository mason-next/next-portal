"use client";

import { useEffect, useRef, useState } from "react";
import { X, Plus, Trash2, AlertCircle, Link2, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { UserSelect } from "@/components/shared/UserSelect";
import { MultiUserSelect } from "@/components/shared/MultiUserSelect";
import { RichCommentEditor, type RichCommentEditorHandle } from "@/components/shared/RichCommentEditor";
import { RichCommentView } from "@/components/shared/RichCommentView";
import { CommentAttachmentArea } from "@/components/shared/CommentAttachmentArea";
import { ProgressBar } from "@/components/shared/ProgressBar";
import type {
  ImplementationTask,
  ImplementationTaskComment,
  CreateTaskInput,
  UpdateTaskInput,
  ImplementationTaskStatus,
  TaskPriority,
  TaskDependencyRef,
} from "@/types/implementation";
import type { CommentAttachment } from "@/types/attachments";
import { TASK_STATUSES, TASK_PRIORITIES } from "@/types/implementation";
import type { AppUser } from "@/types/user";
import type { WorkflowStep } from "@/types/workflow";
import { TASK_STATUS_TONE, TASK_PRIORITY_TONE } from "@/modules/implementation/lib/task-display";
import {
  getTaskComments,
  addTaskComment,
  deleteTaskComment,
  getSubtasks,
  createTask,
  updateTask,
  deleteTask,
} from "@/lib/data/implementation";
import {
  getTaskDependencies,
  addTaskDependency,
  removeTaskDependency,
} from "@/lib/data/task-deps";

interface TaskDrawerProps {
  task: ImplementationTask | null;
  users: AppUser[];
  availableSteps: WorkflowStep[];
  defaultWorkflowStepId?: string | null;
  allTasks: ImplementationTask[];
  onClose: () => void;
  onSave: (taskId: string, input: UpdateTaskInput) => Promise<void>;
  onCreate: (input: CreateTaskInput) => Promise<void>;
  onDelete: (taskId: string) => Promise<void>;
}

interface FormState {
  title: string;
  description: string;
  status: ImplementationTaskStatus;
  priority: TaskPriority;
  percentComplete: number;
  assigneeIds: string[];
  workflowStepId: string | null;
  projectId: string | null;
  isPersonal: boolean;
  startDate: string;
  dueDate: string;
  notes: string;
}

function toFormState(task: ImplementationTask): FormState {
  return {
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
    percentComplete: task.percentComplete,
    assigneeIds: task.assignees.map((a) => a.id),
    workflowStepId: task.workflowStepId,
    projectId: task.projectId,
    isPersonal: task.isPersonal,
    startDate: task.startDate ? task.startDate.slice(0, 10) : "",
    dueDate: task.dueDate ? task.dueDate.slice(0, 10) : "",
    notes: task.notes,
  };
}

function emptyForm(defaultStepId: string | null = null): FormState {
  return {
    title: "",
    description: "",
    status: "Not Started",
    priority: "Medium",
    percentComplete: 0,
    assigneeIds: [],
    workflowStepId: defaultStepId,
    projectId: null,
    isPersonal: false,
    startDate: "",
    dueDate: "",
    notes: "",
  };
}

export function TaskDrawer({
  task,
  users,
  availableSteps,
  defaultWorkflowStepId = null,
  allTasks,
  onClose,
  onSave,
  onCreate,
  onDelete,
}: TaskDrawerProps) {
  const isCreate = task === null;
  const isSubtask = Boolean(task?.parentTaskId);

  const [form, setForm] = useState<FormState>(() =>
    task ? toFormState(task) : emptyForm(defaultWorkflowStepId)
  );
  const [comments, setComments] = useState<ImplementationTaskComment[]>([]);
  const [commentEmpty, setCommentEmpty] = useState(true);
  const [pendingAttachments, setPendingAttachments] = useState<CommentAttachment[]>([]);
  const commentEditorRef = useRef<RichCommentEditorHandle>(null);
  const [deps, setDeps] = useState<TaskDependencyRef[]>([]);
  const [addingDep, setAddingDep] = useState(false);
  const [depPickerId, setDepPickerId] = useState<string>("");
  const [subtasks, setSubtasks] = useState<ImplementationTask[]>([]);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [addingComment, setAddingComment] = useState(false);
  const [commentError, setCommentError] = useState<string | null>(null);
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);
  const titleRef = useRef<HTMLInputElement>(null);
  // Generation counter: prevents a stale initial-load fetch from overwriting a comment
  // that was submitted while the fetch was in-flight (race condition on fast connections).
  const commentsGenRef = useRef(0);

  const taskId = task?.id;
  useEffect(() => {
    if (!isCreate && taskId) {
      const gen = ++commentsGenRef.current;
      getTaskComments(taskId).then((data) => {
        if (commentsGenRef.current === gen) setComments(data);
      });
      getTaskDependencies(taskId).then(setDeps);
      getSubtasks(taskId).then(setSubtasks);
    }
  }, [taskId, isCreate]);

  // Fetch project list for the "Move to project" selector (edit mode, non-subtasks only)
  useEffect(() => {
    if (!isCreate && !isSubtask) {
      fetch("/api/projects/list")
        .then((r) => r.json())
        .then((list: { id: string; name: string }[]) => setProjects(list))
        .catch(() => {});
    }
  }, [isCreate, isSubtask]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    titleRef.current?.focus();
  }, [task]);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  // Progress derived from subtasks when subtasks exist
  const hasSubtasks = subtasks.length > 0;
  const completedSubtaskCount = subtasks.filter((s) => s.status === "Complete").length;
  const derivedProgress = hasSubtasks
    ? Math.round((completedSubtaskCount / subtasks.length) * 100)
    : form.percentComplete;

  async function handleSave() {
    if (!form.title.trim()) return;
    setSaving(true);
    setSaveError(null);
    try {
      const payload: UpdateTaskInput = {
        title: form.title.trim(),
        description: form.description,
        status: form.status,
        priority: form.priority,
        percentComplete: hasSubtasks ? derivedProgress : form.percentComplete,
        assigneeIds: form.assigneeIds,
        workflowStepId: form.workflowStepId,
        startDate: form.startDate || null,
        dueDate: form.dueDate || null,
        notes: form.notes,
      };
      if (isCreate) {
        await onCreate(payload as CreateTaskInput);
        onClose();
      } else if (task) {
        payload.projectId = form.projectId;
        payload.isPersonal = form.isPersonal;
        await onSave(task.id, payload);
        onClose();
      }
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to save task. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!task) return;
    setDeleting(true);
    try {
      await onDelete(task.id);
      onClose();
    } finally {
      setDeleting(false);
    }
  }

  async function handleAddComment() {
    const editor = commentEditorRef.current;
    if (!task || !editor || (editor.isEmpty() && pendingAttachments.length === 0)) return;
    const { richContent, text } = editor.getPayload();
    setAddingComment(true);
    setCommentError(null);
    try {
      const newComment = await addTaskComment(task.id, JSON.stringify(richContent), text, pendingAttachments);
      editor.clear();
      setPendingAttachments([]);
      // Append the server-returned comment instantly so it appears without a round-trip.
      setComments((prev) => [...prev, newComment]);
      // Bump gen so any still-in-flight initial-load fetch is ignored when it resolves.
      // Then fire a background re-fetch to populate the full list in case the initial load
      // hadn't completed yet (prev was []) when we appended above.
      // Only accept the background result if it actually contains the new comment —
      // this guards against a race where a fast stale response (without the new row)
      // would otherwise overwrite the optimistic state.
      const gen = ++commentsGenRef.current;
      const taskIdSnap = task.id;
      const newCommentId = newComment.id;
      getTaskComments(taskIdSnap).then((data) => {
        if (commentsGenRef.current === gen && data.some((c) => c.id === newCommentId)) {
          setComments(data);
        }
      });
    } catch (err) {
      console.error("[handleAddComment] failed:", err);
      setCommentError(err instanceof Error ? err.message : "Failed to post comment. Please try again.");
    } finally {
      setAddingComment(false);
    }
  }

  async function handleDeleteComment(commentId: string) {
    await deleteTaskComment(commentId);
    setComments((prev) => prev.filter((c) => c.id !== commentId));
  }

  async function handleToggleSubtask(subtask: ImplementationTask) {
    const nextStatus = subtask.status === "Complete" ? "Not Started" : "Complete";
    const updated = await updateTask(subtask.id, { status: nextStatus });
    setSubtasks((prev) => prev.map((s) => (s.id === subtask.id ? updated : s)));
  }

  async function handleAddSubtask() {
    if (!task || !newSubtaskTitle.trim()) return;
    const created = await createTask({
      projectId: task.projectId,
      title: newSubtaskTitle.trim(),
      parentTaskId: task.id,
      workflowStepId: task.workflowStepId,
      isPersonal: task.isPersonal,
    });
    setSubtasks((prev) => [...prev, created]);
    setNewSubtaskTitle("");
  }

  async function handleDeleteSubtask(subtaskId: string) {
    await deleteTask(subtaskId);
    setSubtasks((prev) => prev.filter((s) => s.id !== subtaskId));
  }

  async function handleAddDep() {
    if (!task || !depPickerId) return;
    const result = await addTaskDependency(task.id, depPickerId);
    if (!result.ok) {
      alert(result.error ?? "Could not add dependency.");
      return;
    }
    const refreshed = await getTaskDependencies(task.id);
    setDeps(refreshed);
    setDepPickerId("");
    setAddingDep(false);
  }

  async function handleRemoveDep(dependsOnId: string) {
    if (!task) return;
    await removeTaskDependency(task.id, dependsOnId);
    setDeps((prev) => prev.filter((d) => d.dependsOnId !== dependsOnId));
  }

  const existingDepIds = new Set(deps.map((d) => d.dependsOnId));
  const depCandidates = allTasks.filter(
    (t) => t.id !== task?.id && !existingDepIds.has(t.id)
  );

  const hasUnmetDeps = deps.some(
    (d) => d.dependsOnStatus !== "Complete" && d.dependsOnStatus !== "Cancelled"
  );

  return (
    <>
      <div className="fixed inset-0 z-30 bg-black/30" onClick={onClose} />

      <div className="fixed inset-y-0 right-0 z-40 flex w-full sm:max-w-xl flex-col bg-card shadow-xl animate-in slide-in-from-right-8 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-4 py-4 sm:px-6">
          <div>
            <h2 className="text-base font-semibold">
              {isCreate ? "New Task" : isSubtask ? "Edit Subtask" : "Edit Task"}
            </h2>
            {task?.workflowStepName && (
              <p className="mt-0.5 text-xs text-muted-foreground">
                {task.workflowStepName}
              </p>
            )}
          </div>
          <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="size-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5 space-y-5">
          {/* Blocked-by warning */}
          {!isCreate && hasUnmetDeps && (
            <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-800 dark:border-amber-800/40 dark:bg-amber-900/20 dark:text-amber-300">
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
              <span>
                This task has unmet dependencies. Complete the blocking tasks before starting this
                one.
              </span>
            </div>
          )}

          {/* Title */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Title</label>
            <input
              ref={titleRef}
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSave()}
              placeholder="Task title…"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </div>

          {/* Status + Priority */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Status</label>
              <select
                value={form.status}
                onChange={(e) => set("status", e.target.value as ImplementationTaskStatus)}
                className={cn(
                  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary",
                  TASK_STATUS_TONE[form.status]
                )}
              >
                {TASK_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Priority</label>
              <select
                value={form.priority}
                onChange={(e) => set("priority", e.target.value as TaskPriority)}
                className={cn(
                  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary",
                  TASK_PRIORITY_TONE[form.priority]
                )}
              >
                {TASK_PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Project — only in edit mode for non-subtask tasks */}
          {!isCreate && !isSubtask && (
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Project</label>
              <select
                value={form.projectId ?? ""}
                onChange={(e) => {
                  const val = e.target.value;
                  setForm((prev) => ({
                    ...prev,
                    projectId: val || null,
                    isPersonal: !val,
                    workflowStepId: null,
                  }));
                }}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              >
                <option value="">Personal Task</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              {form.projectId !== task?.projectId && (
                <p className="mt-1 text-xs text-muted-foreground/70">
                  Task will move out of its current project on save.
                </p>
              )}
            </div>
          )}

          {/* Workflow Step — not shown for subtasks, or when moving to a different project */}
          {!isSubtask && availableSteps.length > 0 && form.projectId === task?.projectId && (
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                Workflow Step
              </label>
              <select
                value={form.workflowStepId ?? ""}
                onChange={(e) => set("workflowStepId", e.target.value || null)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              >
                <option value="">— Not linked —</option>
                {availableSteps.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Assignees */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Assignees</label>
            <MultiUserSelect
              users={users}
              value={form.assigneeIds}
              onChange={(ids) => set("assigneeIds", ids)}
              placeholder="Unassigned"
            />
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                Start Date
              </label>
              <input
                type="date"
                value={form.startDate}
                onChange={(e) => set("startDate", e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Due Date</label>
              <input
                type="date"
                value={form.dueDate}
                onChange={(e) => set("dueDate", e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              />
            </div>
          </div>

          {/* Progress — manual slider if no subtasks; derived display if subtasks exist */}
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label className="text-xs font-medium text-muted-foreground">Progress</label>
              <span className="text-xs tabular-nums text-muted-foreground">
                {derivedProgress}%
                {hasSubtasks && (
                  <span className="ml-1 text-muted-foreground/60">
                    ({completedSubtaskCount}/{subtasks.length} subtasks)
                  </span>
                )}
              </span>
            </div>
            {hasSubtasks ? (
              <ProgressBar percent={derivedProgress} />
            ) : (
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={form.percentComplete}
                onChange={(e) => set("percentComplete", Number(e.target.value))}
                className="w-full accent-primary"
              />
            )}
          </div>

          {/* Description */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Description
            </label>
            <textarea
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              rows={3}
              placeholder="Describe this task…"
              className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              rows={2}
              placeholder="Internal notes…"
              className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </div>

          {/* Subtasks — only for existing non-subtask tasks */}
          {!isCreate && !isSubtask && (
            <div>
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Subtasks ({subtasks.length})
              </div>
              <div className="space-y-1 mb-2">
                {subtasks.map((sub) => {
                  const done = sub.status === "Complete";
                  return (
                    <div
                      key={sub.id}
                      className="group flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-accent/50 transition-colors"
                    >
                      <button
                        type="button"
                        onClick={() => handleToggleSubtask(sub)}
                        className={cn(
                          "flex-none size-4 rounded border-2 transition-colors flex items-center justify-center",
                          done
                            ? "border-emerald-500 bg-emerald-500"
                            : "border-muted-foreground/40 hover:border-emerald-400"
                        )}
                        title={done ? "Mark incomplete" : "Mark complete"}
                      >
                        {done && (
                          <svg viewBox="0 0 12 12" className="size-full fill-white p-0.5">
                            <path
                              d="M10 3L5 8.5 2 5.5"
                              stroke="white"
                              strokeWidth="1.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              fill="none"
                            />
                          </svg>
                        )}
                      </button>
                      <span
                        className={cn(
                          "min-w-0 flex-1 text-sm",
                          done && "line-through text-muted-foreground"
                        )}
                      >
                        {sub.title}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleDeleteSubtask(sub.id)}
                        className="hidden group-hover:flex text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <X className="size-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
              <div className="flex gap-2">
                <input
                  value={newSubtaskTitle}
                  onChange={(e) => setNewSubtaskTitle(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddSubtask()}
                  placeholder="Add a subtask…"
                  className="min-w-0 flex-1 rounded-md border border-input bg-background px-3 py-1.5 text-sm outline-none focus:border-primary"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleAddSubtask}
                  disabled={!newSubtaskTitle.trim()}
                >
                  <Plus className="size-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Dependencies — only for existing non-subtask tasks */}
          {!isCreate && !isSubtask && (
            <div>
              <div className="mb-2 flex items-center justify-between">
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <Link2 className="mr-1 inline size-3" />
                  Blocked By ({deps.length})
                </div>
                <button
                  type="button"
                  onClick={() => setAddingDep((v) => !v)}
                  className="text-xs text-primary hover:underline underline-offset-2"
                >
                  {addingDep ? "Cancel" : "+ Add"}
                </button>
              </div>

              {addingDep && (
                <div className="mb-2 flex gap-2">
                  <select
                    value={depPickerId}
                    onChange={(e) => setDepPickerId(e.target.value)}
                    className="flex-1 rounded-md border border-input bg-background px-3 py-1.5 text-sm outline-none focus:border-primary"
                  >
                    <option value="">Select a task…</option>
                    {depCandidates.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.title}
                      </option>
                    ))}
                  </select>
                  <Button size="sm" variant="outline" onClick={handleAddDep} disabled={!depPickerId}>
                    Add
                  </Button>
                </div>
              )}

              {deps.length === 0 ? (
                <p className="text-xs text-muted-foreground">No dependencies.</p>
              ) : (
                <div className="space-y-1.5">
                  {deps.map((d) => {
                    const isBlocking =
                      d.dependsOnStatus !== "Complete" && d.dependsOnStatus !== "Cancelled";
                    return (
                      <div
                        key={d.depId}
                        className={cn(
                          "flex items-center justify-between rounded-md border px-3 py-2 text-sm",
                          isBlocking
                            ? "border-amber-200 bg-amber-50 dark:border-amber-800/40 dark:bg-amber-900/10"
                            : "border-border bg-muted/30"
                        )}
                      >
                        <div className="min-w-0 flex-1">
                          <span className="truncate font-medium">{d.dependsOnTitle}</span>
                          <span
                            className={cn(
                              "ml-2 text-xs",
                              isBlocking
                                ? "text-amber-700 dark:text-amber-400"
                                : "text-emerald-600 dark:text-emerald-400"
                            )}
                          >
                            {d.dependsOnStatus}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveDep(d.dependsOnId)}
                          className="ml-2 shrink-0 text-muted-foreground hover:text-destructive"
                        >
                          <X className="size-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Comments — only for existing tasks */}
          {!isCreate && (
            <div>
              <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Comments ({comments.length})
              </div>
              <div className="space-y-3">
                {comments.map((c) => (
                  <div key={c.id} className="rounded-md border bg-muted/30 px-3 py-2">
                    <div className="mb-1 flex items-center justify-between">
                      <span className="text-xs font-medium">{c.userName}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          {new Date(c.createdAt).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleDeleteComment(c.id)}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    </div>
                    <div className="prose-comment text-sm text-foreground">
                      {c.richContent ? (
                        <RichCommentView
                          doc={c.richContent as Parameters<typeof RichCommentView>[0]["doc"]}
                          attachments={c.attachments}
                        />
                      ) : (
                        <p>{c.plainText}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-3">
                <RichCommentEditor
                  ref={commentEditorRef}
                  users={users}
                  placeholder="Add a comment… (@mention to notify)"
                  onSubmitShortcut={handleAddComment}
                  onEmptyChange={setCommentEmpty}
                />
                <CommentAttachmentArea
                  attachments={pendingAttachments}
                  onAdd={(a) => setPendingAttachments((prev) => [...prev, a])}
                  onRemove={(i) => setPendingAttachments((prev) => prev.filter((_, idx) => idx !== i))}
                  disabled={addingComment}
                />
                {commentError && (
                  <p className="mt-1 text-xs text-destructive">{commentError}</p>
                )}
                <div className="mt-1.5 flex justify-end">
                  <Button
                    size="sm"
                    onClick={handleAddComment}
                    disabled={(commentEmpty && pendingAttachments.length === 0) || addingComment}
                  >
                    <Send className="mr-1.5 size-3.5" />
                    {addingComment ? "Posting…" : "Post"}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Save error */}
        {saveError && (
          <div className="mx-4 mb-2 sm:mx-6 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {saveError}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between border-t px-4 py-3 sm:px-6 sm:py-4">
          {!isCreate ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDelete}
              disabled={deleting}
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="mr-1.5 size-4" />
              {deleting ? "Deleting…" : "Delete"}
            </Button>
          ) : (
            <div />
          )}
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={saving || !form.title.trim()}
            >
              {saving ? "Saving…" : isCreate ? "Create Task" : "Save"}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
