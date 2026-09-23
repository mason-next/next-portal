"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ExternalLink, Pencil, Plus, Users } from "lucide-react";
import { Modal } from "@/components/shared/Modal";
import { CompanyContactsDrawer } from "@/modules/sales-activity/components/CompanyContactsDrawer";
import {
  getAccountSnapshot, upsertNote, deleteNote, setNotePinned, upsertTask, setTaskDone, deleteTask, getCrmAccounts,
} from "@/lib/data/crm";
import {
  upsertSalesCompany, deleteSalesCompany, upsertSalesOpportunity, deleteSalesOpportunity, updateOpportunityStage,
} from "@/lib/data/sales-activity";
import type { AccountSnapshot, OppStage, SalesOpportunity, SalesCompany } from "@/types/sales";
import { OPP_STAGES, isOpenStage, effectiveProbability, weightedValue } from "@/types/sales";
import { useCrmAccess } from "@/modules/crm/hooks/useCrmAccess";
import { fmtMoney, fmtMoneyShort, fmtDate, daysSince, relativeDay } from "@/modules/crm/lib/format";
import {
  CrmSubNav, Kpi, Panel, StageBadge, StatusBadge, DueChip, CompanyLogo, PrimaryButton, SecondaryButton, Empty,
  STAGE_COLORS,
} from "@/modules/crm/components/ui";
import { AccountForm } from "@/modules/crm/components/AccountForm";
import { OpportunityEditor } from "@/modules/crm/components/OpportunityEditor";
import { NoteComposer } from "@/modules/crm/components/NoteComposer";
import { AccountTimeline } from "@/modules/crm/components/AccountTimeline";
import { TaskList, TaskForm } from "@/modules/crm/components/TaskList";
import { SummaryPanel } from "@/modules/crm/components/SummaryPanel";
import { cn } from "@/lib/utils";

const NO_ACCESS = "This account doesn't exist or you don't have access to it.";

type ModalState =
  | { type: "account" }
  | { type: "opp"; opp?: SalesOpportunity }
  | null;

export default function AccountSnapshotPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const access = useCrmAccess();
  const [snap, setSnap] = useState<AccountSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalState>(null);
  const [showClosed, setShowClosed] = useState(false);
  const [showDoneTasks, setShowDoneTasks] = useState(false);
  const [addingTask, setAddingTask] = useState(false);
  const [contactsOpen, setContactsOpen] = useState(false);
  // ?opp=<id> deep link from the opportunities list / agenda: highlight that deal.
  const searchParams = useSearchParams();
  const focusOpp = searchParams.get("opp");
  // ?task=<id> from the agenda / dashboard: highlight that task and scroll to it.
  const focusTask = searchParams.get("task");
  const [lookups, setLookups] = useState<{ territories: string[]; verticals: string[] }>({ territories: [], verticals: [] });

  const reload = useCallback(async () => {
    try {
      setSnap(await getAccountSnapshot(id));
      setError(null);
    } catch {
      setError(NO_ACCESS);
    }
  }, [id]);

  useEffect(() => {
    let active = true;
    getAccountSnapshot(id)
      .then((s) => { if (active) { setSnap(s); setError(null); } })
      // Production builds mask server-action error text, so show one clear message.
      .catch(() => { if (active) setError(NO_ACCESS); });
    return () => { active = false; };
  }, [id]);

  useEffect(() => {
    getCrmAccounts().then(({ companies }) => {
      const uniq = (xs: (string | undefined)[]) => Array.from(new Set(xs.filter((x): x is string => !!x?.trim()))).sort();
      setLookups({ territories: uniq(companies.map((c) => c.territory)), verticals: uniq(companies.map((c) => c.vertical)) });
    }).catch(() => {});
  }, []);

  // Bring the task (or deal) you came for into view once the page has data.
  const loaded = !!snap;
  useEffect(() => {
    if (!loaded || (!focusTask && !focusOpp)) return;
    const key = focusTask ? `task-${focusTask}` : `opp-${focusOpp}`;
    const t = setTimeout(() => {
      const el = Array.from(document.querySelectorAll<HTMLElement>(`[data-focus="${key}"]`)).find((n) => n.offsetParent !== null);
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 150);
    return () => clearTimeout(t);
  }, [loaded, focusTask, focusOpp]);

  const stats = useMemo(() => {
    if (!snap) return null;
    const open = snap.opportunities.filter((o) => isOpenStage(o.stage));
    const won = snap.opportunities.filter((o) => o.stage === "Closed Won");
    const lastTouch = snap.notes[0]?.noteDate ?? null;
    const upcoming = [
      ...snap.tasks.filter((t) => t.status === "Open" && t.dueDate).map((t) => ({ date: t.dueDate!, label: t.title, sub: t.assigneeName, key: `t${t.id}` })),
      ...open.filter((o) => o.closeDate).map((o) => ({ date: o.closeDate!, label: `Expected close · ${fmtMoneyShort(o.value)}`, sub: o.name, key: `c${o.id}` })),
    ].sort((a, b) => a.date.localeCompare(b.date));
    return {
      open,
      openValue: open.reduce((s, o) => s + o.value, 0),
      weighted: open.reduce((s, o) => s + weightedValue(o), 0),
      wonValue: won.reduce((s, o) => s + o.value, 0),
      wonCount: won.length,
      lastTouch,
      upcoming,
    };
  }, [snap]);

  if (error) {
    return (
      <div className="mx-auto max-w-7xl space-y-4 px-4 py-5 sm:p-8">
        <CrmSubNav />
        <div className="rounded-xl border bg-card p-8 text-center text-sm text-muted-foreground">
          {error} · <Link href="/sales/accounts" className="text-primary hover:underline">Back to accounts</Link>
        </div>
      </div>
    );
  }
  if (!snap || !stats) {
    return <div className="mx-auto max-w-7xl px-4 py-5 sm:p-8"><CrmSubNav /><div className="py-16 text-center text-sm text-muted-foreground">Loading…</div></div>;
  }

  const { company } = snap;
  const oppsShown = showClosed ? snap.opportunities : stats.open;
  const tasksShown = snap.tasks.filter((t) => showDoneTasks || t.status === "Open" || t.id === focusTask);
  const canEditOpp = (o: SalesOpportunity) => access.canEdit && (access.isManager || o.ownerName === access.userName || o.ownerId === access.userId);
  const lastTouchDays = daysSince(stats.lastTouch);

  async function changeStage(o: SalesOpportunity, stage: OppStage) {
    await updateOpportunityStage(o.id, stage);
    await reload();
  }

  return (
    <div className="mx-auto max-w-7xl space-y-5 px-4 pb-28 pt-5 sm:px-8 sm:pt-8 lg:pb-8">
      <CrmSubNav />

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <CompanyLogo name={company.name} domain={company.domain} size={44} />
          <div>
            <div className="text-xs text-muted-foreground"><Link href="/sales/accounts" className="hover:text-foreground">Accounts</Link> /</div>
            <h1 className="text-xl font-semibold tracking-tight">{company.name}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              <StatusBadge status={company.accountStatus ?? "Prospect"} />
              <span>Owner: <span className="font-medium text-foreground">{company.ownerName || "Unassigned"}</span></span>
              {company.territory && <span>Territory: {company.territory}</span>}
              {company.vertical && <span>Vertical: {company.vertical}</span>}
              {company.domain && (
                <a href={`https://${company.domain}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 hover:text-foreground">
                  {company.domain}<ExternalLink className="h-3 w-3" />
                </a>
              )}
              {company.phone && <a href={`tel:${company.phone}`} className="hover:text-foreground">{company.phone}</a>}
            </div>
          </div>
        </div>
        {access.canEdit && (
          <div className="flex gap-2">
            <SecondaryButton onClick={() => setModal({ type: "account" })}><Pencil className="h-3.5 w-3.5" />Edit account</SecondaryButton>
            <PrimaryButton onClick={() => setModal({ type: "opp" })}><Plus className="h-3.5 w-3.5" />Opportunity</PrimaryButton>
          </div>
        )}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <Kpi label="Open pipeline" value={fmtMoneyShort(stats.openValue)} sub={`${stats.open.length} open opp${stats.open.length === 1 ? "" : "s"}`} />
        <Kpi label="Weighted pipeline" value={fmtMoneyShort(stats.weighted)} sub="value × probability" />
        <Kpi label="Won (lifetime)" value={fmtMoneyShort(stats.wonValue)} sub={`${stats.wonCount} deal${stats.wonCount === 1 ? "" : "s"}`} tone={stats.wonValue ? "good" : undefined} />
        <Kpi label="Last touch" value={stats.lastTouch ? (lastTouchDays === 0 ? "Today" : `${lastTouchDays}d ago`) : "Never"}
          sub={stats.lastTouch ? fmtDate(stats.lastTouch) : "no notes logged"} tone={lastTouchDays === null || lastTouchDays > 30 ? "warn" : undefined} />
        <Kpi label="Next date" value={stats.upcoming[0] ? relativeDay(stats.upcoming[0].date) : "—"}
          sub={stats.upcoming[0]?.label ?? "nothing scheduled"} tone={stats.upcoming[0] && stats.upcoming[0].date < new Date().toISOString() ? "warn" : undefined} />
      </div>

      {/* On phones the two columns dissolve (display: contents) so panels can be ordered
          Tasks → Opportunities → Notes → the rest. */}
      <div className="grid gap-5 lg:grid-cols-3">
        <div className="contents lg:col-span-2 lg:block lg:space-y-5">
          {/* Opportunities */}
          <div className="order-2 min-w-0 lg:order-none">
          <Panel
            title={`Opportunities (${oppsShown.length})`}
            actions={
              <label className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                <input type="checkbox" checked={showClosed} onChange={(e) => setShowClosed(e.target.checked)} />
                Show closed ({snap.opportunities.length - stats.open.length})
              </label>
            }
          >
            {oppsShown.length === 0 ? (
              <Empty>{snap.opportunities.length ? "No open opportunities." : "No opportunities yet."}</Empty>
            ) : (
              <>
              <ul className="divide-y md:hidden">
                {oppsShown.map((o) => (
                  <li key={o.id} data-focus={`opp-${o.id}`} className={cn("px-4 py-3", focusOpp === o.id && "bg-primary/5 ring-2 ring-inset ring-primary/40")}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-medium leading-snug">{o.name}</div>
                        <div className="text-xs text-muted-foreground">{fmtMoney(o.value)} · {effectiveProbability(o)}% · close {fmtDate(o.closeDate, { year: false })}</div>
                      </div>
                      {canEditOpp(o) && (
                        <button type="button" aria-label={`Edit ${o.name}`} onClick={() => setModal({ type: "opp", opp: o })} className="rounded p-2 text-muted-foreground hover:bg-muted">
                          <Pencil className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      {canEditOpp(o) ? (
                        <select
                          aria-label={`Stage for ${o.name} (mobile)`}
                          value={o.stage}
                          onChange={(e) => changeStage(o, e.target.value as OppStage)}
                          className={cn("rounded-full border-0 px-2.5 py-1 text-xs font-medium", STAGE_COLORS[o.stage])}
                        >
                          {OPP_STAGES.map((st) => <option key={st}>{st}</option>)}
                        </select>
                      ) : <StageBadge stage={o.stage} />}
                      {o.nextStep ? (
                        <span className="min-w-0 truncate text-xs">
                          <span className="text-muted-foreground">Next:</span> {o.nextStep} · <DueChip iso={o.nextStepDate} />
                        </span>
                      ) : isOpenStage(o.stage) ? <span className="text-xs text-amber-600 dark:text-amber-400">No next task</span> : null}
                    </div>
                  </li>
                ))}
              </ul>
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40 text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="px-4 py-2 font-medium">Opportunity</th>
                      <th className="px-2 py-2 font-medium">Stage</th>
                      <th className="px-2 py-2 text-right font-medium">Value</th>
                      <th className="px-2 py-2 text-right font-medium">Prob.</th>
                      <th className="px-2 py-2 font-medium">Close</th>
                      <th className="px-2 py-2 font-medium">Next step</th>
                      <th className="px-2 py-2" />
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {oppsShown.map((o) => (
                      <tr key={o.id} data-focus={`opp-${o.id}`} className={cn("align-top", focusOpp === o.id && "bg-primary/5 ring-2 ring-inset ring-primary/40")}>
                        <td className="px-4 py-2.5">
                          <div className="font-medium">{o.name}</div>
                          <div className="text-xs text-muted-foreground">{o.ownerName || "Unassigned"}{o.cwNumber ? ` · CW#${o.cwNumber}` : ""}</div>
                        </td>
                        <td className="px-2 py-2.5">
                          {canEditOpp(o) ? (
                            <select
                              aria-label={`Stage for ${o.name}`}
                              value={o.stage}
                              onChange={(e) => changeStage(o, e.target.value as OppStage)}
                              className={cn("rounded-full border-0 px-2 py-0.5 text-[11px] font-medium focus:ring-2 focus:ring-ring", STAGE_COLORS[o.stage])}
                            >
                              {OPP_STAGES.map((s) => <option key={s}>{s}</option>)}
                            </select>
                          ) : <StageBadge stage={o.stage} />}
                        </td>
                        <td className="px-2 py-2.5 text-right tabular-nums">{fmtMoney(o.value)}</td>
                        <td className="px-2 py-2.5 text-right tabular-nums text-muted-foreground">{effectiveProbability(o)}%</td>
                        <td className="px-2 py-2.5 whitespace-nowrap text-xs">{isOpenStage(o.stage) ? <DueChip iso={o.closeDate} /> : fmtDate(o.closeDate)}</td>
                        <td className="max-w-[16rem] px-2 py-2.5">
                          {o.nextStep ? (
                            <>
                              <div className="truncate text-xs">{o.nextStep}</div>
                              <div className="flex gap-1.5 text-[11px] text-muted-foreground">
                                <DueChip iso={o.nextStepDate} className="text-[11px]" />
                                <span>· {o.nextStepOwnerName || o.ownerName}</span>
                              </div>
                            </>
                          ) : isOpenStage(o.stage) ? <span className="text-xs text-amber-600 dark:text-amber-400">No next task</span> : <span className="text-xs text-muted-foreground">—</span>}
                        </td>
                        <td className="px-2 py-2.5 text-right">
                          {canEditOpp(o) && (
                            <button type="button" title="Edit opportunity" onClick={() => setModal({ type: "opp", opp: o })} className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground">
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              </>
            )}
          </Panel>
          </div>

          {/* Notes & history */}
          <div id="notes-panel" className="order-3 min-w-0 scroll-mt-4 lg:order-none">
          <Panel title="Notes & customer history">
            {access.canEdit && (
              <div className="border-b bg-muted/20 px-4 py-3">
                <NoteComposer
                  key={focusOpp ?? "company"}
                  companyId={company.id}
                  opportunities={snap.opportunities}
                  contacts={snap.contacts}
                  defaultOpportunityId={focusOpp}
                  onSave={async (n) => { await upsertNote(n); await reload(); }}
                />
              </div>
            )}
            <AccountTimeline
              notes={snap.notes}
              activities={snap.activities}
              history={snap.history}
              opportunities={snap.opportunities}
              contacts={snap.contacts}
              currentUser={access.userName}
              isManager={access.isManager}
              canEdit={access.canEdit}
              onSaveNote={async (n) => { await upsertNote(n); await reload(); }}
              onDeleteNote={async (nid) => { await deleteNote(nid); await reload(); }}
              onTogglePin={async (nid, p) => { await setNotePinned(nid, p); await reload(); }}
            />
          </Panel>
          </div>
        </div>

        <div className="contents lg:block lg:space-y-5">
          {/* Tasks */}
          <div id="tasks-panel" className="order-1 min-w-0 scroll-mt-4 lg:order-none">
          <Panel
            title={`Tasks (${snap.tasks.filter((t) => t.status === "Open").length} open)`}
            actions={
              <>
                <label className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <input type="checkbox" checked={showDoneTasks} onChange={(e) => setShowDoneTasks(e.target.checked)} />Done
                </label>
                {access.canEdit && !addingTask && (
                  <button type="button" onClick={() => setAddingTask(true)} className="rounded p-1 hover:bg-muted" title="Add task"><Plus className="h-4 w-4" /></button>
                )}
              </>
            }
          >
            {addingTask && (
              <div className="border-b">
                <TaskForm
                  companyId={company.id}
                  opportunities={stats.open}
                  currentUser={access.userName}
                  onSave={async (t) => { await upsertTask(t); setAddingTask(false); await reload(); }}
                  onCancel={() => setAddingTask(false)}
                />
              </div>
            )}
            <TaskList
              tasks={tasksShown}
              highlightId={focusTask}
              canEdit={access.canEdit}
              onToggle={async (tid, done) => { await setTaskDone(tid, done); await reload(); }}
              onDelete={async (tid) => { await deleteTask(tid); await reload(); }}
            />
          </Panel>
          </div>

          {/* Upcoming dates */}
          <div className="order-4 min-w-0 lg:order-none">
          <Panel title="Upcoming dates">
            {stats.upcoming.length === 0 ? <Empty>Nothing scheduled.</Empty> : (
              <ul className="divide-y">
                {stats.upcoming.slice(0, 10).map((u) => (
                  <li key={u.key} className="flex items-start justify-between gap-3 px-4 py-2">
                    <div className="min-w-0">
                      <div className="truncate text-sm">{u.label}</div>
                      <div className="truncate text-xs text-muted-foreground">{u.sub}</div>
                    </div>
                    <DueChip iso={u.date} className="shrink-0 pt-0.5" />
                  </li>
                ))}
              </ul>
            )}
          </Panel>
          </div>

          {/* Contacts */}
          <div className="order-5 min-w-0 lg:order-none">
          <Panel
            title={`Contacts (${snap.contacts.length})`}
            actions={
              <button type="button" onClick={() => setContactsOpen(true)} className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs text-primary hover:bg-muted">
                <Users className="h-3.5 w-3.5" />{access.canEdit ? "Manage" : "View"}
              </button>
            }
          >
            {snap.contacts.length === 0 ? <Empty>No contacts yet.</Empty> : (
              <ul className="divide-y">
                {snap.contacts.map((c) => (
                  <li key={c.id} className="px-4 py-2">
                    <div className="text-sm font-medium">{c.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {[c.title, c.email && <a key="e" href={`mailto:${c.email}`} className="hover:text-foreground">{c.email}</a>, c.phone]
                        .filter(Boolean)
                        .map((x, i) => <span key={i}>{i > 0 && " · "}{x}</span>)}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
          </div>

          <div className="order-6 min-w-0 lg:order-none">
            <SummaryPanel companyId={company.id} defaultDays={90} title="AI account summary" />
          </div>
        </div>
      </div>

      {/* Phone quick actions: log a note or add a task without scrolling. */}
      {access.canEdit && (
        <div className="fixed inset-x-0 bottom-0 z-30 flex gap-2 border-t bg-card/95 px-4 py-3 backdrop-blur lg:hidden"
          style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}>
          <SecondaryButton
            className="h-11 flex-1 justify-center text-base"
            onClick={() => {
              setAddingTask(true);
              document.getElementById("tasks-panel")?.scrollIntoView({ behavior: "smooth" });
            }}
          >
            <Plus className="h-4 w-4" />Task
          </SecondaryButton>
          <PrimaryButton
            className="h-11 flex-1 justify-center text-base"
            onClick={() => {
              document.getElementById("notes-panel")?.scrollIntoView({ behavior: "smooth" });
              setTimeout(() => (document.querySelector('#notes-panel textarea') as HTMLTextAreaElement | null)?.focus(), 350);
            }}
          >
            <Plus className="h-4 w-4" />Note
          </PrimaryButton>
        </div>
      )}

      {/* Modals */}
      <Modal open={modal?.type === "account"} onClose={() => setModal(null)} className="max-w-xl">
        {modal?.type === "account" && (
          <AccountForm
            initial={company}
            canAssignOwner={access.isManager}
            currentUser={access.userName}
            territories={lookups.territories}
            verticals={lookups.verticals}
            onSave={async (d) => { await upsertSalesCompany(d); setModal(null); await reload(); }}
            onDelete={access.isManager ? async () => { await deleteSalesCompany(company.id); router.push("/sales/accounts"); } : undefined}
            onCancel={() => setModal(null)}
          />
        )}
      </Modal>
      <Modal open={modal?.type === "opp"} onClose={() => setModal(null)} className="max-w-xl max-h-[92vh] overflow-y-auto">
        {modal?.type === "opp" && (
          <OpportunityEditor
            initial={modal.opp}
            companyId={company.id}
            companies={[company as SalesCompany]}
            canAssignOwner={access.isManager}
            currentUser={access.userName}
            onSave={async (d) => { await upsertSalesOpportunity(d); setModal(null); await reload(); }}
            onDelete={modal.opp ? async () => { await deleteSalesOpportunity(modal.opp!.id); setModal(null); await reload(); } : undefined}
            onCancel={() => setModal(null)}
          />
        )}
      </Modal>
      {contactsOpen && (
        <CompanyContactsDrawer
          company={company}
          canEdit={access.canEdit}
          onClose={() => { setContactsOpen(false); reload(); }}
        />
      )}
    </div>
  );
}
