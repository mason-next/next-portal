"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import type { SalesActivity, SalesCompany, SalesContact } from "@/types/sales";

const TYPE_ICONS: Record<string, string> = {
  Call: "📞", Email: "✉️", Meeting: "🗓", Research: "🔍",
  Demo: "💻", Proposal: "📄", Other: "📝",
};

const STAGE_COLORS: Record<string, string> = {
  Prospecting: "bg-slate-100 text-slate-700",
  Qualifying: "bg-blue-100 text-blue-700",
  Proposal: "bg-violet-100 text-violet-700",
  Negotiation: "bg-amber-100 text-amber-700",
  "Closed Won": "bg-emerald-100 text-emerald-700",
  "Closed Lost": "bg-red-100 text-red-700",
};

function CompanyLogo({ domain, name, size = 32 }: { domain: string; name: string; size?: number }) {
  const [err, setErr] = useState(false);
  if (!domain || err) {
    return (
      <div
        className="rounded-lg bg-muted/60 border flex items-center justify-center shrink-0 font-bold text-muted-foreground"
        style={{ width: size, height: size, fontSize: size * 0.35 }}
      >
        {name.slice(0, 2).toUpperCase()}
      </div>
    );
  }
  return (
    <Image
      src={`https://www.google.com/s2/favicons?domain=${domain.toLowerCase().trim()}&sz=64`}
      alt={name}
      width={size}
      height={size}
      className="rounded-lg object-contain shrink-0"
      onError={() => setErr(true)}
      unoptimized
    />
  );
}

interface ActivityReportProps {
  companies: SalesCompany[];
  activities: SalesActivity[];
  isManagement?: boolean;
}

interface CompanyBlock {
  company: SalesCompany;
  activities: SalesActivity[];
  contacts: SalesContact[];
  openOpps: SalesCompany["opportunities"];
}

export function ActivityReport({ companies, activities, isManagement }: ActivityReportProps) {
  // Track collapsed IDs — everything is open by default
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());

  const blocks = useMemo((): CompanyBlock[] => {
    const map = new Map<string, CompanyBlock>();

    for (const a of activities) {
      // Resolve company: prefer direct link, fall back to opp's company
      const co = a.company ?? a.opportunity?.company ?? null;
      const cId = co?.id ?? a.companyId ?? null;
      if (!cId) continue;

      if (!map.has(cId)) {
        const company = companies.find((c) => c.id === cId);
        if (!company) continue;
        map.set(cId, {
          company,
          activities: [],
          contacts: [],
          openOpps: (company.opportunities ?? []).filter(
            (o) => o.stage !== "Closed Won" && o.stage !== "Closed Lost"
          ),
        });
      }
      const block = map.get(cId)!;
      block.activities.push(a);

      for (const c of a.contacts) {
        if (!block.contacts.some((x) => x.name.toLowerCase() === c.name.toLowerCase())) {
          block.contacts.push(c);
        }
      }
    }

    return Array.from(map.values()).sort((a, b) => b.activities.length - a.activities.length);
  }, [companies, activities]);

  const unlinked = activities.filter((a) => !a.company && !a.opportunity && !a.companyId);

  function toggleExpand(id: string) {
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  if (blocks.length === 0 && unlinked.length === 0) {
    return (
      <div className="rounded-xl border bg-card p-12 text-center">
        <p className="text-sm text-muted-foreground">No activities logged yet. Log calls, meetings, and emails in the Activity Log tab.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Company blocks */}
      {blocks.map(({ company, activities: acts, contacts, openOpps }) => {
        const isOpen = !collapsedIds.has(company.id);
        return (
          <div key={company.id} className="rounded-xl border bg-card overflow-hidden">
            {/* Company header */}
            <button
              type="button"
              onClick={() => toggleExpand(company.id)}
              className="w-full flex items-center gap-4 px-5 py-4 hover:bg-muted/20 transition-colors text-left"
            >
              <CompanyLogo domain={company.domain} name={company.name} size={36} />
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm">{company.name}</div>
                <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-3">
                  <span>{acts.length} activit{acts.length !== 1 ? "ies" : "y"}</span>
                  {contacts.length > 0 && <span>{contacts.length} contact{contacts.length !== 1 ? "s" : ""}</span>}
                  {(openOpps?.length ?? 0) > 0 && <span>{openOpps!.length} open opp{openOpps!.length !== 1 ? "s" : ""}</span>}
                </div>
              </div>
              <svg
                width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                className="text-muted-foreground shrink-0 transition-transform"
                style={{ transform: isOpen ? "rotate(180deg)" : "rotate(0deg)" }}
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>

            {isOpen && (
              <div className="border-t divide-y">
                {/* Contacts */}
                {contacts.length > 0 && (
                  <div className="px-5 py-3.5">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Contacts</p>
                    <div className="flex flex-wrap gap-2">
                      {contacts.map((c, i) => (
                        <span key={i} className="inline-flex items-center gap-1.5 rounded-full border bg-muted/40 px-3 py-1 text-xs">
                          <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold shrink-0">
                            {c.name[0].toUpperCase()}
                          </span>
                          <span className="font-medium">{c.name}</span>
                          {c.title && <span className="text-muted-foreground">· {c.title}</span>}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Open Opportunities */}
                {(openOpps?.length ?? 0) > 0 && (
                  <div className="px-5 py-3.5">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Open Opportunities</p>
                    <div className="flex flex-wrap gap-2">
                      {openOpps!.map((o) => (
                        <span key={o.id} className="inline-flex items-center gap-2 rounded-lg border bg-card px-3 py-1.5 text-xs">
                          <span className="font-medium">{o.name}</span>
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${STAGE_COLORS[o.stage] ?? "bg-muted text-muted-foreground"}`}>
                            {o.stage}
                          </span>
                          {o.ownerName && <span className="text-muted-foreground">{o.ownerName}</span>}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Activity list */}
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-5 py-3">Activity</p>
                  <ul className="divide-y">
                    {acts.map((a) => (
                      <li key={a.id} className="flex items-start gap-3 px-5 py-3 hover:bg-muted/20">
                        <span className="text-base shrink-0 mt-0.5">{TYPE_ICONS[a.type] ?? "📝"}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-medium">{a.type}</span>
                            {a.opportunity && (
                              <span className="text-xs text-muted-foreground">· {a.opportunity.name}</span>
                            )}
                            {isManagement && <span className="text-xs text-muted-foreground">· {a.userName}</span>}
                            {a.aiGenerated && (
                              <span className="text-xs rounded-full bg-violet-100 text-violet-700 px-1.5 py-0.5 font-medium">AI</span>
                            )}
                            <span className="text-xs text-muted-foreground ml-auto">
                              {new Date(a.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                            </span>
                          </div>
                          {a.description && (
                            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{a.description}</p>
                          )}
                          {a.contacts.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {a.contacts.map((c, i) => (
                                <span key={i} className="text-xs text-muted-foreground">
                                  {c.name}{c.title ? ` (${c.title})` : ""}{i < a.contacts.length - 1 ? "," : ""}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* Unlinked activities */}
      {unlinked.length > 0 && (
        <div className="rounded-xl border bg-card overflow-hidden">
          <button
            type="button"
            onClick={() => toggleExpand("__unlinked__")}
            className="w-full flex items-center gap-4 px-5 py-4 hover:bg-muted/20 text-left"
          >
            <div className="w-9 h-9 rounded-lg bg-muted/60 border flex items-center justify-center shrink-0 text-muted-foreground">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/>
              </svg>
            </div>
            <div className="flex-1">
              <div className="font-semibold text-sm">Unlinked Activities</div>
              <div className="text-xs text-muted-foreground mt-0.5">{unlinked.length} activit{unlinked.length !== 1 ? "ies" : "y"} not tied to a company</div>
            </div>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
              className="text-muted-foreground shrink-0 transition-transform"
              style={{ transform: !collapsedIds.has("__unlinked__") ? "rotate(180deg)" : "rotate(0deg)" }}
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
          {!collapsedIds.has("__unlinked__") && (
            <ul className="border-t divide-y">
              {unlinked.map((a) => (
                <li key={a.id} className="flex items-start gap-3 px-5 py-3 hover:bg-muted/20">
                  <span className="text-base shrink-0">{TYPE_ICONS[a.type] ?? "📝"}</span>
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-medium">{a.type}</span>
                    {a.description && <p className="text-xs text-muted-foreground mt-0.5">{a.description}</p>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
