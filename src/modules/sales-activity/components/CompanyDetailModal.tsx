"use client";

import Image from "next/image";
import { useState } from "react";
import type { SalesCompany, SalesOpportunity, OppStage } from "@/types/sales";
import { OPP_STAGES } from "@/types/sales";
import { cn } from "@/lib/utils";
import { fmtVal } from "./CompanyCard";

const STAGE_COLORS: Record<string, { pill: string; dot: string }> = {
  Prospecting:   { pill: "bg-slate-100 text-slate-700",    dot: "bg-slate-400" },
  Qualifying:    { pill: "bg-blue-100 text-blue-700",      dot: "bg-blue-500" },
  Proposal:      { pill: "bg-violet-100 text-violet-700",  dot: "bg-violet-500" },
  Negotiation:   { pill: "bg-amber-100 text-amber-700",    dot: "bg-amber-500" },
  "Closed Won":  { pill: "bg-emerald-100 text-emerald-700", dot: "bg-emerald-500" },
  "Closed Lost": { pill: "bg-red-100 text-red-700",        dot: "bg-red-400" },
};

const STAGE_ORDER = ["Negotiation", "Proposal", "Qualifying", "Prospecting", "Closed Won", "Closed Lost"];

interface CompanyDetailModalProps {
  company: SalesCompany;
  stageFilter?: string;
  repFilter?: string;
  onClose: () => void;
  onEditCompany: (company: SalesCompany) => void;
  onDeleteCompany: (id: string) => void;
  onAddOpportunity: (companyId: string) => void;
  onEditOpportunity: (opp: SalesOpportunity) => void;
  onDeleteOpportunity: (id: string) => void;
  onStageChange: (oppId: string, stage: OppStage) => void;
}

function CompanyLogo({ company }: { company: SalesCompany }) {
  const [errClearbit, setErrClearbit] = useState(false);
  const [errGoogle, setErrGoogle] = useState(false);
  const domain = company.domain?.trim().toLowerCase();
  if (domain && !errClearbit) {
    return (
      <Image
        src={`https://logo.clearbit.com/${domain}`}
        alt={company.name} width={40} height={40}
        className="object-contain rounded-lg"
        onError={() => setErrClearbit(true)} unoptimized
      />
    );
  }
  if (domain && !errGoogle) {
    return (
      <Image
        src={`https://www.google.com/s2/favicons?domain=${domain}&sz=64`}
        alt={company.name} width={40} height={40}
        className="object-contain rounded-lg"
        onError={() => setErrGoogle(true)} unoptimized
      />
    );
  }
  return (
    <span className="text-base font-bold text-muted-foreground">
      {company.name.slice(0, 2).toUpperCase()}
    </span>
  );
}

function OppRow({ opp, onEdit, onStageChange, muted }: {
  opp: SalesOpportunity;
  onEdit: () => void;
  onStageChange: (id: string, stage: OppStage) => void;
  muted?: boolean;
}) {
  const colors = STAGE_COLORS[opp.stage];
  const val = fmtVal(opp.value ?? 0);
  return (
    <li className={cn("group/opp px-5 py-3 hover:bg-muted/20 transition-colors", muted && "opacity-60")}>
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium leading-snug">{opp.name}</div>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            {opp.ownerName && (
              <span className="text-xs text-muted-foreground">{opp.ownerName}</span>
            )}
            {opp.closeDate && (
              <span className="text-xs text-muted-foreground">
                closes {new Date(opp.closeDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 pt-0.5">
          {val && <span className="text-xs font-semibold tabular-nums text-right">{val}</span>}
          <button
            type="button"
            onClick={onEdit}
            className="opacity-0 group-hover/opp:opacity-100 transition-opacity text-xs text-muted-foreground hover:text-foreground px-1.5 py-0.5 rounded hover:bg-muted"
          >
            Edit
          </button>
        </div>
      </div>

      <div className="mt-2">
        <select
          value={opp.stage}
          onChange={(e) => onStageChange(opp.id, e.target.value as OppStage)}
          className={cn(
            "rounded-full px-2.5 py-0.5 text-xs font-semibold border-0 cursor-pointer focus:outline-none focus:ring-1 focus:ring-ring",
            colors?.pill ?? "bg-muted text-muted-foreground"
          )}
        >
          {OPP_STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
    </li>
  );
}

export function CompanyDetailModal({
  company, stageFilter = "All", repFilter = "",
  onClose, onEditCompany, onDeleteCompany,
  onAddOpportunity, onEditOpportunity, onStageChange,
}: CompanyDetailModalProps) {
  const [showClosed, setShowClosed] = useState(false);

  const opps = company.opportunities ?? [];

  const allActiveOpps = opps
    .filter((o) => o.stage !== "Closed Won" && o.stage !== "Closed Lost")
    .sort((a, b) => STAGE_ORDER.indexOf(a.stage) - STAGE_ORDER.indexOf(b.stage));
  const allWonOpps  = opps.filter((o) => o.stage === "Closed Won");
  const allLostOpps = opps.filter((o) => o.stage === "Closed Lost");

  // Apply filters for the displayed lists
  const filtering = stageFilter !== "All";
  const stageActiveOpps = filtering ? allActiveOpps.filter((o) => o.stage === stageFilter) : allActiveOpps;
  const stageWonOpps    = filtering ? (stageFilter === "Closed Won"  ? allWonOpps  : []) : allWonOpps;
  const stageLostOpps   = filtering ? (stageFilter === "Closed Lost" ? allLostOpps : []) : allLostOpps;

  const activeOpps = repFilter ? stageActiveOpps.filter((o) => o.ownerName === repFilter) : stageActiveOpps;
  const wonOpps    = repFilter ? stageWonOpps.filter((o) => o.ownerName === repFilter) : stageWonOpps;
  const lostOpps   = repFilter ? stageLostOpps.filter((o) => o.ownerName === repFilter) : stageLostOpps;

  const showClosedSection = showClosed || stageFilter === "Closed Won" || stageFilter === "Closed Lost";

  // Stats always use full (unfiltered) buckets
  const pipelineValue = allActiveOpps.reduce((s, o) => s + (o.value ?? 0), 0);
  const wonValue      = allWonOpps.reduce((s, o) => s + (o.value ?? 0), 0);
  const totalClosed   = allWonOpps.length + allLostOpps.length;
  const winRate       = totalClosed > 0 ? Math.round((allWonOpps.length / totalClosed) * 100) : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-end bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="flex h-full max-h-[calc(100vh-2rem)] w-full max-w-xl flex-col rounded-xl border bg-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ──────────────────────────────────────────── */}
        <div className="flex items-start gap-4 px-5 pt-5 pb-4 border-b shrink-0">
          <div className="w-11 h-11 rounded-xl bg-muted/50 border flex items-center justify-center overflow-hidden shrink-0">
            <CompanyLogo company={company} />
          </div>

          <div className="flex-1 min-w-0">
            <h2 className="text-base font-semibold leading-tight truncate">{company.name}</h2>
            {company.domain && (
              <p className="text-xs text-muted-foreground mt-0.5">{company.domain}</p>
            )}
            {/* Stats row */}
            <div className="flex items-center gap-3 mt-2 flex-wrap text-xs">
              {allActiveOpps.length > 0 && (
                <span className="font-medium">
                  {allActiveOpps.length} active
                  {pipelineValue > 0 && <span className="text-muted-foreground"> · {fmtVal(pipelineValue)}</span>}
                </span>
              )}
              {allWonOpps.length > 0 && (
                <span className="text-emerald-600 font-medium">
                  {allWonOpps.length} won{wonValue > 0 ? ` · ${fmtVal(wonValue)}` : ""}
                </span>
              )}
              {allLostOpps.length > 0 && (
                <span className="text-red-500">{allLostOpps.length} lost</span>
              )}
              {winRate !== null && (
                <span className="text-muted-foreground">{winRate}% win rate</span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => onEditCompany(company)}
              className="text-xs text-muted-foreground hover:text-foreground px-2 py-1.5 rounded hover:bg-muted transition-colors"
            >
              Edit
            </button>
            <button
              type="button"
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground p-1.5 rounded hover:bg-muted transition-colors text-lg leading-none"
            >
              ×
            </button>
          </div>
        </div>

        {/* ── Opp list ────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto">
          {opps.length === 0 && (
            <div className="py-16 text-center text-sm text-muted-foreground">
              No opportunities yet
            </div>
          )}

          {/* Active opps */}
          {activeOpps.length > 0 && (
            <>
              <div className="px-5 pt-4 pb-1">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Active · {activeOpps.length}
                </span>
              </div>
              <ul className="divide-y">
                {activeOpps.map((opp) => (
                  <OppRow
                    key={opp.id}
                    opp={opp}
                    onEdit={() => onEditOpportunity(opp)}
                    onStageChange={onStageChange}
                  />
                ))}
              </ul>
            </>
          )}

          {/* Won / Lost toggle */}
          {(allWonOpps.length > 0 || allLostOpps.length > 0) &&
            (!filtering || wonOpps.length > 0 || lostOpps.length > 0) && (
            <>
              <button
                type="button"
                onClick={() => setShowClosed((o) => !o)}
                className="w-full flex items-center justify-between px-5 py-3 text-xs text-muted-foreground hover:text-foreground border-t hover:bg-muted/20 transition-colors"
              >
                <span className="flex items-center gap-3">
                  {allWonOpps.length > 0 && (
                    <span className="text-emerald-600 font-medium">
                      {allWonOpps.length} won{wonValue > 0 ? ` · ${fmtVal(wonValue)}` : ""}
                    </span>
                  )}
                  {allLostOpps.length > 0 && (
                    <span className="text-red-500">{allLostOpps.length} lost</span>
                  )}
                  {winRate !== null && (
                    <span className="text-muted-foreground">{winRate}% win rate</span>
                  )}
                </span>
                <svg
                  width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                  className="shrink-0 transition-transform"
                  style={{ transform: showClosedSection ? "rotate(180deg)" : "rotate(0deg)" }}
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>

              {showClosedSection && (
                <div className="border-t bg-muted/10">
                  {wonOpps.length > 0 && (
                    <>
                      <div className="px-5 pt-3 pb-1 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                        Won
                      </div>
                      <ul className="divide-y">
                        {wonOpps.map((opp) => (
                          <OppRow
                            key={opp.id}
                            opp={opp}
                            onEdit={() => onEditOpportunity(opp)}
                            onStageChange={onStageChange}
                            muted
                          />
                        ))}
                      </ul>
                    </>
                  )}
                  {lostOpps.length > 0 && (
                    <>
                      <div className="px-5 pt-3 pb-1 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                        Lost
                      </div>
                      <ul className="divide-y">
                        {lostOpps.map((opp) => (
                          <OppRow
                            key={opp.id}
                            opp={opp}
                            onEdit={() => onEditOpportunity(opp)}
                            onStageChange={onStageChange}
                            muted
                          />
                        ))}
                      </ul>
                    </>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* ── Footer ──────────────────────────────────────────── */}
        <div className="border-t px-5 py-3.5 shrink-0">
          <button
            type="button"
            onClick={() => { onAddOpportunity(company.id); }}
            className="flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" x2="12" y1="5" y2="19" /><line x1="5" x2="19" y1="12" y2="12" />
            </svg>
            Add Opportunity
          </button>
        </div>
      </div>
    </div>
  );
}
