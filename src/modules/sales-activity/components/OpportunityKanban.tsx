"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import type { SalesCompany, SalesOpportunity, SalesActivity, OppStage } from "@/types/sales";
import { OPP_STAGES } from "@/types/sales";

// ── Constants ─────────────────────────────────────────────────────────────────

const STAGE_CONFIG: Record<OppStage, {
  dot: string;
  colBg: string;
  colBorder: string;
  headerBorder: string;
}> = {
  "Prospecting": {
    dot: "bg-slate-400",
    colBg: "bg-slate-50/60 dark:bg-slate-900/20",
    colBorder: "border-slate-200 dark:border-slate-700",
    headerBorder: "border-slate-200 dark:border-slate-700",
  },
  "Qualifying": {
    dot: "bg-blue-400",
    colBg: "bg-blue-50/40 dark:bg-blue-900/10",
    colBorder: "border-blue-200 dark:border-blue-800",
    headerBorder: "border-blue-200 dark:border-blue-800",
  },
  "Proposal": {
    dot: "bg-violet-400",
    colBg: "bg-violet-50/40 dark:bg-violet-900/10",
    colBorder: "border-violet-200 dark:border-violet-800",
    headerBorder: "border-violet-200 dark:border-violet-800",
  },
  "Negotiation": {
    dot: "bg-amber-400",
    colBg: "bg-amber-50/40 dark:bg-amber-900/10",
    colBorder: "border-amber-200 dark:border-amber-800",
    headerBorder: "border-amber-200 dark:border-amber-800",
  },
  "Closed Won": {
    dot: "bg-emerald-400",
    colBg: "bg-emerald-50/40 dark:bg-emerald-900/10",
    colBorder: "border-emerald-200 dark:border-emerald-800",
    headerBorder: "border-emerald-200 dark:border-emerald-800",
  },
  "Closed Lost": {
    dot: "bg-red-400",
    colBg: "bg-red-50/40 dark:bg-red-900/10",
    colBorder: "border-red-200 dark:border-red-800",
    headerBorder: "border-red-200 dark:border-red-800",
  },
};

const RATING_COLORS: Record<string, string> = {
  "Highly Likely": "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  "Likely":        "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  "Possible":      "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  "Unlikely":      "bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(cents: number) {
  if (!cents) return null;
  if (cents >= 100000_00) return `$${(cents / 100000_00).toFixed(1)}M`;
  if (cents >= 1000_00) return `$${(cents / 1000_00).toFixed(0)}k`;
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(cents / 100);
}

function fmtColTotal(cents: number) {
  if (!cents) return null;
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(cents / 100);
}

function oppAge(o: SalesOpportunity): number | null {
  if (!o.proposalCreatedAt) return null;
  return Math.floor((Date.now() - new Date(o.proposalCreatedAt).getTime()) / 86400000);
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface OppCard {
  opp: SalesOpportunity;
  companyName: string;
  companyDomain: string;
  age: number | null;
  lastActivityDate: number | null;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function CompanyLogo({ domain, name }: { domain: string; name: string }) {
  const [err, setErr] = useState(false);
  if (!domain || err) {
    return (
      <div className="w-4 h-4 rounded bg-muted/60 border flex items-center justify-center shrink-0">
        <span className="text-[7px] font-bold text-muted-foreground leading-none">{name.slice(0, 2).toUpperCase()}</span>
      </div>
    );
  }
  return (
    <Image
      src={`https://www.google.com/s2/favicons?domain=${domain.toLowerCase().trim()}&sz=32`}
      alt={name} width={16} height={16}
      className="w-4 h-4 rounded object-contain shrink-0"
      onError={() => setErr(true)} unoptimized
    />
  );
}

function KanbanCard({
  card, isDragging, onDragStart, onDragEnd, onOpenConversation, onOpenCommission, onEditOpp,
}: {
  card: OppCard;
  isDragging: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
  onOpenConversation: (opp: SalesOpportunity) => void;
  onOpenCommission?: (opp: SalesOpportunity) => void;
  onEditOpp?: (opp: SalesOpportunity) => void;
}) {
  const ageClass =
    card.age === null ? "text-muted-foreground" :
    card.age > 60 ? "text-red-600 dark:text-red-400 font-semibold" :
    card.age > 30 ? "text-amber-600 dark:text-amber-400 font-semibold" :
    "text-muted-foreground";

  return (
    <div
      draggable
      onDragStart={(e) => { e.dataTransfer.effectAllowed = "move"; onDragStart(); }}
      onDragEnd={onDragEnd}
      onClick={onEditOpp ? () => onEditOpp(card.opp) : undefined}
      className={`group rounded-lg border bg-card p-3 shadow-sm transition-all select-none
        ${isDragging ? "opacity-40 scale-95" : "hover:shadow-md"}
        ${onEditOpp ? "cursor-pointer" : "cursor-grab active:cursor-grabbing"}`}
    >
      {/* Company */}
      <div className="flex items-center gap-1.5 mb-2">
        <CompanyLogo domain={card.companyDomain} name={card.companyName} />
        <span className="text-xs text-muted-foreground font-medium truncate">{card.companyName}</span>
        {card.opp.cwNumber && (
          <span className="ml-auto text-[10px] text-muted-foreground/50 shrink-0">#{card.opp.cwNumber}</span>
        )}
      </div>

      {/* Opp name */}
      <p className="text-sm font-semibold leading-snug mb-2 line-clamp-2 text-foreground">
        {card.opp.name}
      </p>

      {/* Value */}
      {(card.opp.value ?? 0) > 0 && (
        <p className="text-base font-bold text-foreground mb-1.5">{fmt(card.opp.value)}</p>
      )}

      {/* Rating + age row */}
      <div className="flex items-center gap-1.5 flex-wrap mb-2">
        {card.opp.rating && (
          <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${RATING_COLORS[card.opp.rating] ?? "bg-muted"}`}>
            {card.opp.rating}
          </span>
        )}
        {card.age !== null && (
          <span className={`text-[11px] ${ageClass}`}>{card.age}d old</span>
        )}
      </div>

      {/* Close date */}
      {card.opp.closeDate && (
        <div className="text-[11px] text-muted-foreground mb-2">
          Close: <span className="font-medium">{fmtDate(card.opp.closeDate)}</span>
        </div>
      )}

      {/* Actions — show on hover */}
      <div className="flex items-center gap-0.5 border-t border-border/50 pt-2 mt-1 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={(e) => e.stopPropagation()}>
        {card.opp.cwLink && (
          <a
            href={card.opp.cwLink}
            target="_blank"
            rel="noopener noreferrer"
            title="Open in ConnectWise"
            className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
            </svg>
          </a>
        )}
        <button
          type="button"
          title="Conversation"
          onClick={() => onOpenConversation(card.opp)}
          className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
        </button>
        {onOpenCommission && (
          <button
            type="button"
            title="Commission & Invoices"
            onClick={() => onOpenCommission(card.opp)}
            className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export interface OpportunityKanbanProps {
  companies: SalesCompany[];
  activities: SalesActivity[];
  isManagement: boolean;
  repFilter: string;
  onRepFilterChange: (r: string) => void;
  onOpenConversation: (opp: SalesOpportunity) => void;
  onOpenCommission?: (opp: SalesOpportunity) => void;
  onStageChange: (id: string, stage: OppStage) => Promise<void>;
  onEditOpportunity?: (opp: SalesOpportunity) => void;
}

export function OpportunityKanban({
  companies, activities, isManagement, repFilter, onRepFilterChange,
  onOpenConversation, onOpenCommission, onStageChange, onEditOpportunity,
}: OpportunityKanbanProps) {
  const [search, setSearch] = useState("");
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [overStage, setOverStage] = useState<OppStage | null>(null);
  const [optimisticMove, setOptimisticMove] = useState<{ id: string; stage: OppStage } | null>(null);

  // Last-activity lookup per company
  const lastActivityByCompany = useMemo(() => {
    const map = new Map<string, number>();
    for (const a of activities) {
      const cid = a.companyId ?? a.opportunity?.company.id;
      if (!cid) continue;
      const t = new Date(a.createdAt).getTime();
      if (!map.has(cid) || t > map.get(cid)!) map.set(cid, t);
    }
    return map;
  }, [activities]);

  const allCards = useMemo((): OppCard[] => {
    const result: OppCard[] = [];
    for (const c of companies) {
      for (const o of (c.opportunities ?? [])) {
        const effectiveStage = optimisticMove?.id === o.id ? optimisticMove.stage : o.stage;
        result.push({
          opp: { ...o, stage: effectiveStage },
          companyName: c.name,
          companyDomain: c.domain,
          age: oppAge(o),
          lastActivityDate: lastActivityByCompany.get(c.id) ?? null,
        });
      }
    }
    return result;
  }, [companies, lastActivityByCompany, optimisticMove]);

  const allReps = useMemo(() => {
    return Array.from(new Set(allCards.map((c) => c.opp.ownerName).filter(Boolean))).sort() as string[];
  }, [allCards]);

  const filtered = useMemo(() => {
    return allCards.filter((card) => {
      const effRep = isManagement ? repFilter : (allCards[0]?.opp.ownerName ?? "");
      if (effRep && card.opp.ownerName !== effRep) return false;
      if (search) {
        const q = search.toLowerCase();
        if (
          !card.opp.name.toLowerCase().includes(q) &&
          !card.companyName.toLowerCase().includes(q) &&
          !card.opp.ownerName.toLowerCase().includes(q)
        ) return false;
      }
      return true;
    });
  }, [allCards, repFilter, isManagement, search]);

  const byStage = useMemo(() => {
    const m = new Map<OppStage, OppCard[]>();
    for (const stage of OPP_STAGES) m.set(stage, []);
    for (const card of filtered) m.get(card.opp.stage)?.push(card);
    return m;
  }, [filtered]);

  async function handleDrop(stage: OppStage) {
    if (!draggingId) return;
    const card = allCards.find((c) => c.opp.id === draggingId);
    if (!card || card.opp.stage === stage) {
      setDraggingId(null);
      setOverStage(null);
      return;
    }
    // Optimistic update
    setOptimisticMove({ id: draggingId, stage });
    setDraggingId(null);
    setOverStage(null);
    try {
      await onStageChange(draggingId, stage);
    } finally {
      setOptimisticMove(null);
    }
  }

  return (
    <div className="space-y-3">
      {/* Filter bar */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Search */}
        <div className="relative">
          <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" width="12" height="12"
            viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search opps…"
            className="pl-8 pr-3 py-1 rounded-lg border bg-background text-xs focus:outline-none focus:ring-2 focus:ring-ring h-[30px] w-48"
          />
        </div>

        {/* Rep filter */}
        {isManagement && allReps.length > 0 && (
          <select
            value={repFilter}
            onChange={(e) => onRepFilterChange(e.target.value)}
            className="rounded-lg border bg-background px-3 py-1 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-ring h-[30px]"
          >
            <option value="">All reps</option>
            {allReps.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        )}

        {/* Summary */}
        <span className="text-xs text-muted-foreground ml-auto">
          {filtered.length} opportunit{filtered.length !== 1 ? "ies" : "y"} ·&nbsp;
          <span className="font-semibold text-foreground">
            {fmtColTotal(
              filtered
                .filter((c) => !["Closed Won", "Closed Lost"].includes(c.opp.stage))
                .reduce((s, c) => s + (c.opp.value ?? 0), 0)
            ) ?? "$0"} active pipeline
          </span>
        </span>
      </div>

      {/* Board */}
      <div className="flex gap-3 overflow-x-auto pb-4 -mx-1 px-1">
        {OPP_STAGES.map((stage) => {
          const cards = byStage.get(stage) ?? [];
          const cfg = STAGE_CONFIG[stage];
          const totalValue = cards.reduce((s, c) => s + (c.opp.value ?? 0), 0);
          const isOver = overStage === stage;

          return (
            <div
              key={stage}
              onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; setOverStage(stage); }}
              onDragLeave={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node)) setOverStage(null);
              }}
              onDrop={(e) => { e.preventDefault(); handleDrop(stage); }}
              className={`flex flex-col min-w-[215px] w-[215px] rounded-xl border transition-all duration-150
                ${isOver
                  ? "border-primary/60 bg-primary/5 shadow-lg shadow-primary/10"
                  : `${cfg.colBorder} ${cfg.colBg}`}`}
            >
              {/* Column header */}
              <div className={`flex items-center justify-between px-3 py-2.5 border-b ${cfg.headerBorder} rounded-t-xl`}>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full shrink-0 ${cfg.dot}`} />
                  <span className="text-xs font-semibold truncate">{stage}</span>
                  <span className="text-[10px] font-medium text-muted-foreground bg-muted/70 px-1.5 py-0.5 rounded-full">
                    {cards.length}
                  </span>
                </div>
                {totalValue > 0 && (
                  <span className="text-[10px] font-semibold text-muted-foreground shrink-0 ml-1">
                    {fmtColTotal(totalValue)}
                  </span>
                )}
              </div>

              {/* Cards */}
              <div className="flex-1 p-2 space-y-2 overflow-y-auto" style={{ maxHeight: "calc(100vh - 340px)", minHeight: 80 }}>
                {cards.map((card) => (
                  <KanbanCard
                    key={card.opp.id}
                    card={card}
                    isDragging={draggingId === card.opp.id}
                    onDragStart={() => setDraggingId(card.opp.id)}
                    onDragEnd={() => { setDraggingId(null); setOverStage(null); }}
                    onOpenConversation={onOpenConversation}
                    onOpenCommission={onOpenCommission}
                    onEditOpp={onEditOpportunity}
                  />
                ))}

                {/* Drop target when empty */}
                <div className={`h-14 rounded-lg border-2 border-dashed flex items-center justify-center text-[11px] text-muted-foreground/40 transition-colors
                  ${isOver ? "border-primary/40 text-primary/60" : "border-border/40"}`}>
                  {isOver ? "Drop here" : (cards.length === 0 ? "Empty" : "")}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
