"use client";

import { use } from "react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { WorkflowChecklist } from "@/modules/project-command-center/components/WorkflowChecklist";
import { PhaseProgressBadge } from "@/modules/project-command-center/components/PhaseProgressBadge";
import { stepsForSection } from "@/modules/project-command-center/lib/workflow-steps";
import { calculatePhaseProgress } from "@/modules/project-command-center/engine/workflow-engine";
import { useWorkflowStepsContext } from "@/modules/project-command-center/hooks/WorkflowStepsContext";
import { useBomRowsContext } from "@/modules/bom-release/hooks/BomRowsContext";
import { bomCompletionPercent } from "@/modules/bom-release/lib/bom-progress";

export default function ProjectEngineeringPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = use(params);
  const { steps, percentByKey, isLoading, updateStep, addStep, deleteStep } = useWorkflowStepsContext();
  const { rows, isLoading: rowsLoading } = useBomRowsContext();

  if (isLoading) {
    return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;
  }

  const bomPercent = !rowsLoading && rows && rows.length > 0 ? bomCompletionPercent(rows) : null;

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-sm font-semibold">Engineering</div>
          <p className="text-sm text-muted-foreground">Review CAD drawings and finalize the bill of materials.</p>
        </div>
        <PhaseProgressBadge percent={calculatePhaseProgress(steps, "engineering")} />
      </div>

      <div className="flex items-center justify-between rounded-xl border bg-card p-5 shadow-sm">
        <div>
          <div className="text-sm font-semibold">BOM Review</div>
          <p className="text-sm text-muted-foreground">
            {bomPercent !== null ? `${bomPercent}% of line items reviewed` : "No BOM loaded yet"}
          </p>
        </div>
        <Link
          href={`/projects/${projectId}/engineering/bom-review`}
          className={buttonVariants({ variant: "outline" })}
        >
          Open BOM Review
        </Link>
      </div>

      <WorkflowChecklist
        projectId={projectId}
        section="engineering"
        steps={stepsForSection(steps, "engineering")}
        onUpdateStep={updateStep}
        onAddStep={addStep}
        onDeleteStep={deleteStep}
        percentByKey={percentByKey}
      />
    </div>
  );
}
