"use client";

import { use } from "react";
import { WorkflowChecklist } from "@/modules/project-command-center/components/WorkflowChecklist";
import { PhaseProgressBadge } from "@/modules/project-command-center/components/PhaseProgressBadge";
import { stepsForSection } from "@/modules/project-command-center/lib/workflow-steps";
import { calculatePhaseProgress } from "@/modules/project-command-center/engine/workflow-engine";
import { useWorkflowStepsContext } from "@/modules/project-command-center/hooks/WorkflowStepsContext";

export default function ProjectProcurementPage({
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
          <div className="text-sm font-semibold">Procurement</div>
          <p className="text-sm text-muted-foreground">
            Track ordering and fulfillment of approved equipment for this project.
          </p>
        </div>
        <PhaseProgressBadge percent={calculatePhaseProgress(steps, "procurement")} />
      </div>
      <WorkflowChecklist
        projectId={projectId}
        section="procurement"
        steps={stepsForSection(steps, "procurement")}
        onUpdateStep={updateStep}
        onAddStep={addStep}
        onDeleteStep={deleteStep}
        percentByKey={percentByKey}
      />
    </div>
  );
}
