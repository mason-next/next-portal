import { ProgressBar } from "@/components/shared/ProgressBar";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { HEALTH_TONE } from "@/modules/project-command-center/lib/project-health";
import type { ProjectHealthSummary } from "@/modules/project-command-center/engine/workflow-engine";

const BAR_TONE_CLASS: Record<string, string> = {
  success: "bg-emerald-500",
  warning: "bg-amber-500",
  danger: "bg-red-500",
  info: "bg-sky-500",
};

export function ProjectHealthPanel({ actualProgress, expectedProgress, variance, health }: ProjectHealthSummary) {
  const tone = HEALTH_TONE[health];

  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div className="text-sm font-semibold">Project Progress</div>
        <StatusBadge label={health} tone={tone} />
      </div>
      <div className="mb-2 flex items-end justify-between">
        <span className="text-3xl font-extrabold tracking-tight">{Math.round(actualProgress)}%</span>
        <span className="text-xs text-muted-foreground">
          {expectedProgress === null
            ? "Expected progress unavailable — set kickoff and target completion dates"
            : `Expected ${Math.round(expectedProgress)}% · Variance ${variance !== null && variance >= 0 ? "+" : ""}${variance !== null ? Math.round(variance) : "—"} pts`}
        </span>
      </div>
      <ProgressBar percent={actualProgress} toneClassName={BAR_TONE_CLASS[tone]} />
    </div>
  );
}
