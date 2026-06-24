"use client";

import { use } from "react";
import { ProjectOverviewCard } from "@/modules/project-command-center/components/ProjectOverviewCard";
import { ProjectHealthPanel } from "@/modules/project-command-center/components/ProjectHealthPanel";
import { PhaseProgressPanel } from "@/modules/project-command-center/components/PhaseProgressPanel";
import { WorkflowChecklist } from "@/modules/project-command-center/components/WorkflowChecklist";
import { useWorkflowStepsContext } from "@/modules/project-command-center/hooks/WorkflowStepsContext";
import { useProjectContext } from "@/modules/project-command-center/hooks/ProjectContext";
import { getProjectHealthSummary } from "@/modules/project-command-center/engine/workflow-engine";

export default function ProjectDashboardPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = use(params);
  const { project, isLoading: projectLoading } = useProjectContext();
  const { steps, percentByKey, isLoading, updateStep, deleteStep } = useWorkflowStepsContext();

  if (!project || projectLoading || isLoading) {
    return <div className="p-6 text-sm text-muted-foreground">Loading project…</div>;
  }

  const healthSummary = getProjectHealthSummary({
    steps,
    startDate: project.createdAt,
    targetCompletionDate: project.targetCompletionDate,
    now: new Date(),
  });

  return (
    <div className="space-y-4">
      <ProjectOverviewCard />
      <ProjectHealthPanel {...healthSummary} />
      <PhaseProgressPanel projectId={projectId} steps={steps} />
      <div>
        <div className="mb-2 text-sm font-semibold">Project Workflow</div>
        <WorkflowChecklist
          projectId={projectId}
          steps={steps}
          onUpdateStep={updateStep}
          onDeleteStep={deleteStep}
          percentByKey={percentByKey}
        />
      </div>
    </div>
  );
}
