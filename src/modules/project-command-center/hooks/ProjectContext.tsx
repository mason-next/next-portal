"use client";

import { createContext, useContext, type ReactNode } from "react";
import { useProject } from "./useProject";

type ProjectApi = ReturnType<typeof useProject>;

const ProjectContext = createContext<ProjectApi | null>(null);

export function ProjectProvider({ projectId, children }: { projectId: string; children: ReactNode }) {
  const api = useProject(projectId);
  return <ProjectContext.Provider value={api}>{children}</ProjectContext.Provider>;
}

export function useProjectContext(): ProjectApi {
  const ctx = useContext(ProjectContext);
  if (!ctx) throw new Error("useProjectContext must be used within a ProjectProvider");
  return ctx;
}
