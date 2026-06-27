"use client";

import { use } from "react";
import { WorkflowChecklist } from "@/modules/project-command-center/components/WorkflowChecklist";
import { PhaseProgressBadge } from "@/modules/project-command-center/components/PhaseProgressBadge";
import { stepsForSection } from "@/modules/project-command-center/lib/workflow-steps";
import { calculatePhaseProgress } from "@/modules/project-command-center/engine/workflow-engine";
import { useWorkflowStepsContext } from "@/modules/project-command-center/hooks/WorkflowStepsContext";
import { useUsersContext } from "@/components/shared/AppShell/UsersProvider";
import { TaskList } from "@/modules/implementation/components/TaskList";

export default function ProjectImplementationPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = use(params);
  const { steps, percentByKey, isLoading, updateStep, addStep, deleteStep } = useWorkflowStepsContext();
  const { users } = useUsersContext();

  if (isLoading) {
    return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="mb-4 flex items-start justify-between">
          <div>
            <div className="text-sm font-semibold">Implementation</div>
            <p className="text-sm text-muted-foreground">Track installation, programming, and commissioning work.</p>
          </div>
          <PhaseProgressBadge percent={calculatePhaseProgress(steps, "implementation")} />
        </div>
        <WorkflowChecklist
          projectId={projectId}
          section="implementation"
          steps={stepsForSection(steps, "implementation")}
          onUpdateStep={updateStep}
          onAddStep={addStep}
          onDeleteStep={deleteStep}
          percentByKey={percentByKey}
        />
      </div>

      <div className="rounded-xl border bg-card p-5 shadow-sm">
        <TaskList projectId={projectId} users={users} />
      </div>
    </div>
  );
}
