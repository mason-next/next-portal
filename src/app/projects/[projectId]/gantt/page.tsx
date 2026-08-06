"use client";

import { use, useEffect, useState } from "react";
import { useProjectContext } from "@/modules/project-command-center/hooks/ProjectContext";
import { useWorkflowStepsContext } from "@/modules/project-command-center/hooks/WorkflowStepsContext";
import { useUsersContext } from "@/components/shared/AppShell/UsersProvider";
import { usePermissions } from "@/lib/PermissionsContext";
import { useViewAs } from "@/lib/view-as/ViewAsContext";
import { useSession } from "@/lib/auth/client";
import { getProjectTasks } from "@/lib/data/implementation";
import { getGanttEntries } from "@/lib/data/gantt";
import { getGanttDeps } from "@/lib/data/gantt-deps";
import { GanttContainer } from "@/modules/gantt/components/GanttContainer";
import type { ImplementationTask } from "@/types/implementation";
import type { GanttEntryFull, GanttDependencyRecord } from "@/types/gantt";

export default function ProjectGanttPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = use(params);
  const { project } = useProjectContext();
  const { steps, isLoading: stepsLoading } = useWorkflowStepsContext();
  const { users } = useUsersContext();
  const session = useSession();
  const { hasAccess, getLevel } = usePermissions();
  const { isViewAsMode } = useViewAs();

  const [tasks, setTasks] = useState<ImplementationTask[]>([]);
  const [ganttEntries, setGanttEntries] = useState<GanttEntryFull[]>([]);
  const [ganttDeps, setGanttDeps] = useState<GanttDependencyRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const canViewProject = hasAccess("projects");
  const accessLevel = getLevel("projects");
  const isAdmin = session.roleTypes.includes("Administrator");
  const canEdit =
    !isViewAsMode &&
    (isAdmin || (accessLevel !== "none" && accessLevel !== "viewer"));

  useEffect(() => {
    if (!projectId) return;
    Promise.all([
      getProjectTasks(projectId),
      getGanttEntries(projectId),
      getGanttDeps(projectId),
    ]).then(([t, g, d]) => {
      setTasks(t);
      setGanttEntries(g);
      setGanttDeps(d);
      setLoading(false);
    });
  }, [projectId]);

  if (!canViewProject) {
    return (
      <div className="p-8 text-sm text-muted-foreground">
        You do not have permission to view this project.
      </div>
    );
  }

  if (stepsLoading || loading || !project) {
    return (
      <div className="p-6 text-sm text-muted-foreground animate-pulse">
        Loading schedule…
      </div>
    );
  }

  return (
    <GanttContainer
      projectId={projectId}
      initialEntries={ganttEntries}
      initialDeps={ganttDeps}
      allSteps={steps}
      allTasks={tasks}
      users={users}
      canEdit={canEdit}
      isViewAs={isViewAsMode}
    />
  );
}
