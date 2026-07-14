"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useSalesActivity } from "@/modules/sales-activity/hooks/useSalesActivity";
import { useDealDeskUser } from "@/modules/deal-desk/hooks/useDealDeskUser";
import { CompanyCard } from "@/modules/sales-activity/components/CompanyCard";
import { CompanyDetailModal } from "@/modules/sales-activity/components/CompanyDetailModal";
import { CompanyForm } from "@/modules/sales-activity/components/CompanyForm";
import { OpportunityForm } from "@/modules/sales-activity/components/OpportunityForm";
import { ActivityLogForm } from "@/modules/sales-activity/components/ActivityLogForm";
import { TranscriptModal } from "@/modules/sales-activity/components/TranscriptModal";
import { CWImportModal } from "@/modules/sales-activity/components/CWImportModal";
import { ActivityFeed, ActivitySummaryCards } from "@/modules/sales-activity/components/ActivityFeed";
import { SalesPulseReport } from "@/modules/sales-activity/components/SalesPulseReport";
import { formatWeekLabel } from "@/types/sales";
import type { SalesCompany, SalesOpportunity, SalesActivity } from "@/types/sales";
import type { CWImportPayload, ImportProgressCallback } from "@/modules/sales-activity/components/CWImportModal";
type Modal =
  | { type: "company"; data?: SalesCompany }
  | { type: "opportunity"; companyId: string; data?: SalesOpportunity }
  | { type: "transcript" }
  | { type: "cwimport" }
  | { type: "editActivity"; activity: SalesActivity }
  | null;

export default function SalesActivityPage() {
  const { userName, isManagement } = useDealDeskUser();
  const scopeToUser = isManagement ? undefined : userName;
  const {
    companies, activities, allActivities, summary, isLoading,
    weekStart, setWeekStart,
    saveCompany, removeCompany,
    saveOpportunity, removeOpportunity, changeOppStage,
    logActivity, editActivity, removeActivity,
  } = useSalesActivity({ scopeToUser });

  const [modal, setModal] = useState<Modal>(null);
  const [stageFilter, setStageFilter] = useState("All");
  const [repFilter, setRepFilter] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "pipeline" | "active" | "winrate">("name");
  const [tab, setTab] = useState<"board" | "activity" | "pulse">("board");
  const [detailCompany, setDetailCompany] = useState<SalesCompany | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [logoFetch, setLogoFetch] = useState<{ done: number; total: number } | null>(null);
  const importRef = useRef<HTMLDivElement>(null);

  function prevWeek() {
    const d = new Date(weekStart);
    d.setDate(d.getDate() - 7);
    setWeekStart(d.toISOString().slice(0, 10));
  }
  function nextWeek() {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + 7);
    setWeekStart(d.toISOString().slice(0, 10));
  }

  const stages = ["All", "Prospecting", "Qualifying", "Proposal", "Negotiation", "Closed Won", "Closed Lost"];
  const ACTIVE_STAGES = new Set(["Prospecting", "Qualifying", "Proposal", "Negotiation"]);

  // Non-admins are locked to their own name; admins use the dropdown selection
  const effectiveRepFilter = isManagement ? repFilter : userName;

  // Unique rep names that own at least one opp, sorted alphabetically (admin only)
  const boardReps = Array.from(
    new Set(
      companies.flatMap((c) => (c.opportunities ?? []).map((o) => o.ownerName).filter(Boolean))
    )
  ).sort() as string[];

  // Always exclude companies with no opportunities. Apply stage + rep filters, then sort.
  const filteredCompanies = (() => {
    const withOpps = companies.filter((c) => (c.opportunities ?? []).length > 0);
    const staged = stageFilter === "All"
      ? withOpps
      : withOpps.filter((c) => (c.opportunities ?? []).some((o) => o.stage === stageFilter));
    const repped = effectiveRepFilter
      ? staged.filter((c) => (c.opportunities ?? []).some((o) => o.ownerName === effectiveRepFilter))
      : staged;
    return repped.slice().sort((a, b) => {
      switch (sortBy) {
        case "pipeline": {
          const aVal = (a.opportunities ?? []).filter((o) => ACTIVE_STAGES.has(o.stage)).reduce((s, o) => s + (o.value ?? 0), 0);
          const bVal = (b.opportunities ?? []).filter((o) => ACTIVE_STAGES.has(o.stage)).reduce((s, o) => s + (o.value ?? 0), 0);
          return bVal - aVal || a.name.localeCompare(b.name);
        }
        case "active": {
          const aC = (a.opportunities ?? []).filter((o) => ACTIVE_STAGES.has(o.stage)).length;
          const bC = (b.opportunities ?? []).filter((o) => ACTIVE_STAGES.has(o.stage)).length;
          return bC - aC || a.name.localeCompare(b.name);
        }
        case "winrate": {
          const aW = (a.opportunities ?? []).filter((o) => o.stage === "Closed Won").length;
          const aL = (a.opportunities ?? []).filter((o) => o.stage === "Closed Lost").length;
          const bW = (b.opportunities ?? []).filter((o) => o.stage === "Closed Won").length;
          const bL = (b.opportunities ?? []).filter((o) => o.stage === "Closed Lost").length;
          const aRate = (aW + aL) > 0 ? aW / (aW + aL) : -1;
          const bRate = (bW + bL) > 0 ? bW / (bW + bL) : -1;
          return bRate - aRate || a.name.localeCompare(b.name);
        }
        default: // "name"
          return a.name.localeCompare(b.name);
      }
    });
  })();

  async function fetchMissingLogos() {
    const missing = companies.filter((c) => !c.domain?.trim());
    if (missing.length === 0) return;
    setLogoFetch({ done: 0, total: missing.length });
    let done = 0;
    for (const company of missing) {
      try {
        const res = await fetch(
          `/api/sales/logo-suggest?query=${encodeURIComponent(company.name)}`
        );
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data[0]?.domain) {
            await saveCompany({ id: company.id, name: company.name, domain: data[0].domain, notes: company.notes ?? "", dealDeskId: company.dealDeskId ?? null });
          }
        }
      } catch { /* ignore individual failures */ }
      done++;
      setLogoFetch({ done, total: missing.length });
    }
    setLogoFetch(null);
  }

  async function handleCWImport({ companyMappings, selectedOpps }: CWImportPayload, onProgress: ImportProgressCallback) {
    const total = selectedOpps.length;

    // Phase 1: ensure all companies exist (label shows company name)
    const companyIdMap = new Map<string, string>();
    for (const mapping of companyMappings) {
      if (mapping.matchedId) {
        companyIdMap.set(mapping.csvName, mapping.matchedId);
      } else {
        onProgress(0, total, `Creating company: ${mapping.csvName}`);
        const created = await saveCompany({ name: mapping.csvName, domain: "", notes: "", dealDeskId: null });
        companyIdMap.set(mapping.csvName, (created as SalesCompany).id);
      }
    }

    // Phase 2: upsert each opp with live progress
    let done = 0;
    for (const o of selectedOpps) {
      onProgress(done, total, `${o.existingId ? "Updating" : "Saving"}: ${o.name}`);
      const companyId = companyIdMap.get(o.resolvedCsvName);
      if (!companyId) { done++; continue; }
      await saveOpportunity({
        id: o.existingId,
        companyId,
        name: o.name,
        stage: o.stage,
        ownerId: o.resolvedOwnerId,
        ownerName: o.resolvedOwnerName,
        value: Math.round(o.value * 100),
        notes: "",
        closeDate: o.closeDate ?? null,
        cwNumber: o.cwNumber || null,
        proposalCreatedAt: o.proposalCreatedAt ?? null,
        rating: o.rating ?? null,
      });
      done++;
      onProgress(done, total, `${o.existingId ? "Updated" : "Saved"}: ${o.name}`);
    }
  }

  return (
    <div className="mx-auto max-w-7xl p-8 space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/sales" className="hover:text-foreground">Sales</Link>
        <span>/</span>
        <span className="text-foreground font-medium">Activity</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Sales Activity</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Track prospects and log weekly sales activities</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {/* Fetch logos — management only */}
          {isManagement && (
            <button
              onClick={fetchMissingLogos}
              disabled={!!logoFetch || isLoading}
              title="Fetch logos for companies missing a domain"
              className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
              </svg>
              {logoFetch ? `Logos ${logoFetch.done}/${logoFetch.total}…` : "Fetch Logos"}
            </button>
          )}

          {/* Import split button */}
          <div className="relative" ref={importRef}>
            <div className="flex rounded-md border overflow-hidden">
              <button
                onClick={() => setImportOpen((o) => !o)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium hover:bg-muted transition-colors"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
                Upload Data
              </button>
              <div className="w-px bg-border" />
              <button
                onClick={() => setImportOpen((o) => !o)}
                className="px-2 py-1.5 hover:bg-muted transition-colors text-muted-foreground"
                aria-label="More import options"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>
            </div>
            {importOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setImportOpen(false)} />
                <div className="absolute right-0 top-full mt-1 z-50 w-52 rounded-lg border bg-card shadow-lg py-1">
                  <button
                    type="button"
                    onClick={() => { setImportOpen(false); setModal({ type: "transcript" }); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-muted text-left"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    </svg>
                    <div>
                      <div className="font-medium">Transcript (AI)</div>
                      <div className="text-xs text-muted-foreground">Paste or upload call notes</div>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => { setImportOpen(false); setModal({ type: "cwimport" }); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-muted text-left"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
                    </svg>
                    <div>
                      <div className="font-medium">ConnectWise Data</div>
                      <div className="text-xs text-muted-foreground">Import opportunity CSV</div>
                    </div>
                  </button>
                </div>
              </>
            )}
          </div>

          <button
            onClick={() => setModal({ type: "company" })}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            + Add Company
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg border bg-muted/30 p-1 w-fit">
        {(["board", "activity", "pulse"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`inline-flex items-center gap-1.5 rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${tab === t ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            {t === "board" && (
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/>
              </svg>
            )}
            {t === "activity" && (
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="13" y2="17"/>
              </svg>
            )}
            {t === "pulse" && (
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
              </svg>
            )}
            {t === "board" ? "Opportunity Board" : t === "activity" ? "Activity Log" : "Sales Pulse"}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="py-16 text-center text-sm text-muted-foreground">Loading…</div>
      ) : (
        <>
          {tab === "board" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                {/* Filters — stage pills + rep */}
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex gap-1 flex-wrap">
                    {stages.map((s) => {
                      const count = s === "All"
                        ? companies.reduce((n, c) => n + (c.opportunities ?? []).filter((o) => !effectiveRepFilter || o.ownerName === effectiveRepFilter).length, 0)
                        : companies.reduce((n, c) => n + (c.opportunities ?? []).filter((o) => o.stage === s && (!effectiveRepFilter || o.ownerName === effectiveRepFilter)).length, 0);
                      return (
                        <button
                          key={s}
                          onClick={() => setStageFilter(s)}
                          className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${stageFilter === s ? "bg-primary text-primary-foreground" : "border hover:bg-muted"}`}
                        >
                          {s} {count > 0 && `(${count})`}
                        </button>
                      );
                    })}
                  </div>

                  {isManagement && boardReps.length > 0 && (
                    <select
                      value={repFilter}
                      onChange={(e) => setRepFilter(e.target.value)}
                      className="rounded-lg border bg-background px-3 py-1 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-ring h-[30px]"
                    >
                      <option value="">All reps</option>
                      {boardReps.map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                  )}
                </div>

                {/* Sort — visually separated */}
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground shrink-0">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="14" y2="12"/><line x1="3" y1="18" x2="8" y2="18"/>
                  </svg>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                    className="rounded-lg border bg-background px-2 py-1 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-ring h-[30px] cursor-pointer"
                  >
                    <option value="name">Name</option>
                    <option value="pipeline">Pipeline value</option>
                    <option value="active">Active opps</option>
                    <option value="winrate">Win rate</option>
                  </select>
                </div>
              </div>

              {filteredCompanies.length === 0 ? (
                <div className="rounded-xl border bg-card p-12 text-center">
                  <p className="text-sm text-muted-foreground">No companies yet. Click &quot;+ Add Company&quot; to get started.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                  {filteredCompanies.map((company) => (
                    <CompanyCard
                      key={company.id}
                      company={company}
                      stageFilter={stageFilter}
                      repFilter={effectiveRepFilter}
                      onClick={() => setDetailCompany(company)}
                      onEditCompany={(c) => setModal({ type: "company", data: c })}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === "activity" && (
            <ActivityTab
              weekStart={weekStart}
              onPrev={prevWeek}
              onNext={nextWeek}
              summary={summary}
              isManagement={isManagement}
              companies={companies}
              userName={userName}
              activities={activities}
              allActivities={allActivities}
              logActivity={logActivity}
              removeActivity={removeActivity}
              onEditActivity={(a) => setModal({ type: "editActivity", activity: a })}
            />
          )}

          {tab === "pulse" && (
            <SalesPulseReport
              companies={companies}
              activities={allActivities}
              isManagement={isManagement}
            />
          )}
        </>
      )}

      {/* Company detail panel */}
      {detailCompany && (() => {
        // Always use the freshest copy from companies so stage changes reflect immediately
        const live = companies.find((c) => c.id === detailCompany.id) ?? detailCompany;
        return (
          <CompanyDetailModal
            company={live}
            stageFilter={stageFilter}
            repFilter={effectiveRepFilter}
            onClose={() => setDetailCompany(null)}
            onEditCompany={(c) => setModal({ type: "company", data: c })}
            onDeleteCompany={async (id) => { await removeCompany(id); setDetailCompany(null); }}
            onAddOpportunity={(cId) => setModal({ type: "opportunity", companyId: cId })}
            onEditOpportunity={(o) => setModal({ type: "opportunity", companyId: o.companyId, data: o })}
            onDeleteOpportunity={removeOpportunity}
            onStageChange={changeOppStage}
          />
        );
      })()}

      {/* Modals */}
      {modal?.type === "company" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl border bg-card shadow-xl p-6">
            <h2 className="text-base font-semibold mb-4">{modal.data ? "Edit Company" : "Add Company"}</h2>
            <CompanyForm
              initial={modal.data}
              onSave={async (d) => { await saveCompany(d); setModal(null); }}
              onDelete={modal.data?.id ? async () => { await removeCompany(modal.data!.id!); setModal(null); } : undefined}
              onCancel={() => setModal(null)}
            />
          </div>
        </div>
      )}

      {modal?.type === "opportunity" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl border bg-card shadow-xl p-6">
            <h2 className="text-base font-semibold mb-4">{modal.data ? "Edit Opportunity" : "Add Opportunity"}</h2>
            <OpportunityForm
              companyId={modal.companyId}
              companies={companies}
              initial={modal.data}
              onSave={async (d) => { await saveOpportunity(d); setModal(null); }}
              onDelete={modal.data?.id ? async () => { await removeOpportunity(modal.data!.id!); setModal(null); } : undefined}
              onCancel={() => setModal(null)}
            />
          </div>
        </div>
      )}

      {modal?.type === "editActivity" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl rounded-xl border bg-card shadow-xl p-6">
            <h2 className="text-base font-semibold mb-4">Edit Activity</h2>
            <ActivityLogForm
              companies={companies}
              currentUser={userName}
              isManagement={isManagement}
              editing={modal.activity}
              onSubmit={async (data) => {
                await editActivity(modal.activity.id, data);
                setModal(null);
              }}
              onCancel={() => setModal(null)}
            />
          </div>
        </div>
      )}

      {modal?.type === "transcript" && (
        <TranscriptModal
          companies={companies}
          currentUser={userName}
          isManagement={isManagement}
          onSave={logActivity}
          onCreateCompany={async (name, domain) => {
            const company = await saveCompany({ name, domain: domain ?? "", notes: "", dealDeskId: null });
            return company as SalesCompany;
          }}
          onCreateOpportunity={async (companyId, name, stage) => {
            const opp = await saveOpportunity({ companyId, name, stage: stage ?? "Prospecting", ownerId: null, ownerName: "", value: 0, notes: "", closeDate: null, cwNumber: null, proposalCreatedAt: null, rating: null });
            return opp as { id: string; name: string };
          }}
          onClose={() => setModal(null)}
        />
      )}

      {modal?.type === "cwimport" && (
        <CWImportModal
          companies={companies}
          onImport={handleCWImport}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}

// ── Activity tab sub-component ────────────────────────────────────────────────
type SummaryState = { totalActivities: number; byType: Record<string, number>; byPerson: Record<string, number> } | null;
type ActivityViewMode = "week" | "month" | "quarter" | "all";

const VIEW_MODE_LABELS: Record<ActivityViewMode, string> = {
  week: "Week",
  month: "Month",
  quarter: "Quarter",
  all: "All time",
};

function getViewModeStart(mode: ActivityViewMode): Date | null {
  if (mode === "week" || mode === "all") return null;
  const now = new Date();
  const days = mode === "month" ? 30 : 90;
  now.setDate(now.getDate() - days);
  now.setHours(0, 0, 0, 0);
  return now;
}

function ActivityTab({
  weekStart, onPrev, onNext, summary, isManagement, companies, userName,
  activities, allActivities, logActivity, removeActivity, onEditActivity,
}: {
  weekStart: string; onPrev: () => void; onNext: () => void;
  summary: SummaryState; isManagement: boolean;
  companies: SalesCompany[]; userName: string;
  activities: SalesActivity[]; allActivities: SalesActivity[];
  logActivity: (data: Omit<SalesActivity, "id" | "createdAt" | "company" | "opportunity">) => Promise<unknown>;
  removeActivity?: (id: string) => void;
  onEditActivity: (a: SalesActivity) => void;
}) {
  const [formOpen, setFormOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ActivityViewMode>("week");
  const [repFilter, setRepFilter] = useState("");

  const baseActivities = viewMode === "week"
    ? activities
    : viewMode === "all"
      ? allActivities
      : (() => {
          const cutoff = getViewModeStart(viewMode)!;
          return allActivities.filter((a) => new Date(a.weekStart) >= cutoff);
        })();

  const displayedActivities = repFilter
    ? baseActivities.filter((a) => a.userName === repFilter)
    : baseActivities;

  // Unique rep names from the base (pre-rep-filter) set for the dropdown
  const repNames = Array.from(new Set(baseActivities.map((a) => a.userName).filter(Boolean))).sort() as string[];

  // Recompute summary from the displayed set so counts match the active view mode + rep filter
  const displayedSummary: SummaryState = displayedActivities.length === 0 ? null : (() => {
    const byType: Record<string, number> = {};
    const byPerson: Record<string, number> = {};
    for (const a of displayedActivities) {
      byType[a.type] = (byType[a.type] ?? 0) + 1;
      if (a.userName) byPerson[a.userName] = (byPerson[a.userName] ?? 0) + 1;
    }
    return { totalActivities: displayedActivities.length, byType, byPerson };
  })();

  return (
    <div className="space-y-3">
      {/* Controls row */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          {/* View mode toggle */}
          <div className="flex rounded-lg border bg-muted/30 p-0.5 gap-0.5">
            {(["week", "month", "quarter", "all"] as ActivityViewMode[]).map((m) => (
              <button
                key={m}
                onClick={() => setViewMode(m)}
                className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                  viewMode === m ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {VIEW_MODE_LABELS[m]}
              </button>
            ))}
          </div>
          {/* Week nav — only in week mode */}
          {viewMode === "week" && (
            <>
              <button onClick={onPrev} className="rounded-md border px-2.5 py-1 text-sm hover:bg-muted">←</button>
              <span className="text-sm font-medium">{formatWeekLabel(weekStart)}</span>
              <button onClick={onNext} className="rounded-md border px-2.5 py-1 text-sm hover:bg-muted">→</button>
            </>
          )}
          {/* Rep filter — management only */}
          {isManagement && repNames.length > 0 && (
            <select
              value={repFilter}
              onChange={(e) => setRepFilter(e.target.value)}
              className="rounded-lg border bg-background px-3 py-1 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-ring h-[30px]"
            >
              <option value="">All reps</option>
              {repNames.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          )}
        </div>
        <button
          onClick={() => setFormOpen((o) => !o)}
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            {formOpen
              ? <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>
              : <><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></>}
          </svg>
          {formOpen ? "Cancel" : "Log Activity"}
        </button>
      </div>

      <ActivitySummaryCards summary={displayedSummary} isManagement={isManagement} />

      {formOpen && (
        <div className="rounded-xl border bg-card p-5">
          <ActivityLogForm
            companies={companies}
            currentUser={userName}
            isManagement={isManagement}
            defaultWeekStart={viewMode === "week" ? weekStart : undefined}
            onSubmit={async (data) => { await logActivity(data); setFormOpen(false); }}
            onCancel={() => setFormOpen(false)}
          />
        </div>
      )}

      <ActivityFeed
        activities={displayedActivities}
        isManagement={isManagement}
        onEdit={onEditActivity}
        onDelete={isManagement ? removeActivity : undefined}
      />
    </div>
  );
}
