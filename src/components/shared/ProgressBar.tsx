import { cn } from "@/lib/utils";

interface ProgressBarProps {
  percent: number;
  toneClassName?: string;
}

export function ProgressBar({ percent, toneClassName = "bg-primary" }: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, percent));
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
      <div className={cn("h-full rounded-full transition-all", toneClassName)} style={{ width: `${clamped}%` }} />
    </div>
  );
}
