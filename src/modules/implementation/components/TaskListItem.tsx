"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, MessageSquare, Layers, Link2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { UserAvatarImage } from "@/components/shared/AppShell/UserAvatarImage";
import { ProgressBar } from "@/components/shared/ProgressBar";
import type { ImplementationTask } from "@/types/implementation";
import type { AppUser } from "@/types/user";
import { TASK_STATUS_TONE, TASK_PRIORITY_TONE, isOverdue, taskProgress } from "@/modules/implementation/lib/task-display";
import { getSubtasks } from "@/lib/data/implementation";

function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

interface TaskListItemProps {
  task: ImplementationTask;
  users: AppUser[];
  depth?: number;
  onOpen: (task: ImplementationTask) => void;
  onToggleComplete: (task: ImplementationTask) => void;
}

export function TaskListItem({ task, users, depth = 0, onOpen, onToggleComplete }: TaskListItemProps) {
  const [expanded, setExpanded] = useState(false);
  const [subtasks, setSubtasks] = useState<ImplementationTask[]>([]);
  const [loadedSubs, setLoadedSubs] = useState(false);

  const assignee = task.assigneeId ? users.find((u) => u.id === task.assigneeId) : null;
  const overdue = isOverdue(task.dueDate, task.status);
  const progress = taskProgress(task);
  const isComplete = task.status === "Complete";
  const isCancelled = task.status === "Cancelled";

  async function handleExpand() {
    if (!loadedSubs) {
      const subs = await getSubtasks(task.id);
      setSubtasks(subs);
      setLoadedSubs(true);
    }
    setExpanded((e) => !e);
  }

  return (
    <>
      <div
        className={cn(
          "group flex items-center gap-2 rounded-lg border border-transparent px-3 py-2.5 hover:border-border hover:bg-accent/40 transition-colors",
          depth > 0 && "ml-6 text-sm"
        )}
      >
        {/* Complete toggle */}
        <button
          type="button"
          onClick={() => onToggleComplete(task)}
          className={cn(
            "flex-none size-4.5 rounded-full border-2 transition-colors",
            isComplete
              ? "border-emerald-500 bg-emerald-500"
              : "border-muted-foreground/40 hover:border-emerald-400"
          )}
          title={isComplete ? "Mark incomplete" : "Mark complete"}
        >
          {isComplete && (
            <svg viewBox="0 0 12 12" className="size-full fill-white p-0.5">
              <path d="M10 3L5 8.5 2 5.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            </svg>
          )}
        </button>

        {/* Expand subtasks */}
        <button
          type="button"
          onClick={handleExpand}
          className={cn(
            "flex-none text-muted-foreground hover:text-foreground transition-colors",
            task.subtaskCount === 0 && "invisible"
          )}
        >
          {expanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
        </button>

        {/* Title — opens drawer */}
        <button
          type="button"
          onClick={() => onOpen(task)}
          className={cn(
            "min-w-0 flex-1 text-left text-sm font-medium text-foreground hover:text-primary transition-colors",
            isComplete && "line-through text-muted-foreground",
            isCancelled && "line-through text-muted-foreground/60"
          )}
        >
          {task.title}
        </button>

        {/* Workflow step name */}
        {task.workflowStepName && (
          <span className="hidden sm:block text-xs text-muted-foreground/70 truncate max-w-24">
            ↳ {task.workflowStepName}
          </span>
        )}

        {/* Progress bar — only show if has subtasks or % set */}
        {progress > 0 && progress < 100 && (
          <div className="hidden sm:block w-16">
            <ProgressBar percent={progress} />
          </div>
        )}

        {/* Priority */}
        <span className={cn("hidden sm:inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", TASK_PRIORITY_TONE[task.priority])}>
          {task.priority}
        </span>

        {/* Status */}
        <span className={cn("hidden md:inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", TASK_STATUS_TONE[task.status])}>
          {task.status}
        </span>

        {/* Due date */}
        {task.dueDate && (
          <span className={cn("hidden sm:block text-xs tabular-nums", overdue ? "text-red-600 font-medium" : "text-muted-foreground")}>
            {formatDate(task.dueDate)}
          </span>
        )}

        {/* Dependency count */}
        {task.dependencyCount > 0 && (
          <span className={cn(
            "flex items-center gap-1 text-xs",
            task.status === "Blocked" ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"
          )}>
            <Link2 className="size-3" />
            {task.dependencyCount}
          </span>
        )}

        {/* Comment count */}
        {task.commentCount > 0 && (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <MessageSquare className="size-3" />
            {task.commentCount}
          </span>
        )}

        {/* Subtask count */}
        {task.subtaskCount > 0 && (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Layers className="size-3" />
            {task.completedSubtaskCount}/{task.subtaskCount}
          </span>
        )}

        {/* Assignee avatar */}
        {assignee && (
          <UserAvatarImage name={assignee.name} avatarUrl={assignee.avatarUrl} size={22} />
        )}
      </div>

      {/* Subtasks */}
      {expanded && (
        <div>
          {subtasks.map((sub) => (
            <TaskListItem
              key={sub.id}
              task={sub}
              users={users}
              depth={(depth ?? 0) + 1}
              onOpen={onOpen}
              onToggleComplete={onToggleComplete}
            />
          ))}
        </div>
      )}
    </>
  );
}
