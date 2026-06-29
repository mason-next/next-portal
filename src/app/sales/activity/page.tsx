"use client";

import { useState } from "react";
import Link from "next/link";
import { useSalesActivity } from "@/modules/sales-activity/hooks/useSalesActivity";
import { useDealDeskUser } from "@/modules/deal-desk/hooks/useDealDeskUser";
import { LogoCard } from "@/modules/sales-activity/components/LogoCard";
import { LogoForm } from "@/modules/sales-activity/components/LogoForm";
import { ActivityLogForm } from "@/modules/sales-activity/components/ActivityLogForm";
import { ActivityFeed, ActivitySummaryCards } from "@/modules/sales-activity/components/ActivityFeed";
import { formatWeekLabel } from "@/types/sales";
import type { SalesLogo } from "@/types/sales";

export default function SalesActivityPage() {
  const { userName, isManagement, actuallyManagement, previewAsSalesperson, togglePreview } = useDealDeskUser();
  const { logos, activities, summary, isLoading, weekStart, setWeekStart, saveLogo, removeLogo, logActivity, removeActivity } = useSalesActivity();

  const [showLogoForm, setShowLogoForm] = useState(false);
  const [editingLogo, setEditingLogo] = useState<SalesLogo | null>(null);
  const [stageFilter, setStageFilter] = useState("All");
  const [tab, setTab] = useState<"board" | "activity">("board");

  const filteredLogos = stageFilter === "All" ? logos : logos.filter((l) => l.stage === stageFilter);

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
        <div className="flex items-center gap-3">
          {/* Management-only: preview toggle */}
          {actuallyManagement && (
            <button
              onClick={togglePreview}
              className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
                previewAsSalesperson
                  ? "bg-amber-50 border-amber-300 text-amber-700 dark:bg-amber-900/20 dark:border-amber-700 dark:text-amber-400"
                  : "text-muted-foreground hover:bg-muted"
              }`}
              title="Toggle between management overview and salesperson view"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
              </svg>
              {previewAsSalesperson ? "Previewing as Salesperson" : "Management View"}
            </button>
          )}
          <button
            onClick={() => { setEditingLogo(null); setShowLogoForm(true); }}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            + Add Company
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg border bg-muted/30 p-1 w-fit">
        {(["board", "activity"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${tab === t ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            {t === "board" ? "Pipeline Board" : "Activity Log"}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="py-16 text-center text-sm text-muted-foreground">Loading…</div>
      ) : (
        <>
          {showLogoForm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
              <div className="w-full max-w-lg rounded-xl border bg-card shadow-xl p-6">
                <h2 className="text-base font-semibold mb-4">{editingLogo ? "Edit Company" : "Add Company"}</h2>
                <LogoForm
                  initial={editingLogo ?? undefined}
                  onSave={async (l) => { await saveLogo(l); setShowLogoForm(false); setEditingLogo(null); }}
                  onCancel={() => { setShowLogoForm(false); setEditingLogo(null); }}
                />
              </div>
            </div>
          )}

          {tab === "board" && (
            <div className="space-y-4">
              <div className="flex gap-1 flex-wrap">
                {stages.map((s) => (
                  <button
                    key={s}
                    onClick={() => setStageFilter(s)}
                    className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${stageFilter === s ? "bg-primary text-primary-foreground" : "border hover:bg-muted"}`}
                  >
                    {s} {s !== "All" && `(${logos.filter((l) => l.stage === s).length})`}
                  </button>
                ))}
              </div>
              {filteredLogos.length === 0 ? (
                <div className="rounded-xl border bg-card p-12 text-center">
                  <p className="text-sm text-muted-foreground">No companies yet. Click "+ Add Company" to get started.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                  {filteredLogos.map((logo) => (
                    <LogoCard
                      key={logo.id}
                      logo={logo}
                      onEdit={(l) => { setEditingLogo(l); setShowLogoForm(true); }}
                      onDelete={removeLogo}
                      onStageChange={(id, stage) => saveLogo({ id, company: logos.find((l) => l.id === id)?.company ?? "", stage: stage as SalesLogo["stage"] })}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === "activity" && (
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <button onClick={prevWeek} className="rounded-md border px-3 py-1.5 text-sm hover:bg-muted">←</button>
                <span className="text-sm font-medium">{formatWeekLabel(weekStart)}</span>
                <button onClick={nextWeek} className="rounded-md border px-3 py-1.5 text-sm hover:bg-muted">→</button>
              </div>

              <ActivitySummaryCards summary={summary} isManagement={isManagement} />

              <ActivityLogForm
                logos={logos}
                currentUser={userName}
                isManagement={isManagement}
                onSubmit={logActivity}
              />

              <ActivityFeed
                activities={activities}
                isManagement={isManagement}
                onDelete={isManagement ? removeActivity : undefined}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
