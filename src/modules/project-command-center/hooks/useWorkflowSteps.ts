"use client";

import { useEffect, useState } from "react";
import { addWorkflowStep, removeWorkflowStep, updateWorkflowStep, type AddWorkflowStepInput } from "@/lib/data/workflow";
import { getWorkflowStepsWithProgress } from "@/modules/project-command-center/engine/module-progress";
import type { WorkflowStep } from "@/types/workflow";

export function useWorkflowSteps(projectId: string) {
  const [loaded, setLoaded] = useState<{
    projectId: string;
    steps: WorkflowStep[];
    percentByKey: Partial<Record<string, number>>;
  } | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let active = true;
    getWorkflowStepsWithProgress(projectId)
      .then(({ steps, percentByKey }) => {
        if (active) setLoaded({ projectId, steps, percentByKey });
      })
      .catch(() => {
        if (active) setLoaded({ projectId, steps: [], percentByKey: {} });
      });
    return () => {
      active = false;
    };
  }, [projectId, reloadToken]);

  const isLoading = loaded === null || loaded.projectId !== projectId;

  async function updateStep(key: string, patch: Partial<WorkflowStep>) {
    const updated = await updateWorkflowStep(projectId, key, patch);
    const refreshed = await getWorkflowStepsWithProgress(projectId);
    setLoaded({ projectId, ...refreshed });
    return updated;
  }

  function refetch() {
    setReloadToken((token) => token + 1);
  }

  async function addStep(input: AddWorkflowStepInput) {
    const created = await addWorkflowStep(projectId, input);
    refetch();
    return created;
  }

  async function deleteStep(key: string) {
    await removeWorkflowStep(projectId, key);
    refetch();
  }

  return {
    steps: isLoading ? [] : loaded.steps,
    percentByKey: isLoading ? {} : loaded.percentByKey,
    isLoading,
    updateStep,
    addStep,
    deleteStep,
    refetch,
  };
}
