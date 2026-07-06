"use client";

import { useEffect, useState } from "react";
import { getProject } from "@/lib/data/projects";
import type { Project } from "@/types/project";

export function useProject(projectId: string) {
  // Keyed by the projectId it was fetched for, so a project switch is "loading" until
  // the new fetch resolves — same guard useBomRows/useWorkflowSteps already use.
  const [loaded, setLoaded] = useState<{
    projectId: string;
    project: Project | null;
    fetchError: boolean;
  } | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let active = true;
    getProject(projectId)
      .then((project) => {
        if (active) setLoaded({ projectId, project, fetchError: false });
      })
      .catch(() => {
        // Don't treat server errors as "project not found" — track them separately
        // so the layout can show an error UI instead of a 404 page.
        if (active) setLoaded({ projectId, project: null, fetchError: true });
      });
    return () => {
      active = false;
    };
  }, [projectId, reloadToken]);

  const isLoading = loaded === null || loaded.projectId !== projectId;

  function setProject(project: Project) {
    setLoaded({ projectId, project, fetchError: false });
  }

  return {
    project: isLoading ? null : loaded.project,
    fetchError: !isLoading && (loaded?.fetchError ?? false),
    isLoading,
    setProject,
    refetch: () => setReloadToken((token) => token + 1),
  };
}
