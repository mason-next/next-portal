"use client";

import { useEffect, useRef, useState } from "react";
import { X, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { UserSelect } from "@/components/shared/UserSelect";
import type { ImplementationTask, ImplementationTaskComment, CreateTaskInput, UpdateTaskInput, ImplementationTaskStatus, TaskPriority } from "@/types/implementation";
import { TASK_STATUSES, TASK_PRIORITIES } from "@/types/implementation";
import type { AppUser } from "@/types/user";
import { TASK_STATUS_TONE, TASK_PRIORITY_TONE } from "@/modules/implementation/lib/task-display";
import { getTaskComments, addTaskComment, deleteTaskComment } from "@/lib/data/implementation";

interface TaskDrawerProps {
  task: ImplementationTask | null;
  users: AppUser[];
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
  assigneeId: string | null;
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
    assigneeId: task.assigneeId,
    startDate: task.startDate ? task.startDate.slice(0, 10) : "",
    dueDate: task.dueDate ? task.dueDate.slice(0, 10) : "",
    notes: task.notes,
  };
}

const EMPTY_FORM: FormState = {
  title: "",
  description: "",
  status: "Not Started",
  priority: "Medium",
  percentComplete: 0,
  assigneeId: null,
  startDate: "",
  dueDate: "",
  notes: "",
};

export function TaskDrawer({ task, users, onClose, onSave, onCreate, onDelete }: TaskDrawerProps) {
  const isCreate = task === null;
  // form state is initialized from task on each mount; TaskList passes a key prop so
  // switching tasks forces a remount rather than relying on a sync setState in effect.
  const [form, setForm] = useState<FormState>(() => (task ? toFormState(task) : EMPTY_FORM));
  const [comments, setComments] = useState<ImplementationTaskComment[]>([]);
  const [commentText, setCommentText] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [addingComment, setAddingComment] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);

  const taskId = task?.id;
  useEffect(() => {
    if (!isCreate && taskId) {
      getTaskComments(taskId).then(setComments);
    }
  }, [taskId, isCreate]);

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

  async function handleSave() {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      if (isCreate) {
        await onCreate({
          title: form.title.trim(),
          description: form.description,
          status: form.status,
          priority: form.priority,
          percentComplete: form.percentComplete,
          assigneeId: form.assigneeId,
          startDate: form.startDate || null,
          dueDate: form.dueDate || null,
          notes: form.notes,
        });
        onClose();
      } else if (task) {
        await onSave(task.id, {
          title: form.title.trim(),
          description: form.description,
          status: form.status,
          priority: form.priority,
          percentComplete: form.percentComplete,
          assigneeId: form.assigneeId,
          startDate: form.startDate || null,
          dueDate: form.dueDate || null,
          notes: form.notes,
        });
      }
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
    if (!task || !commentText.trim()) return;
    setAddingComment(true);
    try {
      const comment = await addTaskComment(
        task.id,
        { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: commentText.trim() }] }] },
        commentText.trim()
      );
      setComments((prev) => [...prev, comment]);
      setCommentText("");
    } finally {
      setAddingComment(false);
    }
  }

  async function handleDeleteComment(commentId: string) {
    await deleteTaskComment(commentId);
    setComments((prev) => prev.filter((c) => c.id !== commentId));
  }

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-30 bg-black/30" onClick={onClose} />

      {/* Panel */}
      <div className="fixed inset-y-0 right-0 z-40 flex w-full max-w-xl flex-col bg-card shadow-xl animate-in slide-in-from-right-8 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="text-base font-semibold">{isCreate ? "New Task" : "Edit Task"}</h2>
          <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="size-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
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

          {/* Status + Priority row */}
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
                  <option key={s} value={s}>{s}</option>
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
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Assignee */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Assignee</label>
            <UserSelect
              users={users}
              value={form.assigneeId}
              onChange={(id) => set("assigneeId", id)}
              placeholder="Unassigned"
            />
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Start Date</label>
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

          {/* Percent complete */}
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label className="text-xs font-medium text-muted-foreground">Progress</label>
              <span className="text-xs tabular-nums text-muted-foreground">{form.percentComplete}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={form.percentComplete}
              onChange={(e) => set("percentComplete", Number(e.target.value))}
              className="w-full accent-primary"
            />
          </div>

          {/* Description */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Description</label>
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
                          {new Date(c.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
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
                    <p className="text-sm text-foreground">{c.plainText}</p>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex gap-2">
                <input
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleAddComment()}
                  placeholder="Add a comment…"
                  className="min-w-0 flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleAddComment}
                  disabled={!commentText.trim() || addingComment}
                >
                  <Plus className="size-4" />
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t px-6 py-4">
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
            <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
            <Button size="sm" onClick={handleSave} disabled={saving || !form.title.trim()}>
              {saving ? "Saving…" : isCreate ? "Create Task" : "Save"}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
