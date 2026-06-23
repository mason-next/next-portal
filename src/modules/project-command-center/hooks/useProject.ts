"use client";

import { useEffect, useState } from "react";
import { getProject } from "@/lib/data/projects";
import type { Project } from "@/types/project";

export function useProject(projectId: string) {
  // Keyed by the projectId it was fetched for, so a project switch is "loading" until
  // the new fetch resolves — same guard useBomRows/useWorkflowSteps already use.
  const [loaded, setLoaded] = useState<{ projectId: string; project: Project | null } | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let active = true;
    getProject(projectId).then((project) => {
      if (active) setLoaded({ projectId, project });
    });
    return () => {
      active = false;
    };
  }, [projectId, reloadToken]);

  const isLoading = loaded === null || loaded.projectId !== projectId;

  function setProject(project: Project) {
    setLoaded({ projectId, project });
  }

  return {
    project: isLoading ? null : loaded.project,
    isLoading,
    setProject,
    refetch: () => setReloadToken((token) => token + 1),
  };
}
