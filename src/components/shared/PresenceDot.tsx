"use client";

import { cn } from "@/lib/utils";
import { getPresenceStatus, type PresenceStatus } from "@/types/user";

const DOT_COLOR: Record<PresenceStatus, string> = {
  online: "bg-emerald-500",
  away:   "bg-amber-400",
  offline: "bg-muted-foreground/40",
};

const STATUS_LABEL: Record<PresenceStatus, string> = {
  online:  "Online",
  away:    "Away",
  offline: "Offline",
};

interface PresenceDotProps {
  lastActiveAt: string | null;
  /** Dot diameter in px. Defaults to 8. */
  size?: number;
  className?: string;
}

export function PresenceDot({ lastActiveAt, size = 8, className }: PresenceDotProps) {
  const status = getPresenceStatus(lastActiveAt);
  return (
    <span
      title={STATUS_LABEL[status]}
      aria-label={STATUS_LABEL[status]}
      className={cn("inline-block rounded-full shrink-0", DOT_COLOR[status], className)}
      style={{ width: size, height: size }}
    />
  );
}

interface PresenceStatusBadgeProps {
  lastActiveAt: string | null;
  className?: string;
}

/** Full "Online / Away / Offline + last active" label for profile views. */
export function PresenceStatusBadge({ lastActiveAt, className }: PresenceStatusBadgeProps) {
  const status = getPresenceStatus(lastActiveAt);

  let sub: string | null = null;
  if (status !== "online" && lastActiveAt) {
    sub = `Last active ${formatRelative(lastActiveAt)}`;
  }

  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <PresenceDot lastActiveAt={lastActiveAt} size={8} />
      <span className="text-sm">
        {STATUS_LABEL[status]}
        {sub && <span className="ml-1 text-xs text-muted-foreground">· {sub}</span>}
      </span>
    </div>
  );
}

function formatRelative(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1)  return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24)   return `${diffH}h ago`;
  const diffD = Math.floor(diffH / 24);
  return `${diffD}d ago`;
}
