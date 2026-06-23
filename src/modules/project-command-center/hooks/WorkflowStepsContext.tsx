"use client";

import { createContext, useContext, type ReactNode } from "react";
import { useWorkflowSteps } from "./useWorkflowSteps";

type WorkflowStepsApi = ReturnType<typeof useWorkflowSteps>;

const WorkflowStepsContext = createContext<WorkflowStepsApi | null>(null);

export function WorkflowStepsProvider({ projectId, children }: { projectId: string; children: ReactNode }) {
  const api = useWorkflowSteps(projectId);
  return <WorkflowStepsContext.Provider value={api}>{children}</WorkflowStepsContext.Provider>;
}

export function useWorkflowStepsContext(): WorkflowStepsApi {
  const ctx = useContext(WorkflowStepsContext);
  if (!ctx) throw new Error("useWorkflowStepsContext must be used within a WorkflowStepsProvider");
  return ctx;
}
