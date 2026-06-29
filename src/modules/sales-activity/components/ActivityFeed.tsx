"use client";

import type { SalesActivity } from "@/types/sales";
import { ACTIVITY_TYPES } from "@/types/sales";
import { cn } from "@/lib/utils";

const TYPE_ICONS: Record<string, string> = {
  Call: "📞",
  Email: "✉️",
  Meeting: "🗓",
  Research: "🔍",
  Demo: "💻",
  Proposal: "📄",
  Other: "📝",
};

interface ActivityFeedProps {
  activities: SalesActivity[];
  isManagement?: boolean;
  onDelete?: (id: string) => void;
}

export function ActivityFeed({ activities, isManagement, onDelete }: ActivityFeedProps) {
  if (activities.length === 0) {
    return (
      <div className="rounded-xl border bg-card p-8 text-center">
        <p className="text-sm text-muted-foreground">No activities logged this week.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      <div className="px-5 py-3 border-b bg-muted/30">
        <h3 className="text-sm font-semibold">This Week</h3>
      </div>
      <ul className="divide-y">
        {activities.map((a) => (
          <li key={a.id} className="group flex items-start gap-3 px-5 py-3 hover:bg-muted/20">
            <span className="text-base mt-0.5">{TYPE_ICONS[a.type] ?? "📝"}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium">{a.type}</span>
                {a.logo && (
                  <span className="text-xs text-muted-foreground">· {a.logo.company}</span>
                )}
                {isManagement && (
                  <span className="text-xs text-muted-foreground">· {a.userName}</span>
                )}
                {a.durationMins > 0 && (
                  <span className="text-xs text-muted-foreground ml-auto">{a.durationMins}m</span>
                )}
              </div>
              {a.description && (
                <p className="text-xs text-muted-foreground mt-0.5 truncate">{a.description}</p>
              )}
            </div>
            {onDelete && (
              <button
                type="button"
                onClick={() => confirm("Delete this activity?") && onDelete(a.id)}
                className="text-xs text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
              >
                ✕
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

interface SummaryCardProps {
  summary: { byType: Record<string, number>; byPerson: Record<string, number>; totalMins: number } | null;
  isManagement?: boolean;
}

export function ActivitySummaryCards({ summary, isManagement }: SummaryCardProps) {
  if (!summary) return null;
  const totalActivities = Object.values(summary.byType).reduce((s, v) => s + v, 0);
  const hours = Math.floor(summary.totalMins / 60);
  const mins = summary.totalMins % 60;
  const timeStr = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <div className="rounded-lg bg-muted/40 p-4">
        <div className="text-xs text-muted-foreground">Total Activities</div>
        <div className="text-2xl font-bold mt-1">{totalActivities}</div>
      </div>
      <div className="rounded-lg bg-muted/40 p-4">
        <div className="text-xs text-muted-foreground">Time Logged</div>
        <div className="text-2xl font-bold mt-1">{timeStr}</div>
      </div>
      <div className="rounded-lg bg-muted/40 p-4 col-span-2">
        <div className="text-xs text-muted-foreground mb-2">By Type</div>
        <div className="flex flex-wrap gap-2">
          {ACTIVITY_TYPES.map((t) => summary.byType[t] > 0 && (
            <span key={t} className="text-xs rounded-full bg-background border px-2 py-0.5">
              {TYPE_ICONS[t]} {t} ·{summary.byType[t]}
            </span>
          ))}
        </div>
      </div>
      {isManagement && Object.keys(summary.byPerson).length > 0 && (
        <div className="rounded-lg bg-muted/40 p-4 col-span-2 sm:col-span-4">
          <div className="text-xs text-muted-foreground mb-2">By Person</div>
          <div className="flex flex-wrap gap-3">
            {Object.entries(summary.byPerson).sort((a, b) => b[1] - a[1]).map(([name, count]) => (
              <span key={name} className="text-xs">
                <span className="font-medium">{name}</span>
                <span className="text-muted-foreground ml-1">·{count}</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
