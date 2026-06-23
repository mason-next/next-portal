import { ProgressBar } from "@/components/shared/ProgressBar";

export function PhaseProgressBadge({ percent }: { percent: number }) {
  return (
    <div className="flex w-40 flex-col items-end gap-1.5">
      <span className="text-sm font-semibold text-muted-foreground">{Math.round(percent)}% complete</span>
      <ProgressBar percent={percent} />
    </div>
  );
}
