"use client";

import Image from "next/image";
import { useState } from "react";
import type { SalesCompany } from "@/types/sales";
import { cn } from "@/lib/utils";

const STAGE_COLORS: Record<string, { pill: string; dot: string }> = {
  Prospecting:   { pill: "bg-slate-100 text-slate-700",    dot: "bg-slate-400" },
  Qualifying:    { pill: "bg-blue-100 text-blue-700",      dot: "bg-blue-500" },
  Proposal:      { pill: "bg-violet-100 text-violet-700",  dot: "bg-violet-500" },
  Negotiation:   { pill: "bg-amber-100 text-amber-700",    dot: "bg-amber-500" },
  "Closed Won":  { pill: "bg-emerald-100 text-emerald-700", dot: "bg-emerald-500" },
  "Closed Lost": { pill: "bg-red-100 text-red-700",        dot: "bg-red-400" },
};

const STAGE_ORDER = ["Negotiation", "Proposal", "Qualifying", "Prospecting", "Closed Won", "Closed Lost"];
const ACTIVE_STAGES = new Set(["Prospecting", "Qualifying", "Proposal", "Negotiation"]);
const DOT_LIMIT = 10;

export interface CompanyCardProps {
  company: SalesCompany;
  stageFilter?: string;
  repFilter?: string;
  onClick: () => void;
  onEditCompany: (company: SalesCompany) => void;
}

function CompanyLogo({ company }: { company: SalesCompany }) {
  const [errClearbit, setErrClearbit] = useState(false);
  const [errGoogle, setErrGoogle] = useState(false);
  const domain = company.domain?.trim().toLowerCase();
  if (domain && !errClearbit) {
    return (
      <Image
        src={`https://logo.clearbit.com/${domain}`}
        alt={company.name} width={32} height={32}
        className="object-contain rounded"
        onError={() => setErrClearbit(true)} unoptimized
      />
    );
  }
  if (domain && !errGoogle) {
    return (
      <Image
        src={`https://www.google.com/s2/favicons?domain=${domain}&sz=64`}
        alt={company.name} width={32} height={32}
        className="object-contain rounded"
        onError={() => setErrGoogle(true)} unoptimized
      />
    );
  }
  return (
    <span className="text-xs font-bold text-muted-foreground leading-none">
      {company.name.slice(0, 2).toUpperCase()}
    </span>
  );
}

export function fmtVal(cents: number) {
  if (!cents) return null;
  const v = cents / 100;
  if (v >= 1_000_000) return "$" + (v / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (v >= 1_000)     return "$" + Math.round(v / 1_000) + "K";
  return "$" + Math.round(v).toLocaleString();
}

export function CompanyCard({
  company, stageFilter = "All", repFilter = "", onClick, onEditCompany,
}: CompanyCardProps) {
  const opps = company.opportunities ?? [];

  const allActiveOpps = opps
    .filter((o) => ACTIVE_STAGES.has(o.stage))
    .sort((a, b) => STAGE_ORDER.indexOf(a.stage) - STAGE_ORDER.indexOf(b.stage));
  const allWonOpps  = opps.filter((o) => o.stage === "Closed Won");
  const allLostOpps = opps.filter((o) => o.stage === "Closed Lost");

  // Apply filters for displayed stats
  const filterOpp = (o: { stage: string; ownerName: string }) =>
    (stageFilter === "All" || o.stage === stageFilter) &&
    (!repFilter || o.ownerName === repFilter);

  const activeOpps  = allActiveOpps.filter(filterOpp);
  const wonOpps     = allWonOpps.filter(filterOpp);

  const pipelineValue = allActiveOpps.reduce((s, o) => s + (o.value ?? 0), 0);
  const wonValue      = allWonOpps.reduce((s, o) => s + (o.value ?? 0), 0);
  const totalClosed   = allWonOpps.length + allLostOpps.length;
  const winRate       = totalClosed > 0 ? Math.round((allWonOpps.length / totalClosed) * 100) : null;

  // Stage dots — show dots for active opps up to DOT_LIMIT
  const visibleDots = activeOpps.slice(0, DOT_LIMIT);
  const extraDots   = activeOpps.length - DOT_LIMIT;

  const hasActive = activeOpps.length > 0;
  const hasClosed = allWonOpps.length > 0 || allLostOpps.length > 0;

  return (
    <div
      onClick={onClick}
      className="group rounded-xl border bg-card shadow-sm hover:shadow-md hover:border-primary/30 transition-all cursor-pointer flex flex-col select-none"
    >
      {/* ── Top section ─────────────────────────── */}
      <div className="px-3 pt-3 pb-2.5 flex flex-col gap-2">

        {/* Row 1: logo + edit */}
        <div className="flex items-center justify-between">
          <div className="w-7 h-7 rounded-md bg-muted/60 border flex items-center justify-center overflow-hidden shrink-0">
            <CompanyLogo company={company} />
          </div>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onEditCompany(company); }}
            className="opacity-0 group-hover:opacity-100 transition-opacity text-xs text-muted-foreground hover:text-foreground px-1.5 py-0.5 rounded hover:bg-muted"
          >
            Edit
          </button>
        </div>

        {/* Row 2: company name — full width, wraps up to 2 lines */}
        <div className="font-semibold text-sm leading-snug line-clamp-2">{company.name}</div>

        {/* Row 3: stage dots */}
        {hasActive ? (
          <div className="flex items-center gap-1 flex-wrap">
            {visibleDots.map((opp, i) => (
              <span
                key={i}
                title={opp.stage}
                className={cn("w-2 h-2 rounded-full shrink-0", STAGE_COLORS[opp.stage]?.dot ?? "bg-muted-foreground")}
              />
            ))}
            {extraDots > 0 && (
              <span className="text-[10px] text-muted-foreground font-medium">+{extraDots}</span>
            )}
          </div>
        ) : wonOpps.length > 0 ? (
          <div className="text-xs text-emerald-600 font-medium">{fmtVal(wonValue) ?? ""} won</div>
        ) : (
          <div className="text-xs text-muted-foreground">No opportunities</div>
        )}
      </div>

      {/* ── Stats footer ────────────────────────── */}
      <div className="mt-auto border-t px-3 py-2 flex items-center justify-between gap-1">
        <div className="text-xs text-muted-foreground leading-none min-w-0">
          {hasActive ? (
            <span className="truncate">
              <span className="font-semibold text-foreground">{activeOpps.length}</span>
              {" active"}
              {pipelineValue > 0 && (
                <span className="font-semibold text-foreground"> · {fmtVal(pipelineValue)}</span>
              )}
            </span>
          ) : hasClosed ? (
            <span className="text-muted-foreground">Closed only</span>
          ) : null}
        </div>
        {winRate !== null && (
          <span className={cn("text-xs font-medium shrink-0", winRate >= 50 ? "text-emerald-600" : "text-muted-foreground")}>
            {winRate}%
          </span>
        )}
      </div>
    </div>
  );
}
