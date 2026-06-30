"use client";

import Image from "next/image";
import { useState } from "react";
import type { SalesCompany, SalesOpportunity, OppStage } from "@/types/sales";
import { OPP_STAGES } from "@/types/sales";
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

const ACTIVE_LIMIT = 5;

interface CompanyCardProps {
  company: SalesCompany;
  onEditCompany: (company: SalesCompany) => void;
  onDeleteCompany: (id: string) => void;
  onAddOpportunity: (companyId: string) => void;
  onEditOpportunity: (opp: SalesOpportunity) => void;
  onDeleteOpportunity: (id: string) => void;
  onStageChange: (oppId: string, stage: OppStage) => void;
}

function CompanyLogo({ company }: { company: SalesCompany }) {
  const [err, setErr] = useState(false);
  const domain = company.domain?.trim().toLowerCase();
  if (domain && !err) {
    return (
      <Image
        src={`https://www.google.com/s2/favicons?domain=${domain}&sz=64`}
        alt={company.name} width={36} height={36}
        className="object-contain rounded"
        onError={() => setErr(true)} unoptimized
      />
    );
  }
  return (
    <span className="text-sm font-bold text-muted-foreground">
      {company.name.slice(0, 2).toUpperCase()}
    </span>
  );
}

function fmtVal(cents: number) {
  if (!cents) return null;
  const v = cents / 100; // DB stores cents
  if (v >= 1_000_000) return "$" + (v / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (v >= 1_000)     return "$" + Math.round(v / 1_000) + "K";
  return "$" + Math.round(v).toLocaleString();
}

export function CompanyCard({
  company, onEditCompany,
  onAddOpportunity, onEditOpportunity, onStageChange,
}: CompanyCardProps) {
  const [expanded, setExpanded]       = useState(true);
  const [showAllActive, setShowAllActive] = useState(false);
  const [showClosed, setShowClosed]   = useState(false);

  const opps = company.opportunities ?? [];

  const activeOpps = opps
    .filter((o) => o.stage !== "Closed Won" && o.stage !== "Closed Lost")
    .sort((a, b) => (STAGE_ORDER.indexOf(a.stage) ?? 9) - (STAGE_ORDER.indexOf(b.stage) ?? 9));

  const wonOpps  = opps.filter((o) => o.stage === "Closed Won");
  const lostOpps = opps.filter((o) => o.stage === "Closed Lost");

  const topStage = STAGE_ORDER.find((s) => opps.some((o) => o.stage === s)) ?? null;
  const accentDot = topStage ? (STAGE_COLORS[topStage]?.dot ?? "bg-muted-foreground") : null;

  const pipelineValue = activeOpps.reduce((s, o) => s + (o.value ?? 0), 0);
  const wonValue      = wonOpps.reduce((s, o) => s + (o.value ?? 0), 0);
  const totalClosed   = wonOpps.length + lostOpps.length;
  const winRate       = totalClosed > 0 ? Math.round((wonOpps.length / totalClosed) * 100) : null;

  const visibleActive    = showAllActive ? activeOpps : activeOpps.slice(0, ACTIVE_LIMIT);
  const hiddenActiveCount = activeOpps.length - ACTIVE_LIMIT;

  return (
    <div className="rounded-xl border bg-card shadow-sm hover:shadow-md transition-shadow flex flex-col">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-3 group">
        <div
          className="w-10 h-10 rounded-xl bg-muted/50 border flex items-center justify-center overflow-hidden shrink-0 cursor-pointer"
          onClick={() => setExpanded((e) => !e)}
        >
          <CompanyLogo company={company} />
        </div>

        <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setExpanded((e) => !e)}>
          <div className="font-semibold text-sm leading-tight truncate">{company.name}</div>
          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
            {accentDot && <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", accentDot)} />}
            {activeOpps.length > 0 ? (
              <>
                <span className="text-xs text-muted-foreground">{activeOpps.length} active</span>
                {pipelineValue > 0 && (
                  <span className="text-xs font-semibold">{fmtVal(pipelineValue)}</span>
                )}
              </>
            ) : wonOpps.length > 0 ? (
              <span className="text-xs text-emerald-600 font-medium">{fmtVal(wonValue) ?? ""} won</span>
            ) : (
              <span className="text-xs text-muted-foreground">No opportunities</span>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={() => onEditCompany(company)}
          className="opacity-0 group-hover:opacity-100 transition-opacity text-xs text-muted-foreground hover:text-foreground px-1.5 py-1 rounded hover:bg-muted shrink-0"
        >
          Edit
        </button>

        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="text-muted-foreground hover:text-foreground shrink-0 transition-transform"
          style={{ transform: expanded ? "rotate(180deg)" : "rotate(0deg)" }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
      </div>

      {/* ── Body ───────────────────────────────────────────────────── */}
      {expanded && (
        <div className="border-t flex-1 flex flex-col">

          {opps.length === 0 && (
            <div className="px-4 py-4 text-xs text-muted-foreground text-center flex-1 flex items-center justify-center">
              No opportunities yet
            </div>
          )}

          {/* Active opps */}
          {activeOpps.length > 0 && (
            <ul className="divide-y">
              {visibleActive.map((opp) => (
                <OppRow
                  key={opp.id}
                  opp={opp}
                  onEdit={() => onEditOpportunity(opp)}
                  onStageChange={onStageChange}
                />
              ))}
            </ul>
          )}

          {/* Show more / less toggle for active */}
          {hiddenActiveCount > 0 && !showAllActive && (
            <button
              type="button"
              onClick={() => setShowAllActive(true)}
              className="w-full text-xs text-primary hover:text-primary/80 font-medium py-2 border-t text-center hover:bg-muted/20 transition-colors"
            >
              + {hiddenActiveCount} more active opp{hiddenActiveCount !== 1 ? "s" : ""}
            </button>
          )}
          {showAllActive && activeOpps.length > ACTIVE_LIMIT && (
            <button
              type="button"
              onClick={() => setShowAllActive(false)}
              className="w-full text-xs text-muted-foreground hover:text-foreground py-2 border-t text-center hover:bg-muted/20 transition-colors"
            >
              Show fewer
            </button>
          )}

          {/* Won / Lost buried section */}
          {(wonOpps.length > 0 || lostOpps.length > 0) && (
            <>
              <button
                type="button"
                onClick={() => setShowClosed((o) => !o)}
                className="flex items-center justify-between px-4 py-2 text-xs text-muted-foreground hover:text-foreground border-t hover:bg-muted/20 transition-colors"
              >
                <span className="flex items-center gap-2">
                  {wonOpps.length > 0 && (
                    <span className="text-emerald-600 font-medium">
                      {wonOpps.length} won{wonValue > 0 ? ` · ${fmtVal(wonValue)}` : ""}
                    </span>
                  )}
                  {lostOpps.length > 0 && (
                    <span className="text-red-500">{lostOpps.length} lost</span>
                  )}
                  {winRate !== null && (
                    <span className="text-muted-foreground">{winRate}% win rate</span>
                  )}
                </span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                  className="shrink-0 transition-transform" style={{ transform: showClosed ? "rotate(180deg)" : "rotate(0deg)" }}>
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>

              {showClosed && (
                <div className="border-t bg-muted/10">
                  {wonOpps.length > 0 && (
                    <>
                      <div className="px-4 pt-2 pb-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Won</div>
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
                      <div className="px-4 pt-2 pb-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Lost</div>
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

          {/* Footer */}
          <div className="px-4 py-2.5 border-t mt-auto">
            <button
              type="button"
              onClick={() => onAddOpportunity(company.id)}
              className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 font-medium"
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" x2="12" y1="5" y2="19" /><line x1="5" x2="19" y1="12" y2="12" />
              </svg>
              Add Opportunity
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Shared opp row ────────────────────────────────────────────────────────────
function OppRow({ opp, onEdit, onStageChange, muted }: {
  opp: SalesOpportunity;
  onEdit: () => void;
  onStageChange: (id: string, stage: OppStage) => void;
  muted?: boolean;
}) {
  const colors = STAGE_COLORS[opp.stage];
  return (
    <li className={cn("group/opp px-4 py-2.5 hover:bg-muted/20", muted && "opacity-60")}>
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <div className="text-xs font-medium leading-snug truncate">{opp.name}</div>
          {opp.ownerName && (
            <div className="text-xs text-muted-foreground truncate mt-0.5">{opp.ownerName}</div>
          )}
        </div>
        <button
          type="button"
          onClick={onEdit}
          className="opacity-0 group-hover/opp:opacity-100 transition-opacity text-xs text-muted-foreground hover:text-foreground px-1 py-0.5 rounded hover:bg-muted shrink-0 mt-0.5"
        >
          Edit
        </button>
      </div>
      <div className="mt-1.5">
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
