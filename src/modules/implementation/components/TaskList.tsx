"use client";

import { useState } from "react";
import { Plus, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/shared/Skeleton";
import type { ImplementationTask } from "@/types/implementation";
import type { AppUser } from "@/types/user";
import type { WorkflowStep } from "@/types/workflow";
import { TaskListItem } from "./TaskListItem";
import { TaskDrawer } from "./TaskDrawer";
import { useImplementationTasks } from "@/modules/implementation/hooks/useImplementationTasks";
import { seedStepTasks, STEP_TASK_TEMPLATES } from "@/lib/data/task-templates";

interface TaskListProps {
  projectId: string;
  users: AppUser[];
  availableSteps?: WorkflowStep[];
}

export function TaskList({ projectId, users, availableSteps = [] }: TaskListProps) {
  const { tasks, isLoading, addTask, editTask, removeTask, refetch } = useImplementationTasks(projectId);
  const [drawerTask, setDrawerTask] = useState<ImplementationTask | "new" | null>(null);
  const [seeding, setSeeding] = useState(false);

  // Steps that have predefined templates
  const templateSteps = availableSteps.filter((s) => !!STEP_TASK_TEMPLATES[s.key]);
  const hasTemplates = templateSteps.length > 0;

  const openTask = drawerTask === "new" ? null : drawerTask;
  const drawerOpen = drawerTask !== null;

  async function handleToggleComplete(task: ImplementationTask) {
    const nextStatus = task.status === "Complete" ? "Not Started" : "Complete";
    await editTask(task.id, { status: nextStatus });
  }

  async function handleSeedTemplates() {
    setSeeding(true);
    try {
      for (const step of templateSteps) {
        await seedStepTasks(projectId, step.id, step.key);
      }
      refetch();
    } finally {
      setSeeding(false);
    }
  }

  const completedCount = (tasks ?? []).filter((t) => t.status === "Complete").length;

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold">Tasks</div>
          {!isLoading && (
            <p className="text-xs text-muted-foreground">
              {completedCount}/{tasks!.length} complete
            </p>
          )}
        </div>
        <div className="flex gap-2">
          {hasTemplates && (
            <Button size="sm" variant="outline" onClick={handleSeedTemplates} disabled={seeding}>
              <Wand2 className="mr-1.5 size-4" />
              {seeding ? "Loading…" : "Load Templates"}
            </Button>
          )}
          <Button size="sm" onClick={() => setDrawerTask("new")}>
            <Plus className="mr-1.5 size-4" />
            Add Task
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-0.5">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3 py-2.5 px-1">
              <Skeleton className="h-4 w-4 rounded" />
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
          ))}
        </div>
      ) : tasks!.length === 0 ? (
        <div className="rounded-lg border border-dashed py-8 text-center text-sm text-muted-foreground">
          No tasks yet.{" "}
          <button
            type="button"
            className="font-medium text-primary hover:underline"
            onClick={() => setDrawerTask("new")}
          >
            Add the first one
          </button>
        </div>
      ) : (
        <div className="space-y-0.5">
          {tasks!.map((task) => (
            <TaskListItem
              key={task.id}
              task={task}
              users={users}
              onOpen={(t) => setDrawerTask(t)}
              onToggleComplete={handleToggleComplete}
            />
          ))}
        </div>
      )}

      {drawerOpen && (
        <TaskDrawer
          key={openTask?.id ?? "new"}
          task={openTask}
          users={users}
          availableSteps={availableSteps}
          allTasks={tasks ?? []}
          onClose={() => setDrawerTask(null)}
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
    </div>
  );
}
