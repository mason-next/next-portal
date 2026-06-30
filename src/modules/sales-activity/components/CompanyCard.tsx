"use client";

import Image from "next/image";
import { useState } from "react";
import type { SalesCompany, SalesOpportunity, OppStage } from "@/types/sales";
import { OPP_STAGES } from "@/types/sales";

const STAGE_COLORS: Record<OppStage, string> = {
  Prospecting:  "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  Qualifying:   "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
  Proposal:     "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  Negotiation:  "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  "Closed Won": "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  "Closed Lost":"bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

function formatDollars(cents: number) {
  if (cents === 0) return null;
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(cents / 100);
}

function CompanyLogo({ domain, name }: { domain: string; name: string }) {
  const [err, setErr] = useState(false);
  if (!domain || err) {
    return (
      <div className="w-8 h-8 rounded-md bg-muted border flex items-center justify-center shrink-0">
        <span className="text-xs font-bold text-muted-foreground">{name.slice(0, 2).toUpperCase()}</span>
      </div>
    );
  }
  return (
    <Image
      src={`https://icons.duckduckgo.com/ip3/${domain.toLowerCase().trim()}.ico`}
      alt={name} width={32} height={32}
      className="w-8 h-8 rounded-md object-contain border bg-white shrink-0"
      onError={() => setErr(true)} unoptimized
    />
  );
}

interface CompanyCardProps {
  company: SalesCompany;
  onEditCompany: (c: SalesCompany) => void;
  onDeleteCompany: (id: string) => void;
  onAddOpportunity: (companyId: string) => void;
  onEditOpportunity: (o: SalesOpportunity) => void;
  onDeleteOpportunity: (id: string) => void;
  onStageChange: (id: string, stage: OppStage) => void;
}

export function CompanyCard({
  company, onEditCompany, onDeleteCompany,
  onAddOpportunity, onEditOpportunity, onDeleteOpportunity, onStageChange,
}: CompanyCardProps) {
  const opps = company.opportunities ?? [];
  const totalValue = opps.reduce((sum, o) => sum + o.value, 0);

  return (
    <div className="rounded-xl border bg-card shadow-sm flex flex-col">
      {/* Header */}
      <div className="flex items-start gap-3 p-4 pb-3">
        <CompanyLogo domain={company.domain} name={company.name} />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-sm leading-tight truncate">{company.name}</h3>
            <div className="flex gap-1 shrink-0">
              <button
                onClick={() => onEditCompany(company)}
                className="text-xs text-muted-foreground hover:text-foreground px-1.5 py-0.5 rounded hover:bg-muted transition-colors"
              >
                Edit
              </button>
              <button
                onClick={() => confirm(`Delete ${company.name}?`) && onDeleteCompany(company.id)}
                className="text-xs text-muted-foreground hover:text-destructive px-1.5 py-0.5 rounded hover:bg-muted transition-colors"
              >
                ✕
              </button>
            </div>
          </div>
          {company.domain && (
            <p className="text-xs text-muted-foreground truncate">{company.domain}</p>
          )}
          {totalValue > 0 && (
            <p className="text-xs font-medium text-green-600 dark:text-green-400 mt-0.5">
              {formatDollars(totalValue)} pipeline
            </p>
          )}
        </div>
      </div>

      {/* Notes */}
      {company.notes && (
        <p className="px-4 pb-2 text-xs text-muted-foreground line-clamp-2">{company.notes}</p>
      )}

      {/* Opportunities */}
      {opps.length > 0 && (
        <div className="px-4 pb-3 space-y-1.5 flex-1">
          {opps.map((opp) => (
            <div key={opp.id} className="group flex items-start gap-2 rounded-lg bg-muted/40 px-3 py-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs font-medium truncate">{opp.name}</span>
                  <span className={`rounded-full px-1.5 py-px text-[10px] font-medium ${STAGE_COLORS[opp.stage]}`}>
                    {opp.stage}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  {opp.value > 0 && (
                    <span className="text-[11px] text-muted-foreground">{formatDollars(opp.value)}</span>
                  )}
                  {opp.ownerName && (
                    <span className="text-[11px] text-muted-foreground">{opp.ownerName}</span>
                  )}
                  {opp.closeDate && (
                    <span className="text-[11px] text-muted-foreground">
                      {new Date(opp.closeDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                <select
                  value={opp.stage}
                  onChange={(e) => onStageChange(opp.id, e.target.value as OppStage)}
                  onClick={(e) => e.stopPropagation()}
                  className="text-[10px] rounded border bg-background px-1 py-0.5 focus:outline-none"
                >
                  {OPP_STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                <button
                  onClick={() => onEditOpportunity(opp)}
                  className="text-xs text-muted-foreground hover:text-foreground px-1 py-0.5 rounded hover:bg-muted"
                >
                  Edit
                </button>
                <button
                  onClick={() => confirm(`Delete "${opp.name}"?`) && onDeleteOpportunity(opp.id)}
                  className="text-xs text-muted-foreground hover:text-destructive px-1 py-0.5 rounded hover:bg-muted"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="px-4 pb-4 pt-2">
        <button
          onClick={() => onAddOpportunity(company.id)}
          className="w-full rounded-lg border border-dashed px-3 py-1.5 text-xs font-medium text-muted-foreground hover:border-primary hover:text-primary hover:bg-primary/5 transition-colors"
        >
          + Add Opportunity
        </button>
      </div>
    </div>
  );
}
