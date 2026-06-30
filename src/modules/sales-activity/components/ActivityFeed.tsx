"use client";

import Image from "next/image";
import { useState } from "react";
import type { SalesActivity } from "@/types/sales";
import { ACTIVITY_TYPES } from "@/types/sales";

const TYPE_ICONS: Record<string, string> = {
  Call: "📞", Email: "✉️", Meeting: "🗓", Research: "🔍",
  Demo: "💻", Proposal: "📄", Other: "📝",
};

function CompanyLogo({ domain, name }: { domain: string; name: string }) {
  const [err, setErr] = useState(false);
  if (!domain || err) {
    return (
      <div className="w-5 h-5 rounded bg-muted/60 border flex items-center justify-center shrink-0">
        <span className="text-[8px] font-bold text-muted-foreground leading-none">
          {name.slice(0, 2).toUpperCase()}
        </span>
      </div>
    );
  }
  return (
    <Image
      src={`https://icons.duckduckgo.com/ip3/${domain.toLowerCase().trim()}.ico`}
      alt={name} width={20} height={20}
      className="w-5 h-5 rounded object-contain shrink-0"
      onError={() => setErr(true)} unoptimized
    />
  );
}

function parseDescription(desc: string): { summary: string; detail: string } {
  if (!desc) return { summary: "", detail: "" };
  const parts = desc.split(/\n\n+/);
  const summary = parts[0]?.trim() ?? "";
  const detail  = parts.slice(1).join("\n\n").trim();
  return { summary, detail };
}

function FullNotes({ text }: { text: string }) {
  const lines = text.split("\n");
  return (
    <div className="space-y-1">
      {lines.map((line, i) => {
        const bullet = line.match(/^[•\-]\s+(.+)/);
        if (bullet) {
          return (
            <div key={i} className="flex items-start gap-1.5 text-xs text-muted-foreground">
              <span className="text-muted-foreground/50 shrink-0 mt-px">•</span>
              <span>{bullet[1]}</span>
            </div>
          );
        }
        if (!line.trim()) return null;
        return <p key={i} className="text-xs text-muted-foreground">{line}</p>;
      })}
    </div>
  );
}

interface ActivityFeedProps {
  activities: SalesActivity[];
  isManagement?: boolean;
  onEdit?: (activity: SalesActivity) => void;
  onDelete?: (id: string) => void;
}

export function ActivityFeed({ activities, isManagement, onEdit, onDelete }: ActivityFeedProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  function toggleExpand(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  if (activities.length === 0) {
    return (
      <div className="rounded-xl border bg-card p-6 text-center">
        <p className="text-sm text-muted-foreground">No activities logged.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
      <ul className="divide-y">
        {activities.map((a) => {
          const co = a.company ?? a.opportunity?.company ?? null;
          const { summary, detail } = parseDescription(a.description ?? "");
          const hasDetail = !!detail;
          const isExpanded = expandedIds.has(a.id);
          const weekLabel = new Date(a.weekStart).toLocaleDateString("en-US", {
            month: "short", day: "numeric", year: "numeric", timeZone: "UTC",
          });

          return (
            <li key={a.id} className="group flex items-start gap-3 px-4 py-2.5 hover:bg-muted/20">
              <span className="text-sm mt-0.5 shrink-0">{TYPE_ICONS[a.type] ?? "📝"}</span>

              <div className="flex-1 min-w-0">
                {/* Meta row */}
                <div className="flex items-center gap-1.5 flex-wrap text-xs">
                  <span className="font-medium text-sm">{a.type}</span>
                  {co ? (
                    <span className="inline-flex items-center gap-1 text-muted-foreground">
                      ·
                      <CompanyLogo domain={co.domain} name={co.name} />
                      <span className="font-medium text-foreground">{co.name}</span>
                      {a.opportunity && a.opportunity.name !== co.name && (
                        <span className="text-muted-foreground/70">/ {a.opportunity.name}</span>
                      )}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">· General</span>
                  )}
                  {isManagement && a.userName && (
                    <span className="text-muted-foreground">· {a.userName}</span>
                  )}
                  <span className="text-muted-foreground/50">· Week of {weekLabel}</span>
                  {a.aiGenerated && (
                    <span className="rounded-full bg-violet-100 text-violet-700 px-1.5 py-px font-medium">AI</span>
                  )}
                </div>

                {/* Summary */}
                {summary && (
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed line-clamp-2">{summary}</p>
                )}

                {/* Full notes */}
                {isExpanded && hasDetail && (
                  <div className="mt-1.5 border-l-2 border-muted/50 pl-3 space-y-1">
                    <FullNotes text={detail} />
                  </div>
                )}

                {hasDetail && (
                  <button
                    type="button"
                    onClick={() => toggleExpand(a.id)}
                    className="mt-0.5 text-[11px] text-primary/70 hover:text-primary font-medium transition-colors"
                  >
                    {isExpanded ? "Hide notes ↑" : "View full notes ↓"}
                  </button>
                )}

                {/* Contacts */}
                {a.contacts.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {a.contacts.map((c, i) => (
                      <span key={i} className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-px text-xs">
                        <span className="font-medium">{c.name}</span>
                        {c.title && <span className="text-muted-foreground">· {c.title}</span>}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-0.5">
                {onEdit && (
                  <button type="button" onClick={() => onEdit(a)}
                    className="text-xs text-muted-foreground hover:text-foreground px-1 py-0.5 rounded hover:bg-muted">
                    Edit
                  </button>
                )}
                {onDelete && (
                  <button type="button"
                    onClick={() => confirm("Delete this activity?") && onDelete(a.id)}
                    className="text-xs text-muted-foreground hover:text-destructive px-1 py-0.5 rounded hover:bg-muted">
                    ✕
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

interface ActivitySummaryCardsProps {
  summary: { totalActivities: number; byType: Record<string, number>; byPerson: Record<string, number> } | null;
  isManagement?: boolean;
}

export function ActivitySummaryCards({ summary, isManagement }: ActivitySummaryCardsProps) {
  if (!summary) return null;
  return (
    <div className="rounded-xl border bg-card shadow-sm px-4 py-3 flex flex-wrap items-center gap-x-5 gap-y-2">
      <div>
        <span className="text-xs text-muted-foreground">Total</span>
        <span className="ml-1.5 text-sm font-bold">{summary.totalActivities}</span>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        {ACTIVITY_TYPES.map((t) => (summary.byType[t] ?? 0) > 0 && (
          <span key={t} className="text-xs rounded-full bg-muted px-2 py-0.5">
            {TYPE_ICONS[t]} {t} · {summary.byType[t]}
          </span>
        ))}
      </div>
      {isManagement && Object.keys(summary.byPerson).length > 0 && (
        <div className="flex items-center gap-3 flex-wrap border-l pl-5 ml-auto">
          {Object.entries(summary.byPerson).sort((a, b) => b[1] - a[1]).map(([name, count]) => (
            <span key={name} className="text-xs">
              <span className="font-medium">{name}</span>
              <span className="text-muted-foreground ml-1">· {count}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
