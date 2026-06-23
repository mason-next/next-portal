import Link from "next/link";
import { ProgressBar } from "@/components/shared/ProgressBar";
import { PROJECT_SECTION_KEYS, SECTION_LABEL } from "@/modules/project-command-center/lib/workflow-steps";
import { calculatePhaseProgress } from "@/modules/project-command-center/engine/workflow-engine";
import type { WorkflowStep } from "@/types/workflow";

interface PhaseProgressPanelProps {
  projectId: string;
  steps: WorkflowStep[];
}

export function PhaseProgressPanel({ projectId, steps }: PhaseProgressPanelProps) {
  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm">
      <div className="mb-4 text-sm font-semibold">Phase Progress</div>
      <div className="space-y-3">
        {PROJECT_SECTION_KEYS.map((section) => {
          const percent = calculatePhaseProgress(steps, section);
          return (
            <div key={section}>
              <div className="mb-1 flex items-center justify-between text-xs">
                <Link
                  href={`/projects/${projectId}/${section}`}
                  className="font-medium hover:text-primary hover:underline"
                >
                  {SECTION_LABEL[section]}
                </Link>
                <span className="text-muted-foreground">{Math.round(percent)}%</span>
              </div>
              <ProgressBar percent={percent} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
