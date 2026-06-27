import type { ImplementationTaskStatus, TaskPriority } from "@/types/implementation";

export const TASK_STATUS_TONE: Record<ImplementationTaskStatus, string> = {
  "Not Started": "bg-muted text-muted-foreground",
  "In Progress": "bg-sky-100 text-sky-700",
  Blocked:       "bg-red-100 text-red-700",
  Complete:      "bg-emerald-100 text-emerald-700",
  Cancelled:     "bg-slate-100 text-slate-500 line-through",
};

export const TASK_PRIORITY_TONE: Record<TaskPriority, string> = {
  Low:      "bg-slate-100 text-slate-600",
  Medium:   "bg-amber-100 text-amber-700",
  High:     "bg-orange-100 text-orange-700",
  Critical: "bg-red-100 text-red-700 font-semibold",
};

export function isOverdue(dueDate: string | null, status: ImplementationTaskStatus): boolean {
  if (!dueDate || status === "Complete" || status === "Cancelled") return false;
  return new Date(dueDate) < new Date();
}

export function taskProgress(task: {
  percentComplete: number;
  subtaskCount: number;
  completedSubtaskCount: number;
}): number {
  if (task.subtaskCount > 0) {
    return Math.round((task.completedSubtaskCount / task.subtaskCount) * 100);
  }
  return task.percentComplete;
}
