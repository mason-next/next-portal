"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ExternalLink, Pencil, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { getOpportunityDetail, upsertNote, upsertTask, setTaskDone, type OpportunityDetail } from "@/lib/data/crm";
import { updateOpportunityStage, upsertSalesOpportunity, deleteSalesOpportunity } from "@/lib/data/sales-activity";
import type { OppStage } from "@/types/sales";
import { OPP_STAGES, isOpenStage, effectiveProbability, weightedValue, effectiveForecastCategory } from "@/types/sales";
import { useCrmAccess } from "@/modules/crm/hooks/useCrmAccess";
import { fmtMoney, fmtDate, daysSince } from "@/modules/crm/lib/format";
import { DueChip, StageBadge, STAGE_COLORS, PrimaryButton, SecondaryButton } from "./ui";
import { NoteComposer } from "./NoteComposer";
import { TaskList, TaskForm } from "./TaskList";
import { OpportunityEditor } from "./OpportunityEditor";

/**
 * Right-hand side panel with everything about one opportunity: key numbers, next
 * action, follow-ups and notes, with quick stage change, note logging and editing.
 */
export function OpportunityDrawer({
  opportunityId, onClose, onChanged,
}: {
  opportunityId: string | null;
  onClose: () => void;
  /** Called after anything is saved so the list behind the panel can refresh. */
  onChanged?: () => void;
}) {
  const access = useCrmAccess();
  const [detail, setDetail] = useState<OpportunityDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [composing, setComposing] = useState(false);
  const [addingTask, setAddingTask] = useState(false);
  const [editing, setEditing] = useState(false);

  const load = useCallback(async (id: string) => {
    try {
      setDetail(await getOpportunityDetail(id));
      setError(null);
    } catch {
      setError("This opportunity doesn't exist or you don't have access to it.");
    }
  }, []);

  useEffect(() => {
    if (!opportunityId) return;
    let active = true;
    getOpportunityDetail(opportunityId)
      .then((d) => { if (active) { setDetail(d); setError(null); } })
      .catch(() => { if (active) setError("This opportunity doesn't exist or you don't have access to it."); });
    return () => { active = false; };
  }, [opportunityId]);

  useEffect(() => {
    if (!opportunityId) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" && !editing) onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [opportunityId, onClose, editing]);

  if (!opportunityId) return null;

  const refresh = async () => {
    await load(opportunityId);
    onChanged?.();
  };

  const opp = detail?.opportunity.id === opportunityId ? detail.opportunity : null;
  const canEdit = !!opp && access.canEdit && (access.isManager || opp.ownerName === access.userName || opp.ownerId === access.userId);
  const openTasks = detail?.tasks.filter((t) => t.status === "Open") ?? [];
  const inStage = opp ? daysSince(opp.stageChangedAt ?? opp.createdAt) : null;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/20" onClick={onClose} aria-hidden />
      <aside
        role="dialog"
        aria-label={opp ? `Opportunity: ${opp.name}` : "Opportunity"}
        className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[460px] flex-col border-l bg-card shadow-2xl animate-in slide-in-from-right duration-200"
      >
        <header className="flex items-start justify-between gap-3 border-b px-5 py-4">
          <div className="min-w-0">
            {opp && detail ? (
              <>
                <Link href={`/sales/accounts/${detail.company.id}?opp=${opp.id}`} className="text-xs text-muted-foreground hover:text-foreground hover:underline">
                  {detail.company.name}
                </Link>
                <h2 className="text-base font-semibold leading-snug">{opp.name}</h2>
                <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  {canEdit ? (
                    <select
                      aria-label="Stage"
                      value={opp.stage}
                      onChange={async (e) => { await updateOpportunityStage(opp.id, e.target.value as OppStage); await refresh(); }}
                      className={cn("rounded-full border-0 px-2 py-0.5 text-[11px] font-medium focus:ring-2 focus:ring-ring", STAGE_COLORS[opp.stage])}
                    >
                      {OPP_STAGES.map((s) => <option key={s}>{s}</option>)}
                    </select>
                  ) : <StageBadge stage={opp.stage} />}
                  <span>{opp.ownerName || "Unassigned"}</span>
                  {opp.cwNumber && (
                    opp.cwLink
                      ? <a href={opp.cwLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 hover:text-foreground">CW#{opp.cwNumber}<ExternalLink className="h-3 w-3" /></a>
                      : <span>CW#{opp.cwNumber}</span>
                  )}
                </div>
              </>
            ) : <h2 className="text-base font-semibold">{error ? "Opportunity" : "Loading…"}</h2>}
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
          {error && <p className="text-sm text-muted-foreground">{error}</p>}
          {editing && opp && detail && (
            <OpportunityEditor
              initial={opp}
              companyId={detail.company.id}
              companies={[{ id: detail.company.id, name: detail.company.name }]}
              canAssignOwner={access.isManager}
              currentUser={access.userName}
              onSave={async (d) => { await upsertSalesOpportunity(d); setEditing(false); await refresh(); }}
              onDelete={async () => { await deleteSalesOpportunity(opp.id); setEditing(false); onChanged?.(); onClose(); }}
              onCancel={() => setEditing(false)}
            />
          )}
          {!editing && opp && detail && (
            <>
              <dl className="grid grid-cols-3 gap-x-3 gap-y-3 text-sm">
                <Fact label="Value">{fmtMoney(opp.value)}</Fact>
                <Fact label="Probability">{effectiveProbability(opp)}%{opp.probability == null && isOpenStage(opp.stage) && <span className="text-[10px] text-muted-foreground"> (stage)</span>}</Fact>
                <Fact label="Weighted">{fmtMoney(weightedValue(opp))}</Fact>
                <Fact label="Expected close">{isOpenStage(opp.stage) ? <DueChip iso={opp.closeDate} className="text-sm" /> : fmtDate(opp.closeDate)}</Fact>
                <Fact label="Forecast">{effectiveForecastCategory(opp)}</Fact>
                <Fact label="In stage">{isOpenStage(opp.stage) && inStage !== null ? `${inStage} days` : "—"}</Fact>
                <Fact label="Lead source">{opp.leadSource || "—"}</Fact>
                <Fact label="Territory">{detail.company.territory || "—"}</Fact>
                <Fact label="Vertical">{detail.company.vertical || "—"}</Fact>
              </dl>

              <section className="rounded-lg border bg-muted/30 p-3">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Next action</div>
                {opp.nextStep ? (
                  <>
                    <p className="mt-1 text-sm font-medium">{opp.nextStep}</p>
                    <div className="mt-0.5 flex gap-2 text-xs text-muted-foreground">
                      <DueChip iso={opp.nextStepDate} />
                      <span>· {opp.nextStepOwnerName || opp.ownerName || "Unassigned"}</span>
                    </div>
                  </>
                ) : (
                  <p className="mt-1 text-sm text-amber-600 dark:text-amber-400">{isOpenStage(opp.stage) ? "No next step set" : "Deal closed"}</p>
                )}
              </section>

              <section>
                <div className="mb-1 flex items-center justify-between">
                  <h3 className="text-sm font-semibold">Follow-ups ({openTasks.length} open)</h3>
                  {access.canEdit && !addingTask && (
                    <button type="button" onClick={() => setAddingTask(true)} className="inline-flex items-center gap-1 text-xs text-primary hover:underline"><Plus className="h-3 w-3" />Add</button>
                  )}
                </div>
                <div className="rounded-lg border">
                  {addingTask && (
                    <div className="border-b">
                      <TaskForm
                        companyId={detail.company.id}
                        currentUser={access.userName}
                        onSave={async (t) => { await upsertTask({ ...t, opportunityId: opp.id }); setAddingTask(false); await refresh(); }}
                        onCancel={() => setAddingTask(false)}
                      />
                    </div>
                  )}
                  <TaskList
                    tasks={openTasks}
                    canEdit={access.canEdit}
                    onToggle={async (id, done) => { await setTaskDone(id, done); await refresh(); }}
                  />
                </div>
              </section>

              <section>
                <div className="mb-1 flex items-center justify-between">
                  <h3 className="text-sm font-semibold">Notes ({detail.notes.length})</h3>
                  {access.canEdit && !composing && (
                    <button type="button" onClick={() => setComposing(true)} className="inline-flex items-center gap-1 text-xs text-primary hover:underline"><Plus className="h-3 w-3" />Log note</button>
                  )}
                </div>
                {composing && (
                  <div className="mb-2 rounded-lg border bg-muted/20 p-3">
                    <NoteComposer
                      companyId={detail.company.id}
                      opportunities={[opp]}
                      contacts={detail.contacts}
                      defaultOpportunityId={opp.id}
                      onSave={async (n) => { await upsertNote(n); setComposing(false); await refresh(); }}
                      onCancel={() => setComposing(false)}
                    />
                  </div>
                )}
                {detail.notes.length === 0 ? (
                  <p className="rounded-lg border px-3 py-4 text-center text-xs text-muted-foreground">No notes on this deal yet.</p>
                ) : (
                  <ol className="divide-y rounded-lg border">
                    {detail.notes.slice(0, 8).map((n) => (
                      <li key={n.id} className="px-3 py-2">
                        <div className="text-[11px] text-muted-foreground">
                          <span className="font-medium text-foreground/80">{fmtDate(n.noteDate)}</span> · {n.kind}
                          {n.contact && <> · with {n.contact.name}</>} · {n.userName}
                        </div>
                        <p className="mt-0.5 whitespace-pre-wrap text-sm leading-relaxed line-clamp-6">{n.body}</p>
                      </li>
                    ))}
                  </ol>
                )}
              </section>

              {detail.history.length > 0 && (
                <details className="text-xs">
                  <summary className="cursor-pointer text-muted-foreground hover:text-foreground">Recent changes ({detail.history.length})</summary>
                  <ul className="mt-2 space-y-1 text-muted-foreground">
                    {detail.history.map((h) => (
                      <li key={h.id}>
                        <span className="tabular-nums">{fmtDate(h.createdAt, { year: false })}</span> · <span className="text-foreground/70">{h.userName || "System"}</span>{" "}
                        {h.action === "stage_changed" ? `moved ${h.oldValue} → ${h.newValue}` :
                          h.action === "created" ? `created ${h.entityType}${h.newValue ? `: ${h.newValue}` : ""}` :
                          h.action === "automation" ? `automation: ${h.newValue}` :
                          `${h.action} ${h.field}`.trim()}
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </>
          )}
        </div>

        {!editing && opp && detail && (
          <footer className="flex items-center justify-between gap-2 border-t px-5 py-3">
            <Link href={`/sales/accounts/${detail.company.id}?opp=${opp.id}`}>
              <SecondaryButton type="button">Open account</SecondaryButton>
            </Link>
            {canEdit && <PrimaryButton type="button" onClick={() => setEditing(true)}><Pencil className="h-3.5 w-3.5" />Edit deal</PrimaryButton>}
          </footer>
        )}
      </aside>

    </>
  );
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] text-muted-foreground">{label}</dt>
      <dd className="truncate font-medium tabular-nums">{children}</dd>
    </div>
  );
}
