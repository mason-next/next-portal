import Link from "next/link";
import { CollapsibleCard } from "@/components/shared/CollapsibleCard";
import { ProgressBar } from "@/components/shared/ProgressBar";
import { PROJECT_SECTION_KEYS, SECTION_LABEL } from "@/modules/project-command-center/lib/workflow-steps";
import { calculatePhaseProgress } from "@/modules/project-command-center/engine/workflow-engine";
import type { WorkflowStep } from "@/types/workflow";

interface PhaseProgressPanelProps {
  projectId: string;
  steps: WorkflowStep[];
}

export function PhaseProgressPanel({ projectId, steps }: PhaseProgressPanelProps) {
  // Only render sections that have at least one active step.
  const activeSections = new Set(steps.map((s) => s.section));
  const visibleSections = PROJECT_SECTION_KEYS.filter((k) => activeSections.has(k));

  if (visibleSections.length === 0) return null;

  return (
    <CollapsibleCard title="Phase Progress" storageKey="phase-progress">
      <div className="space-y-3">
        {visibleSections.map((section) => {
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
    </CollapsibleCard>
  );
}
