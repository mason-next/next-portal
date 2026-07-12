"use client";

import { use, useEffect, useState } from "react";
import { useSession } from "@/lib/auth/client";
import { useProjectContext } from "@/modules/project-command-center/hooks/ProjectContext";
import { useWorkflowStepsContext } from "@/modules/project-command-center/hooks/WorkflowStepsContext";
import { useUsersContext } from "@/components/shared/AppShell/UsersProvider";
import { GanttView } from "@/modules/gantt/components/GanttView";
import { getProjectTasks } from "@/lib/data/implementation";
import { usePermissions } from "@/lib/PermissionsContext";
import type { ImplementationTask } from "@/types/implementation";

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
  const { hasAccess } = usePermissions();

  const [tasks, setTasks] = useState<ImplementationTask[]>([]);
  const [tasksLoading, setTasksLoading] = useState(true);

  const canViewProject = hasAccess("projects");

  useEffect(() => {
    if (!projectId) return;
    getProjectTasks(projectId).then((t) => {
      setTasks(t);
      setTasksLoading(false);
    });
  }, [projectId]);

  if (!canViewProject) {
    return (
      <div className="p-8 text-sm text-muted-foreground">
        You do not have permission to view this project.
      </div>
    );
  }

  if (stepsLoading || tasksLoading) {
    return <div className="p-6 text-sm text-muted-foreground">Loading Gantt…</div>;
  }

  if (!project) return null;

  const isAdmin = session.roleTypes.includes("Administrator");
  const canEdit = isAdmin || session.roleTypes.some((r) => !["Customer", "Subcontractor", "Viewer"].includes(r));

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-sm font-semibold">Gantt Chart</h2>
        <p className="text-sm text-muted-foreground">
          Visual timeline of phases, steps, and tasks.
          Use eye icons to hide items from the current view — hidden items are excluded from exports.
        </p>
      </div>

      <GanttView
        steps={steps}
        tasks={tasks}
        users={users}
        projectName={project.name}
        customerName={project.customerName}
        canEdit={canEdit}
      />
    </div>
  );
}
