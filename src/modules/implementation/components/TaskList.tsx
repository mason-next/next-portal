"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Plus, Wand2, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/shared/Skeleton";
import type { ImplementationTask } from "@/types/implementation";
import type { AppUser } from "@/types/user";
import type { WorkflowStep } from "@/types/workflow";
import { TaskListItem } from "./TaskListItem";
import { TaskDrawer } from "./TaskDrawer";
import { SeedTemplatesModal } from "./SeedTemplatesModal";
import { useImplementationTasks } from "@/modules/implementation/hooks/useImplementationTasks";
import { STEP_TASK_TEMPLATES } from "@/lib/data/task-template-config";
import { useProjectContext } from "@/modules/project-command-center/hooks/ProjectContext";
import { ROLE_NOT_NEEDED } from "@/lib/role-assignment";

interface TaskListProps {
  projectId: string;
  users: AppUser[];
  availableSteps?: WorkflowStep[];
}

export function TaskList({ projectId, users, availableSteps = [] }: TaskListProps) {
  const { tasks, isLoading, addTask, editTask, removeTask, refetch } =
    useImplementationTasks(projectId);

  // Build project team IDs for @mention prioritization.
  const { project } = useProjectContext();
  const projectTeamIds = project
    ? new Set(
        [
          project.solutionsExecutiveId,
          project.solutionsEngineerId,
          project.fieldProjectManagerId,
          project.seniorInsideId,
          project.insidePMId,
          ...project.technicians.map((t) => t.userId),
        ]
          .filter((id): id is string => Boolean(id) && id !== ROLE_NOT_NEEDED)
      )
    : undefined;
  const [drawerTarget, setDrawerTarget] = useState<ImplementationTask | "new" | null>(null);
  const [drawerDefaultStepId, setDrawerDefaultStepId] = useState<string | null>(null);
  const [seedModalStep, setSeedModalStep] = useState<WorkflowStep | null>(null);

  // Auto-open a specific task when ?taskId= is present in the URL (e.g. from an
  // activity feed task reference link). Only fires once after tasks are loaded.
  const searchParams = useSearchParams();
  const openTaskId = searchParams.get("taskId");
  const autoOpenedRef = useRef(false);
  useEffect(() => {
    if (!openTaskId || !tasks || tasks.length === 0 || autoOpenedRef.current) return;
    const target = tasks.find((t) => t.id === openTaskId);
    if (!target) return;
    autoOpenedRef.current = true;
    setDrawerTarget(target);
    setDrawerDefaultStepId(null);
  }, [tasks, openTaskId]);

  function openNew(stepId: string | null = null) {
    setDrawerTarget("new");
    setDrawerDefaultStepId(stepId);
  }

  function openTask(task: ImplementationTask) {
    setDrawerTarget(task);
    setDrawerDefaultStepId(null);
  }

  function closeDrawer() {
    setDrawerTarget(null);
    setDrawerDefaultStepId(null);
    refetch();
  }

  async function handleToggleComplete(task: ImplementationTask) {
    const nextStatus = task.status === "Complete" ? "Not Started" : "Complete";
    await editTask(task.id, { status: nextStatus });
  }

  // Group root tasks by workflowStepId
  const tasksByStep = new Map<string, ImplementationTask[]>();
  for (const task of tasks ?? []) {
    const key = task.workflowStepId ?? "__unlinked__";
    if (!tasksByStep.has(key)) tasksByStep.set(key, []);
    tasksByStep.get(key)!.push(task);
  }

  const unlinkedTasks = tasksByStep.get("__unlinked__") ?? [];
  const openTask_ = drawerTarget === "new" ? null : (drawerTarget as ImplementationTask | null);
  const drawerOpen = drawerTarget !== null;

  return (
    <div className="space-y-3">
      {availableSteps.length > 0 ? (
        <>
          {availableSteps.map((step) => (
            <StepSection
              key={step.id}
              step={step}
              tasks={isLoading ? null : (tasksByStep.get(step.id) ?? [])}
              users={users}
              onOpenTask={openTask}
              onAddTask={() => openNew(step.id)}
              onToggleComplete={handleToggleComplete}
              onLoadTemplates={
                STEP_TASK_TEMPLATES[step.key] ? () => setSeedModalStep(step) : null
              }
            />
          ))}

          {!isLoading && unlinkedTasks.length > 0 && (
            <StepSection
              step={null}
              tasks={unlinkedTasks}
              users={users}
              onOpenTask={openTask}
              onAddTask={() => openNew(null)}
              onToggleComplete={handleToggleComplete}
              onLoadTemplates={null}
            />
          )}
        </>
      ) : (
        // No steps configured — flat list with single "Add Task" button
        <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/10">
            <span className="text-sm font-semibold">Tasks</span>
            <Button size="sm" variant="ghost" onClick={() => openNew(null)} className="h-7 px-2.5 text-xs">
              <Plus className="mr-1 size-3.5" />
              Add Task
            </Button>
          </div>
          <div className="px-3 py-2">
            {isLoading ? (
              <LoadingRows />
            ) : (tasks ?? []).length === 0 ? (
              <EmptyState onAdd={() => openNew(null)} />
            ) : (
              <div className="space-y-0.5">
                {(tasks ?? []).map((task) => (
                  <TaskListItem
                    key={task.id}
                    task={task}
                    users={users}
                    onOpen={openTask}
                    onToggleComplete={handleToggleComplete}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {drawerOpen && (
        <TaskDrawer
          key={openTask_?.id ?? "new"}
          task={openTask_}
          users={users}
          projectTeamIds={projectTeamIds}
          availableSteps={availableSteps}
          defaultWorkflowStepId={drawerDefaultStepId}
          allTasks={tasks ?? []}
          onClose={closeDrawer}
          onSave={async (id, input) => {
            await editTask(id, input);
          }}
          onCreate={async (input) => {
            await addTask(input);
          }}
          onDelete={async (id) => {
            await removeTask(id);
          }}
        />
      )}

      {seedModalStep && (
        <SeedTemplatesModal
          projectId={projectId}
          step={seedModalStep}
          onClose={() => setSeedModalStep(null)}
          onDone={() => {
            setSeedModalStep(null);
            refetch();
          }}
        />
      )}
    </div>
  );
}

// ─── Step Section ──────────────────────────────────────────────────────────────

interface StepSectionProps {
  step: WorkflowStep | null;
  tasks: ImplementationTask[] | null;
  users: AppUser[];
  onOpenTask: (task: ImplementationTask) => void;
  onAddTask: () => void;
  onToggleComplete: (task: ImplementationTask) => void;
  onLoadTemplates: (() => void) | null;
}

function StepSection({
  step,
  tasks,
  users,
  onOpenTask,
  onAddTask,
  onToggleComplete,
  onLoadTemplates,
}: StepSectionProps) {
  const [expanded, setExpanded] = useState(true);
  const label = step ? step.name : "Unlinked Tasks";
  const taskCount = tasks?.length ?? 0;
  const completedCount = tasks?.filter((t) => t.status === "Complete").length ?? 0;

  return (
    <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b bg-muted/10">
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="flex-none text-muted-foreground hover:text-foreground transition-colors"
        >
          {expanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
        </button>

        <div className="flex-1 min-w-0">
          <span className="text-sm font-semibold">{label}</span>
          {tasks !== null && taskCount > 0 && (
            <span className="ml-2 text-xs text-muted-foreground">
              {completedCount}/{taskCount} complete
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {onLoadTemplates && (
            <Button
              size="sm"
              variant="ghost"
              onClick={onLoadTemplates}
              className="h-7 px-2.5 text-xs"
            >
              <Wand2 className="mr-1 size-3.5" />
              Load Templates
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            onClick={onAddTask}
            className="h-7 px-2.5 text-xs"
          >
            <Plus className="mr-1 size-3.5" />
            Add Task
          </Button>
        </div>
      </div>

      {expanded && (
        <div className="px-3 py-2">
          {tasks === null ? (
            <LoadingRows />
          ) : tasks.length === 0 ? (
            <EmptyState
              onAdd={onAddTask}
              onLoadTemplates={onLoadTemplates ?? undefined}
            />
          ) : (
            <div className="space-y-0.5">
              {tasks.map((task) => (
                <TaskListItem
                  key={task.id}
                  task={task}
                  users={users}
                  onOpen={onOpenTask}
                  onToggleComplete={onToggleComplete}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function LoadingRows() {
  return (
    <div className="space-y-1 py-1">
      {[1, 2].map((i) => (
        <div key={i} className="flex items-center gap-3 py-2 px-1">
          <Skeleton className="h-4 w-4 rounded" />
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
      ))}
    </div>
  );
}

function EmptyState({
  onAdd,
  onLoadTemplates,
}: {
  onAdd: () => void;
  onLoadTemplates?: () => void;
}) {
  return (
    <div className="py-6 text-center text-sm text-muted-foreground">
      No tasks yet.{" "}
      <button
        type="button"
        className="font-medium text-primary hover:underline underline-offset-2"
        onClick={onAdd}
      >
        Add the first one
      </button>
      {onLoadTemplates && (
        <>
          {" "}
          or{" "}
          <button
            type="button"
            className="font-medium text-primary hover:underline underline-offset-2"
            onClick={onLoadTemplates}
          >
            load templates
          </button>
        </>
      )}
    </div>
  );
}
