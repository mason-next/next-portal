"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import type { ImplementationTask, CreateTaskInput, UpdateTaskInput } from "@/types/implementation";
import {
  getProjectTasks,
  createTask,
  updateTask,
  deleteTask,
  reorderTasks,
} from "@/lib/data/implementation";

export function useImplementationTasks(projectId: string) {
  const [tasks, setTasks] = useState<ImplementationTask[] | null>(null);
  const [isPending, startTransition] = useTransition();
  const [tick, setTick] = useState(0);
  const projectIdRef = useRef(projectId);

  useEffect(() => {
    let active = true;
    // Show loading state only on initial mount or project change — not on manual refetch.
    if (projectIdRef.current !== projectId) {
      setTasks(null);
      projectIdRef.current = projectId;
    }
    getProjectTasks(projectId)
      .then((rows) => {
        if (active) setTasks(rows);
      })
      .catch(() => {
        if (active) setTasks([]);
      });
    return () => { active = false; };
  }, [projectId, tick]);

  const refetch = useCallback(() => setTick((n) => n + 1), []);

  const addTask = useCallback(
    async (input: CreateTaskInput) => {
      const created = await createTask({ ...input, projectId });
      startTransition(() => {
        setTasks((prev) => (prev ? [...prev, created] : [created]));
      });
      return created;
    },
    [projectId]
  );

  const editTask = useCallback(
    async (taskId: string, input: UpdateTaskInput) => {
      const updated = await updateTask(taskId, input);
      startTransition(() => {
        setTasks((prev) =>
          prev ? prev.map((t) => (t.id === taskId ? updated : t)) : [updated]
        );
      });
      return updated;
    },
    []
  );

  const removeTask = useCallback(
    async (taskId: string) => {
      await deleteTask(taskId);
      startTransition(() => {
        setTasks((prev) => (prev ? prev.filter((t) => t.id !== taskId) : []));
      });
    },
    []
  );

  const reorder = useCallback(
    async (parentTaskId: string | null, orderedIds: string[]) => {
      startTransition(() => {
        setTasks((prev) => {
          if (!prev) return prev;
          const byId = new Map(prev.map((t) => [t.id, t]));
          const reordered = orderedIds
            .map((id, i) => {
              const t = byId.get(id);
              return t ? { ...t, sortOrder: i } : null;
            })
            .filter(Boolean) as ImplementationTask[];
          const others = prev.filter((t) => !orderedIds.includes(t.id));
          return [...others, ...reordered];
        });
      });
      await reorderTasks(projectId, parentTaskId, orderedIds);
    },
    [projectId]
  );

  return {
    tasks,
    isLoading: tasks === null,
    isPending,
    addTask,
    editTask,
    removeTask,
    reorder,
    refetch,
  };
}
