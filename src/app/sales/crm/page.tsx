"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getCrmAccounts, getAgenda, getLeads, type AccountRollup } from "@/lib/data/crm";
import type { SalesCompany, SalesOpportunity, AgendaItem, SalesLead } from "@/types/sales";
import { ACTIVE_STAGES, isOpenStage, weightedValue, effectiveForecastCategory } from "@/types/sales";
import { useCrmAccess } from "@/modules/crm/hooks/useCrmAccess";
import { fmtMoney, fmtMoneyShort, daysFromToday, daysSince, monthKey, monthLabel, quarterKey } from "@/modules/crm/lib/format";
import { PageHeader, FilterSelect, Kpi, Panel, Empty, DueChip } from "@/modules/crm/components/ui";
import { cn } from "@/lib/utils";

// Chart colors: categorical slots 1–4 of the validated reference palette, stepped
// separately for the dark surface (the portal toggles dark mode via the .dark class).
// Two light-mode slots sit below 3:1 contrast, so every chart also has a legend,
// visible totals, and a table view.
const VIZ_STYLE = `
.crm-viz { --viz-1:#2a78d6; --viz-2:#eb6834; --viz-3:#1baf7a; --viz-4:#eda100; }
.dark .crm-viz { --viz-1:#3987e5; --viz-2:#d95926; --viz-3:#199e70; --viz-4:#c98500; }
`;

type Dim = "owner" | "account" | "territory" | "vertical";
const DIM_LABEL: Record<Dim, string> = { owner: "Salesperson", account: "Account", territory: "Territory", vertical: "Vertical" };

interface OppRow { o: SalesOpportunity; c: SalesCompany }

const FORECAST_SERIES = [
  { key: "Closed",    label: "Won",       color: "var(--viz-1)" },
  { key: "Commit",    label: "Commit",    color: "var(--viz-2)" },
  { key: "Best Case", label: "Best case", color: "var(--viz-3)" },
  { key: "Pipeline",  label: "Pipeline",  color: "var(--viz-4)" },
] as const;

export default function CrmDashboardPage() {
  const access = useCrmAccess();
  const [data, setData] = useState<{ companies: SalesCompany[]; rollups: Record<string, AccountRollup> } | null>(null);
  const [agenda, setAgenda] = useState<AgendaItem[]>([]);
  const [leads, setLeads] = useState<SalesLead[]>([]);
  // A rep only ever sees their own deals, so "by salesperson" would be a single row.
  const [dim, setDim] = useState<Dim>(access.isManager ? "owner" : "account");
  const [rep, setRep] = useState("");

  useEffect(() => {
    getCrmAccounts().then(setData);
    getAgenda({ days: 14 }).then(setAgenda);
    getLeads().then(setLeads);
  }, []);

  const allRows: OppRow[] = useMemo(() => (data?.companies ?? []).flatMap((c) => (c.opportunities ?? []).map((o) => ({ o, c }))), [data]);
  const reps = Array.from(new Set(allRows.map((r) => r.o.ownerName).filter(Boolean))).sort();
  const rows = rep ? allRows.filter((r) => r.o.ownerName === rep) : allRows;

  const now = new Date().toISOString().slice(0, 10);
  const thisQ = quarterKey(now);

  const m = useMemo(() => {
    const open = rows.filter((r) => isOpenStage(r.o.stage));
    const inQ = (r: OppRow) => !!r.o.closeDate && quarterKey(r.o.closeDate) === thisQ;
    const wonQ = rows.filter((r) => r.o.stage === "Closed Won" && inQ(r));
    const yearAgo = new Date(); yearAgo.setFullYear(yearAgo.getFullYear() - 1);
    const recentClosed = rows.filter((r) => !isOpenStage(r.o.stage) && (r.o.closeDate ?? r.o.updatedAt) >= yearAgo.toISOString());
    const recentWon = recentClosed.filter((r) => r.o.stage === "Closed Won").length;
    const commitQ = open.filter((r) => inQ(r) && effectiveForecastCategory(r.o) === "Commit");
    return {
      open,
      pipeline: open.reduce((s, r) => s + r.o.value, 0),
      weighted: open.reduce((s, r) => s + weightedValue(r.o), 0),
      wonQ: wonQ.reduce((s, r) => s + r.o.value, 0),
      wonQCount: wonQ.length,
      commitQ: commitQ.reduce((s, r) => s + r.o.value, 0),
      winRate: recentClosed.length ? Math.round((recentWon / recentClosed.length) * 100) : null,
      avgDeal: open.length ? Math.round(open.reduce((s, r) => s + r.o.value, 0) / open.length) : 0,
    };
  }, [rows, thisQ]);

  const breakdown = useMemo(() => {
    const keyOf = (r: OppRow) =>
      dim === "owner" ? r.o.ownerName || "Unassigned" :
      dim === "account" ? r.c.name :
      dim === "territory" ? r.c.territory || "No territory" :
      r.c.vertical || "No vertical";
    const map = new Map<string, { key: string; count: number; pipeline: number; weighted: number; commit: number; next: string | null; href?: string }>();
    for (const r of m.open) {
      const k = keyOf(r);
      const g = map.get(k) ?? { key: k, count: 0, pipeline: 0, weighted: 0, commit: 0, next: null, href: dim === "account" ? `/sales/accounts/${r.c.id}` : undefined };
      g.count++;
      g.pipeline += r.o.value;
      g.weighted += weightedValue(r.o);
      if (effectiveForecastCategory(r.o) === "Commit") g.commit += r.o.value;
      if (r.o.closeDate && (!g.next || r.o.closeDate < g.next)) g.next = r.o.closeDate;
      map.set(k, g);
    }
    return Array.from(map.values()).sort((a, b) => b.pipeline - a.pipeline);
  }, [m.open, dim]);
  const maxPipe = Math.max(1, ...breakdown.map((b) => b.pipeline));

  // Forecast: next 6 months by close month, stacked by forecast category (won deals shown in their close month).
  const forecast = useMemo(() => {
    const months: string[] = [];
    const d = new Date(); d.setDate(1);
    for (let i = 0; i < 6; i++) { months.push(monthKey(d.toISOString())); d.setMonth(d.getMonth() + 1); }
    const cells = months.map((mk) => ({ mk, byCat: { Closed: 0, Commit: 0, "Best Case": 0, Pipeline: 0 } as Record<string, number> }));
    for (const r of rows) {
      if (!r.o.closeDate || r.o.stage === "Closed Lost") continue;
      const cell = cells.find((c) => c.mk === monthKey(r.o.closeDate!));
      if (!cell) continue;
      const cat = effectiveForecastCategory(r.o);
      if (cat in cell.byCat) cell.byCat[cat] += r.o.value;
    }
    return cells;
  }, [rows]);
  const maxMonth = Math.max(1, ...forecast.map((c) => Object.values(c.byCat).reduce((a, b) => a + b, 0)));

  const funnel = ACTIVE_STAGES.map((s) => {
    const rs = m.open.filter((r) => r.o.stage === s);
    return { stage: s, count: rs.length, value: rs.reduce((a, r) => a + r.o.value, 0) };
  });
  const maxFunnel = Math.max(1, ...funnel.map((f) => f.value));

  const attention = useMemo(() => {
    const out: { r: OppRow; reason: string; sev: number }[] = [];
    for (const r of m.open) {
      const nd = daysFromToday(r.o.nextStepDate);
      const cd = daysFromToday(r.o.closeDate);
      const touch = daysSince(data?.rollups[r.c.id]?.lastTouch);
      if (cd !== null && cd < 0) out.push({ r, reason: `Close date passed ${-cd}d ago`, sev: 3 });
      else if (nd !== null && nd < 0) out.push({ r, reason: `Next step ${-nd}d overdue`, sev: 2 });
      else if (!r.o.nextStep?.trim()) out.push({ r, reason: "No next step set", sev: 1 });
      else if (touch === null || touch > 30) out.push({ r, reason: touch === null ? "No notes on this account" : `No touch in ${touch}d`, sev: 1 });
    }
    return out.sort((a, b) => b.sev - a.sev || b.r.o.value - a.r.o.value).slice(0, 12);
  }, [m.open, data]);

  const overdue = agenda.filter((a) => (daysFromToday(a.date) ?? 0) < 0).length;
  const activeLeads = leads.filter((l) => ["New", "Working", "Qualified"].includes(l.status)).length;

  return (
    <div className="crm-viz mx-auto max-w-7xl space-y-5 p-8">
      <style>{VIZ_STYLE}</style>
      <PageHeader
        title="Sales CRM"
        subtitle="Pipeline, forecast and what needs attention"
        actions={access.isManager && (
          <FilterSelect label="Salesperson" value={rep} onChange={setRep}>
            <option value="">All salespeople</option>
            {reps.map((r) => <option key={r}>{r}</option>)}
          </FilterSelect>
        )}
      />

      {!data ? <div className="rounded-xl border bg-card"><Empty>Loading…</Empty></div> : (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
            <Kpi label="Open pipeline" value={fmtMoneyShort(m.pipeline)} sub={`${m.open.length} opps · avg ${fmtMoneyShort(m.avgDeal)}`} />
            <Kpi label="Weighted pipeline" value={fmtMoneyShort(m.weighted)} sub="value × probability" />
            <Kpi label={`Commit · ${thisQ.slice(5)}`} value={fmtMoneyShort(m.commitQ)} sub="closing this quarter" />
            <Kpi label={`Won · ${thisQ.slice(5)}`} value={fmtMoneyShort(m.wonQ)} sub={`${m.wonQCount} deal${m.wonQCount === 1 ? "" : "s"}`} tone={m.wonQ ? "good" : undefined} />
            <Kpi label="Win rate (12 mo)" value={m.winRate === null ? "—" : `${m.winRate}%`} sub="won ÷ closed" />
            <Kpi label="Due / overdue" value={<Link href="/sales/agenda" className="hover:underline">{agenda.length}</Link>}
              sub={<>{overdue > 0 ? <span className="text-red-600 dark:text-red-400">{overdue} overdue</span> : "none overdue"} · {activeLeads} active leads</>}
              tone={overdue ? "warn" : undefined} />
          </div>

          <div className="grid gap-5 lg:grid-cols-5">
            <Panel
              className="lg:col-span-3"
              title={`Pipeline by ${DIM_LABEL[dim].toLowerCase()}`}
              actions={
                <FilterSelect label="Break down by" value={dim} onChange={(v) => setDim(v as Dim)}>
                  {(Object.keys(DIM_LABEL) as Dim[]).filter((d) => access.isManager || d !== "owner").map((d) => <option key={d} value={d}>{DIM_LABEL[d]}</option>)}
                </FilterSelect>
              }
            >
              {breakdown.length === 0 ? <Empty>No open pipeline.</Empty> : (
                <>
                  <div className="flex items-center gap-4 px-4 pt-3 text-[11px] text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: "var(--viz-1)" }} />Weighted</span>
                    <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm opacity-30" style={{ background: "var(--viz-1)" }} />Total pipeline</span>
                  </div>
                  <table className="w-full text-sm">
                    <thead className="text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                      <tr>
                        <th className="px-4 py-2 font-medium">{DIM_LABEL[dim]}</th>
                        <th className="px-2 py-2 text-right font-medium">Opps</th>
                        <th className="w-[38%] px-2 py-2 font-medium" />
                        <th className="px-2 py-2 text-right font-medium">Pipeline</th>
                        <th className="px-2 py-2 text-right font-medium">Weighted</th>
                        <th className="px-4 py-2 text-right font-medium">Commit</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {breakdown.slice(0, 15).map((b) => (
                        <tr key={b.key} className="hover:bg-muted/30" title={`${b.key}: ${fmtMoney(b.pipeline)} pipeline, ${fmtMoney(b.weighted)} weighted, ${b.count} opps`}>
                          <td className="max-w-[12rem] truncate px-4 py-2 font-medium">
                            {b.href ? <Link href={b.href} className="hover:underline">{b.key}</Link> : b.key}
                          </td>
                          <td className="px-2 py-2 text-right tabular-nums text-muted-foreground">{b.count}</td>
                          <td className="px-2 py-2">
                            <div className="relative h-3">
                              <div className="absolute inset-y-0 left-0 rounded-r opacity-30" style={{ width: `${(b.pipeline / maxPipe) * 100}%`, background: "var(--viz-1)" }} />
                              <div className="absolute inset-y-0 left-0 rounded-r" style={{ width: `${(b.weighted / maxPipe) * 100}%`, background: "var(--viz-1)" }} />
                            </div>
                          </td>
                          <td className="px-2 py-2 text-right font-medium tabular-nums">{fmtMoneyShort(b.pipeline)}</td>
                          <td className="px-2 py-2 text-right tabular-nums text-muted-foreground">{fmtMoneyShort(b.weighted)}</td>
                          <td className="px-4 py-2 text-right tabular-nums text-muted-foreground">{b.commit ? fmtMoneyShort(b.commit) : "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {breakdown.length > 15 && <p className="px-4 py-2 text-xs text-muted-foreground">+ {breakdown.length - 15} more — see <Link href="/sales/opportunities" className="text-primary hover:underline">Opportunities</Link> grouped by {DIM_LABEL[dim].toLowerCase()}.</p>}
                </>
              )}
            </Panel>

            <Panel className="lg:col-span-2" title="Open pipeline by stage">
              <ul className="space-y-3 px-4 py-4">
                {funnel.map((f) => (
                  <li key={f.stage} title={`${f.stage}: ${f.count} opps, ${fmtMoney(f.value)}`}>
                    <div className="mb-1 flex justify-between text-xs">
                      <span className="font-medium">{f.stage}</span>
                      <span className="tabular-nums text-muted-foreground">{f.count} · {fmtMoneyShort(f.value)}</span>
                    </div>
                    <div className="h-3 rounded-r bg-muted/40">
                      <div className="h-3 rounded-r" style={{ width: `${(f.value / maxFunnel) * 100}%`, background: "var(--viz-1)" }} />
                    </div>
                  </li>
                ))}
              </ul>
            </Panel>
          </div>

          <div className="grid gap-5 lg:grid-cols-5">
            <Panel className="lg:col-span-3" title="Forecast by expected close month">
              <div className="flex flex-wrap gap-4 px-4 pt-3 text-[11px] text-muted-foreground">
                {FORECAST_SERIES.map((s) => (
                  <span key={s.key} className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: s.color }} />{s.label}</span>
                ))}
              </div>
              <div className="flex h-56 items-end gap-3 px-4 pb-2 pt-4">
                {forecast.map((c) => {
                  const total = Object.values(c.byCat).reduce((a, b) => a + b, 0);
                  return (
                    <div key={c.mk} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
                      <div className="text-[11px] font-medium tabular-nums">{total ? fmtMoneyShort(total) : ""}</div>
                      <div
                        className="flex w-full max-w-14 flex-col-reverse gap-[2px]"
                        style={{ height: `${(total / maxMonth) * 100}%` }}
                        title={`${monthLabel(c.mk)}\n${FORECAST_SERIES.map((s) => `${s.label}: ${fmtMoney(c.byCat[s.key])}`).join("\n")}`}
                      >
                        {FORECAST_SERIES.map((s, i) => c.byCat[s.key] > 0 && (
                          <div key={s.key}
                            className={cn(i === FORECAST_SERIES.length - 1 || FORECAST_SERIES.slice(i + 1).every((n) => !c.byCat[n.key]) ? "rounded-t" : "")}
                            style={{ flexGrow: c.byCat[s.key], flexBasis: 0, minHeight: 2, background: s.color }} />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex gap-3 border-t px-4 py-2">
                {forecast.map((c) => <div key={c.mk} className="flex-1 text-center text-[11px] text-muted-foreground">{monthLabel(c.mk)}</div>)}
              </div>
              <details className="border-t px-4 py-2 text-xs">
                <summary className="cursor-pointer text-muted-foreground hover:text-foreground">View as table</summary>
                <table className="mt-2 w-full tabular-nums">
                  <thead className="text-left text-muted-foreground">
                    <tr><th className="py-1 font-medium">Month</th>{FORECAST_SERIES.map((s) => <th key={s.key} className="py-1 text-right font-medium">{s.label}</th>)}</tr>
                  </thead>
                  <tbody>
                    {forecast.map((c) => (
                      <tr key={c.mk} className="border-t">
                        <td className="py-1">{monthLabel(c.mk)}</td>
                        {FORECAST_SERIES.map((s) => <td key={s.key} className="py-1 text-right">{c.byCat[s.key] ? fmtMoney(c.byCat[s.key]) : "—"}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </details>
            </Panel>

            <Panel className="lg:col-span-2" title={`Needs attention (${attention.length})`}>
              {attention.length === 0 ? <Empty>Every open deal has a current next step. 👍</Empty> : (
                <ul className="divide-y">
                  {attention.map(({ r, reason, sev }) => (
                    <li key={r.o.id} className="flex items-start justify-between gap-3 px-4 py-2">
                      <div className="min-w-0">
                        <Link href={`/sales/accounts/${r.c.id}?opp=${r.o.id}`} className="block truncate text-sm font-medium hover:underline">{r.o.name}</Link>
                        <div className="truncate text-xs text-muted-foreground">{r.c.name} · {r.o.ownerName || "Unassigned"} · {fmtMoneyShort(r.o.value)}</div>
                      </div>
                      <span className={cn("shrink-0 text-xs", sev >= 2 ? "font-medium text-red-600 dark:text-red-400" : "text-amber-600 dark:text-amber-400")}>{reason}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </div>

          <Panel title="Due in the next 14 days" actions={<Link href="/sales/agenda" className="text-xs text-primary hover:underline">Full agenda →</Link>}>
            {agenda.length === 0 ? <Empty>Nothing due.</Empty> : (
              <ul className="divide-y">
                {agenda.slice(0, 8).map((a) => (
                  <li key={a.id} className="flex items-center justify-between gap-3 px-4 py-2 text-sm">
                    <div className="min-w-0">
                      <span className="font-medium">{a.title}</span>
                      <span className="text-xs text-muted-foreground"> · {a.companyName}{a.opportunityName ? ` · ${a.opportunityName}` : ""} · {a.ownerName}</span>
                    </div>
                    <DueChip iso={a.date} />
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </>
      )}
    </div>
  );
}
