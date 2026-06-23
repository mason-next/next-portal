"use client";

import { use } from "react";
import { WorkflowChecklist } from "@/modules/project-command-center/components/WorkflowChecklist";
import { PhaseProgressBadge } from "@/modules/project-command-center/components/PhaseProgressBadge";
import { stepsForSection } from "@/modules/project-command-center/lib/workflow-steps";
import { calculatePhaseProgress } from "@/modules/project-command-center/engine/workflow-engine";
import { useWorkflowStepsContext } from "@/modules/project-command-center/hooks/WorkflowStepsContext";

export default function ProjectCloseoutPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = use(params);
  const { steps, percentByKey, isLoading, updateStep, addStep, deleteStep } = useWorkflowStepsContext();

  if (isLoading) {
    return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-sm font-semibold">Closeout</div>
          <p className="text-sm text-muted-foreground">Track final documentation and project handoff.</p>
        </div>
        <PhaseProgressBadge percent={calculatePhaseProgress(steps, "closeout")} />
      </div>
      <WorkflowChecklist
        projectId={projectId}
        section="closeout"
        steps={stepsForSection(steps, "closeout")}
        onUpdateStep={updateStep}
        onAddStep={addStep}
        onDeleteStep={deleteStep}
        percentByKey={percentByKey}
      />
    </div>
  );
}
