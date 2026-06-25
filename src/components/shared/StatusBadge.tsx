import { cn } from "@/lib/utils";

export type StatusTone = "neutral" | "success" | "warning" | "danger" | "info" | "orange" | "purple";

interface StatusBadgeProps {
  label: string;
  tone: StatusTone;
}

const TONE_CLASSES: Record<StatusTone, string> = {
  neutral: "bg-muted text-muted-foreground",
  success: "bg-emerald-100 text-emerald-700",
  warning: "bg-amber-100 text-amber-700",
  danger: "bg-red-100 text-red-700",
  info: "bg-sky-100 text-sky-700",
  orange: "bg-orange-100 text-orange-700",
  purple: "bg-purple-100 text-purple-700",
};

export function StatusBadge({ label, tone }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-semibold",
        TONE_CLASSES[tone]
      )}
    >
      <span className="size-1.5 rounded-full bg-current" />
      {label}
    </span>
  );
}
