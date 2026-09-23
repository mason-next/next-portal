"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, CheckSquare, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { getAgenda, getNotes, setTaskDone } from "@/lib/data/crm";
import type { AgendaItem, SalesNote } from "@/types/sales";
import { useCrmAccess } from "@/modules/crm/hooks/useCrmAccess";
import { daysFromToday, fmtDate, fmtMoneyShort, agendaItemHref } from "@/modules/crm/lib/format";
import { PageHeader, FilterSelect, Panel, Empty, DueChip, PriorityDot } from "@/modules/crm/components/ui";
import { SummaryPanel } from "@/modules/crm/components/SummaryPanel";
import { usePersistentFilter } from "@/lib/storage/use-persistent-filter";

const BUCKETS = [
  { key: "overdue", label: "Overdue", test: (d: number) => d < 0 },
  { key: "today", label: "Today", test: (d: number) => d === 0 },
  { key: "week", label: "Next 7 days", test: (d: number) => d > 0 && d <= 7 },
  { key: "later", label: "Later", test: (d: number) => d > 7 },
] as const;

const KIND_META = {
  task:      { icon: CheckSquare,   label: "Task" },
  closeDate: { icon: CalendarClock, label: "Expected close" },
} as const;

export default function AgendaPage() {
  const access = useCrmAccess();
  const router = useRouter();
  const [days, setDays] = usePersistentFilter("crm.agenda.days", "30");
  const [who, setWho] = usePersistentFilter("crm.agenda.who", "me");
  const [kinds, setKinds] = useState<Record<AgendaItem["kind"], boolean>>({ task: true, closeDate: true });
  const [items, setItems] = useState<AgendaItem[] | null>(null);
  const [noteDays, setNoteDays] = usePersistentFilter("crm.agenda.noteDays", "7");
  const [notes, setNotes] = useState<SalesNote[] | null>(null);

  // Managers can look at everyone or one rep; everyone else is always scoped to themselves server-side.
  const ownerName = access.isManager ? (who === "me" ? access.userName : who === "all" ? undefined : who) : undefined;

  const load = useCallback(() => {
    getAgenda({ days: Number(days), ownerName }).then(setItems);
  }, [days, ownerName]);
  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const from = new Date();
    from.setDate(from.getDate() - Number(noteDays));
    getNotes({ from: from.toISOString(), limit: 400 }).then(setNotes);
  }, [noteDays]);

  const visible = (items ?? []).filter((i) => kinds[i.kind]);
  const reps = Array.from(new Set((items ?? []).map((i) => i.ownerName).filter(Boolean))).sort();

  const buckets = BUCKETS.map((b) => ({ ...b, items: visible.filter((i) => b.test(daysFromToday(i.date) ?? 0)) }));

  const digest = useMemo(() => {
    const byCompany = new Map<string, { id: string; name: string; notes: SalesNote[] }>();
    for (const n of notes ?? []) {
      if (!n.company) continue;
      const g = byCompany.get(n.companyId) ?? { id: n.companyId, name: n.company.name, notes: [] };
      g.notes.push(n);
      byCompany.set(n.companyId, g);
    }
    return Array.from(byCompany.values()).sort((a, b) => b.notes[0].noteDate.localeCompare(a.notes[0].noteDate));
  }, [notes]);

  return (
    <div className="mx-auto max-w-7xl space-y-5 px-4 py-5 sm:p-8">
      <PageHeader
        title="Agenda"
        subtitle="What's due, what's closing, and what customers have been telling us"
      />

      <div className="grid gap-5 lg:grid-cols-5">
        <div className="space-y-4 lg:col-span-3">
          <div className="flex flex-wrap items-center gap-2">
            {access.isManager && (
              <FilterSelect label="Whose agenda" value={who} onChange={setWho}>
                <option value="me">My agenda</option>
                <option value="all">Everyone</option>
                {reps.filter((r) => r !== access.userName).map((r) => <option key={r} value={r}>{r}</option>)}
              </FilterSelect>
            )}
            <FilterSelect label="Horizon" value={days} onChange={setDays}>
              <option value="7">Next 7 days</option>
              <option value="14">Next 14 days</option>
              <option value="30">Next 30 days</option>
              <option value="60">Next 60 days</option>
              <option value="90">Next 90 days</option>
            </FilterSelect>
            {(Object.keys(KIND_META) as AgendaItem["kind"][]).map((k) => (
              <label key={k} className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                <input type="checkbox" checked={kinds[k]} onChange={(e) => setKinds((p) => ({ ...p, [k]: e.target.checked }))} />
                {KIND_META[k].label}s
              </label>
            ))}
          </div>

          {!items ? <div className="rounded-xl border bg-card"><Empty>Loading…</Empty></div> : visible.length === 0 ? (
            <div className="rounded-xl border bg-card"><Empty>Nothing on the agenda for this window. 🎉</Empty></div>
          ) : buckets.filter((b) => b.items.length > 0).map((b) => (
            <Panel key={b.key} title={<span className={b.key === "overdue" ? "text-red-600 dark:text-red-400" : undefined}>{b.label} <span className="font-normal text-muted-foreground">({b.items.length})</span></span>}>
              <ul className="divide-y">
                {b.items.map((i) => {
                  const Icon = KIND_META[i.kind].icon;
                  const href = agendaItemHref(i);
                  return (
                    <li
                      key={i.id}
                      onClick={href ? (e) => {
                        if ((e.target as HTMLElement).closest("input, a, button")) return;
                        router.push(href);
                      } : undefined}
                      className={cn("flex items-start gap-3 px-4 py-2.5", href && "cursor-pointer hover:bg-muted/30 active:bg-muted/50")}
                    >
                      {i.kind === "task" ? (
                        <input
                          type="checkbox"
                          className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer sm:mt-1 sm:h-4 sm:w-4"
                          aria-label={`Mark "${i.title}" done`}
                          disabled={!access.canEdit}
                          onChange={async () => { await setTaskDone(i.id, true); load(); }}
                        />
                      ) : <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 text-sm">
                          {i.priority && <PriorityDot priority={i.priority} />}
                          <span className="font-medium">{i.title}</span>
                          {i.value > 0 && <span className="text-xs text-muted-foreground">· {fmtMoneyShort(i.value)}</span>}
                        </div>
                        <div className="mt-0.5 flex flex-wrap gap-x-2 text-xs text-muted-foreground">
                          <span>{KIND_META[i.kind].label}</span>
                          {i.companyName && <span>{i.companyName}</span>}
                          {i.opportunityName && <span>· {i.opportunityName}</span>}
                          <span>· {i.ownerName || "Unassigned"}</span>
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <DueChip iso={i.date} />
                        <div className="text-[11px] text-muted-foreground">{fmtDate(i.date, { year: false })}</div>
                      </div>
                      {href && <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground/60" aria-hidden />}
                    </li>
                  );
                })}
              </ul>
            </Panel>
          ))}
        </div>

        <div className="space-y-5 lg:col-span-2">
          <SummaryPanel defaultDays={14} />

          <Panel
            title="Recent notes by account"
            actions={
              <FilterSelect label="Notes window" value={noteDays} onChange={setNoteDays}>
                <option value="7">Last 7 days</option>
                <option value="14">Last 14 days</option>
                <option value="30">Last 30 days</option>
              </FilterSelect>
            }
          >
            {!notes ? <Empty>Loading…</Empty> : digest.length === 0 ? <Empty>No notes logged in this window.</Empty> : (
              <ul className="divide-y">
                {digest.map((g) => (
                  <li key={g.id} className="px-4 py-3">
                    <div className="flex items-center justify-between">
                      <Link href={`/sales/accounts/${g.id}`} className="text-sm font-semibold hover:underline">{g.name}</Link>
                      <span className="text-xs text-muted-foreground">{g.notes.length} note{g.notes.length === 1 ? "" : "s"}</span>
                    </div>
                    <ul className="mt-1.5 space-y-1.5">
                      {g.notes.slice(0, 3).map((n) => (
                        <li key={n.id} className="text-xs">
                          <span className="font-medium text-muted-foreground">{fmtDate(n.noteDate, { year: false })} · {n.kind}{n.opportunity ? ` · ${n.opportunity.name}` : ""}:</span>{" "}
                          <span className="line-clamp-2 inline">{n.body}</span>
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}
