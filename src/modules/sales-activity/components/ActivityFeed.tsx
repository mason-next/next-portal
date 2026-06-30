"use client";

import Image from "next/image";
import { useState } from "react";
import type { SalesActivity } from "@/types/sales";
import { ACTIVITY_TYPES } from "@/types/sales";

const TYPE_ICONS: Record<string, string> = {
  Call: "📞", Email: "✉️", Meeting: "🗓", Research: "🔍",
  Demo: "💻", Proposal: "📄", Other: "📝",
};

const TYPE_BG: Record<string, string> = {
  Call:     "bg-blue-50 text-blue-500 dark:bg-blue-900/30 dark:text-blue-400",
  Email:    "bg-indigo-50 text-indigo-500 dark:bg-indigo-900/30 dark:text-indigo-400",
  Meeting:  "bg-violet-50 text-violet-500 dark:bg-violet-900/30 dark:text-violet-400",
  Research: "bg-amber-50 text-amber-500 dark:bg-amber-900/30 dark:text-amber-400",
  Demo:     "bg-cyan-50 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-400",
  Proposal: "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400",
  Other:    "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
};

function CompanyLogo({ domain, name }: { domain: string; name: string }) {
  const [err, setErr] = useState(false);
  if (!domain || err) {
    return (
      <div className="w-[22px] h-[22px] rounded bg-muted/60 border flex items-center justify-center shrink-0">
        <span className="text-[9px] font-bold text-muted-foreground leading-none">
          {name.slice(0, 2).toUpperCase()}
        </span>
      </div>
    );
  }
  return (
    <Image
      src={`https://www.google.com/s2/favicons?domain=${domain.toLowerCase().trim()}&sz=64`}
      alt={name} width={22} height={22}
      className="w-[22px] h-[22px] rounded object-contain shrink-0"
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
            <div key={i} className="flex items-start gap-1.5 text-sm text-muted-foreground">
              <span className="text-muted-foreground/40 shrink-0 mt-px">•</span>
              <span>{bullet[1]}</span>
            </div>
          );
        }
        if (!line.trim()) return null;
        return <p key={i} className="text-sm text-muted-foreground">{line}</p>;
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
      <div className="rounded-xl border bg-card p-10 text-center">
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
          const dateLabel = a.weekStart
            ? new Date(a.weekStart).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })
            : "";

          return (
            <li key={a.id} className="group flex items-start gap-3 px-4 py-3.5 hover:bg-muted/20 transition-colors">

              {/* Type icon block */}
              <div className={`flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center text-base ${TYPE_BG[a.type] ?? "bg-slate-100 text-slate-500"}`}>
                {TYPE_ICONS[a.type] ?? "📝"}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">

                {/* Row 1: type · company · spacer · meta · actions */}
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-sm font-semibold shrink-0">{a.type}</span>

                  {co ? (
                    <div className="flex items-center gap-1.5 min-w-0 overflow-hidden">
                      <span className="text-muted-foreground/40 shrink-0">·</span>
                      <CompanyLogo domain={co.domain} name={co.name} />
                      <span className="text-sm font-medium truncate">{co.name}</span>
                      {a.opportunity && a.opportunity.name !== co.name && (
                        <span className="text-xs text-muted-foreground shrink-0 truncate">/ {a.opportunity.name}</span>
                      )}
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground shrink-0">· General</span>
                  )}

                  {a.aiGenerated && (
                    <span className="rounded-full bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400 px-1.5 py-px text-[10px] font-semibold shrink-0">AI</span>
                  )}

                  <div className="flex-1" />

                  {/* Right-aligned meta */}
                  <div className="flex items-center gap-3 shrink-0">
                    {isManagement && a.userName && (
                      <span className="text-xs text-muted-foreground hidden sm:inline">{a.userName}</span>
                    )}
                    <span className="text-xs text-muted-foreground/50 tabular-nums">{dateLabel}</span>

                    {/* Hover actions */}
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      {onEdit && (
                        <button type="button" onClick={() => onEdit(a)}
                          className="rounded px-2 py-0.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                          Edit
                        </button>
                      )}
                      {onDelete && (
                        <button type="button"
                          onClick={() => confirm("Delete this activity?") && onDelete(a.id)}
                          className="rounded px-2 py-0.5 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors ml-0.5">
                          ✕
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Row 2: summary */}
                {summary && (
                  <p className="text-sm text-muted-foreground mt-1 leading-relaxed line-clamp-2">{summary}</p>
                )}

                {/* Expanded notes */}
                {isExpanded && hasDetail && (
                  <div className="mt-2 border-l-2 border-muted/50 pl-3 space-y-1">
                    <FullNotes text={detail} />
                  </div>
                )}

                {hasDetail && (
                  <button
                    type="button"
                    onClick={() => toggleExpand(a.id)}
                    className="mt-1 text-[11px] text-primary/70 hover:text-primary font-medium transition-colors"
                  >
                    {isExpanded ? "Hide notes ↑" : "View full notes ↓"}
                  </button>
                )}

                {/* Contacts */}
                {a.contacts.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {a.contacts.map((c, i) => (
                      <span key={i} className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-xs">
                        <span className="font-medium">{c.name}</span>
                        {c.title && <span className="text-muted-foreground">· {c.title}</span>}
                      </span>
                    ))}
                  </div>
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
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-muted-foreground">Total</span>
        <span className="text-sm font-bold">{summary.totalActivities}</span>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        {ACTIVITY_TYPES.map((t) => (summary.byType[t] ?? 0) > 0 && (
          <span key={t} className={`inline-flex items-center gap-1 text-xs rounded-full px-2.5 py-0.5 font-medium ${TYPE_BG[t] ?? "bg-muted text-muted-foreground"}`}>
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
