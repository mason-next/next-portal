"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Download, Pencil, Plus } from "lucide-react";
import { Modal } from "@/components/shared/Modal";
import { getCrmAccounts } from "@/lib/data/crm";
import { upsertSalesOpportunity, deleteSalesOpportunity, updateOpportunityStage } from "@/lib/data/sales-activity";
import type { SalesCompany, SalesOpportunity, OppStage } from "@/types/sales";
import { OPP_STAGES, isOpenStage, effectiveProbability, weightedValue, effectiveForecastCategory } from "@/types/sales";
import { useCrmAccess } from "@/modules/crm/hooks/useCrmAccess";
import { fmtMoney, fmtMoneyShort, fmtDate, daysFromToday, daysSince, quarterKey } from "@/modules/crm/lib/format";
import {
  PageHeader, FilterSelect, SearchInput, StageBadge, DueChip, PrimaryButton, SecondaryButton, Empty, STAGE_COLORS,
} from "@/modules/crm/components/ui";
import { OpportunityEditor } from "@/modules/crm/components/OpportunityEditor";
import { OpportunityDrawer } from "@/modules/crm/components/OpportunityDrawer";
import { usePersistentFilter } from "@/lib/storage/use-persistent-filter";
import { cn } from "@/lib/utils";

interface Row {
  o: SalesOpportunity;
  c: SalesCompany;
  weighted: number;
  prob: number;
  nextOwner: string;
  attention: string[];
}

type SortKey = "name" | "account" | "owner" | "stage" | "value" | "weighted" | "close" | "nextDate" | "age";
type GroupKey = "" | "owner" | "account" | "stage" | "territory" | "vertical" | "forecast" | "quarter";

const GROUP_LABELS: Record<Exclude<GroupKey, "">, string> = {
  owner: "Salesperson", account: "Account", stage: "Stage", territory: "Territory",
  vertical: "Vertical", forecast: "Forecast category", quarter: "Close quarter",
};

function attentionFlags(o: SalesOpportunity): string[] {
  if (!isOpenStage(o.stage)) return [];
  const flags: string[] = [];
  if (!o.nextStep?.trim()) flags.push("No next step");
  else if ((daysFromToday(o.nextStepDate) ?? 0) < 0) flags.push("Next step overdue");
  if ((daysFromToday(o.closeDate) ?? 0) < 0) flags.push("Close date passed");
  if (!o.closeDate) flags.push("No close date");
  return flags;
}

function csvCell(v: unknown): string {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export default function OpportunitiesPage() {
  const access = useCrmAccess();
  const [companies, setCompanies] = useState<SalesCompany[] | null>(null);
  const [q, setQ] = useState("");
  const [status, setStatus] = usePersistentFilter("crm.opps.status", "open");
  const [owner, setOwner] = usePersistentFilter("crm.opps.owner", "");
  const [stage, setStage] = usePersistentFilter("crm.opps.stage", "");
  const [territory, setTerritory] = usePersistentFilter("crm.opps.territory", "");
  const [vertical, setVertical] = usePersistentFilter("crm.opps.vertical", "");
  const [period, setPeriod] = usePersistentFilter("crm.opps.period", "");
  const [groupBy, setGroupBy] = usePersistentFilter<GroupKey>("crm.opps.group", "");
  const [attentionOnly, setAttentionOnly] = useState(false);
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "close", dir: 1 });
  const [editing, setEditing] = useState<{ opp?: SalesOpportunity } | null>(null);
  const [drawerOppId, setDrawerOppId] = useState<string | null>(null);

  const reload = useCallback(() => getCrmAccounts().then((d) => setCompanies(d.companies)), []);
  useEffect(() => { reload(); }, [reload]);

  const rows: Row[] = useMemo(() => (companies ?? []).flatMap((c) =>
    (c.opportunities ?? []).map((o) => ({
      o, c,
      weighted: weightedValue(o),
      prob: effectiveProbability(o),
      nextOwner: o.nextStepOwnerName || o.ownerName,
      attention: attentionFlags(o),
    })),
  ), [companies]);

  const uniq = (xs: (string | undefined)[]) => Array.from(new Set(xs.filter((x): x is string => !!x?.trim()))).sort();
  const owners = uniq(rows.flatMap((r) => [r.o.ownerName, r.o.nextStepOwnerName]));
  const territories = uniq(rows.map((r) => r.c.territory));
  const verticals = uniq(rows.map((r) => r.c.vertical));

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const now = new Date().toISOString().slice(0, 10);
    const thisQ = quarterKey(now);
    const nextQDate = new Date(); nextQDate.setMonth(nextQDate.getMonth() + 3);
    const nextQ = quarterKey(nextQDate.toISOString());
    const out = rows.filter(({ o, c, nextOwner, attention }) => {
      if (status === "open" && !isOpenStage(o.stage)) return false;
      if (status === "won" && o.stage !== "Closed Won") return false;
      if (status === "lost" && o.stage !== "Closed Lost") return false;
      if (owner && o.ownerName !== owner && nextOwner !== owner) return false;
      if (stage && o.stage !== stage) return false;
      if (territory && c.territory !== territory) return false;
      if (vertical && c.vertical !== vertical) return false;
      if (period) {
        const cd = o.closeDate?.slice(0, 10);
        if (period === "overdue" && !(cd && cd < now)) return false;
        if (period === "month" && !(cd && cd.slice(0, 7) === now.slice(0, 7))) return false;
        if (period === "quarter" && !(cd && quarterKey(cd) === thisQ)) return false;
        if (period === "nextQuarter" && !(cd && quarterKey(cd) === nextQ)) return false;
        if (period === "none" && cd) return false;
      }
      if (attentionOnly && attention.length === 0) return false;
      if (needle && ![o.name, c.name, o.ownerName, o.nextStep, o.cwNumber].join(" ").toLowerCase().includes(needle)) return false;
      return true;
    });
    const val = (r: Row): string | number => {
      switch (sort.key) {
        case "name": return r.o.name.toLowerCase();
        case "account": return r.c.name.toLowerCase();
        case "owner": return r.o.ownerName.toLowerCase();
        case "stage": return OPP_STAGES.indexOf(r.o.stage);
        case "value": return r.o.value;
        case "weighted": return r.weighted;
        case "close": return r.o.closeDate ?? "9999";
        case "nextDate": return r.o.nextStepDate ?? "9999";
        case "age": return r.o.stageChangedAt ?? r.o.createdAt;
      }
    };
    return out.sort((a, b) => { const va = val(a), vb = val(b); return (va < vb ? -1 : va > vb ? 1 : 0) * sort.dir; });
  }, [rows, q, status, owner, stage, territory, vertical, period, attentionOnly, sort]);

  const groups = useMemo(() => {
    if (!groupBy) return [{ key: "", rows: filtered }];
    const keyOf = (r: Row): string => {
      switch (groupBy) {
        case "owner": return r.o.ownerName || "Unassigned";
        case "account": return r.c.name;
        case "stage": return r.o.stage;
        case "territory": return r.c.territory || "No territory";
        case "vertical": return r.c.vertical || "No vertical";
        case "forecast": return effectiveForecastCategory(r.o);
        case "quarter": return r.o.closeDate ? quarterKey(r.o.closeDate) : "No close date";
      }
    };
    const map = new Map<string, Row[]>();
    for (const r of filtered) map.set(keyOf(r), [...(map.get(keyOf(r)) ?? []), r]);
    return Array.from(map, ([key, rs]) => ({ key, rows: rs }))
      .sort((a, b) => b.rows.reduce((s, r) => s + r.o.value, 0) - a.rows.reduce((s, r) => s + r.o.value, 0));
  }, [filtered, groupBy]);

  const totals = filtered.reduce((t, r) => ({ value: t.value + r.o.value, weighted: t.weighted + r.weighted }), { value: 0, weighted: 0 });

  const canEditOpp = (o: SalesOpportunity) => access.canEdit && (access.isManager || o.ownerName === access.userName || o.ownerId === access.userId);

  function exportCsv() {
    const head = ["Opportunity", "Account", "Owner", "Stage", "Value", "Probability", "Weighted", "Forecast", "Close date", "Next step", "Next step date", "Next step owner", "Territory", "Vertical", "Lead source", "CW#"];
    const lines = filtered.map(({ o, c, prob, weighted, nextOwner }) => [
      o.name, c.name, o.ownerName, o.stage, (o.value / 100).toFixed(2), prob, (weighted / 100).toFixed(2), effectiveForecastCategory(o),
      o.closeDate?.slice(0, 10) ?? "", o.nextStep ?? "", o.nextStepDate?.slice(0, 10) ?? "", nextOwner, c.territory ?? "", c.vertical ?? "", o.leadSource ?? "", o.cwNumber ?? "",
    ].map(csvCell).join(","));
    const blob = new Blob([[head.join(","), ...lines].join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `opportunities-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function th(label: string, key: SortKey, className?: string) {
    return (
      <th className={cn("px-2 py-2 font-medium", className)}>
        <button type="button" className="inline-flex items-center gap-0.5 uppercase tracking-wide hover:text-foreground"
          onClick={() => setSort((s) => ({ key, dir: s.key === key ? (s.dir === 1 ? -1 : 1) : (key === "value" || key === "weighted" ? -1 : 1) }))}>
          {label}{sort.key === key && (sort.dir === 1 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
        </button>
      </th>
    );
  }

  return (
    <div className="mx-auto max-w-[90rem] space-y-5 p-8">
      <PageHeader
        title="Opportunities"
        subtitle="Every deal — stage, value, probability, close date and who owns the next action"
        actions={
          <>
            <SecondaryButton onClick={exportCsv} disabled={filtered.length === 0}><Download className="h-3.5 w-3.5" />CSV</SecondaryButton>
            {access.canEdit && (companies?.length ?? 0) > 0 && (
              <PrimaryButton onClick={() => setEditing({})}><Plus className="h-3.5 w-3.5" />Opportunity</PrimaryButton>
            )}
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <SearchInput value={q} onChange={setQ} placeholder="Search deals, accounts, next steps…" />
        <FilterSelect label="Status" value={status} onChange={setStatus}>
          <option value="open">Open</option>
          <option value="won">Closed Won</option>
          <option value="lost">Closed Lost</option>
          <option value="all">All</option>
        </FilterSelect>
        {access.isManager && (
          <FilterSelect label="Salesperson" value={owner} onChange={setOwner}>
            <option value="">All salespeople</option>
            {owners.map((o) => <option key={o}>{o}</option>)}
          </FilterSelect>
        )}
        <FilterSelect label="Stage" value={stage} onChange={setStage}>
          <option value="">All stages</option>
          {OPP_STAGES.map((s) => <option key={s}>{s}</option>)}
        </FilterSelect>
        <FilterSelect label="Territory" value={territory} onChange={setTerritory}>
          <option value="">All territories</option>
          {territories.map((t) => <option key={t}>{t}</option>)}
        </FilterSelect>
        <FilterSelect label="Vertical" value={vertical} onChange={setVertical}>
          <option value="">All verticals</option>
          {verticals.map((v) => <option key={v}>{v}</option>)}
        </FilterSelect>
        <FilterSelect label="Close period" value={period} onChange={setPeriod}>
          <option value="">Any close date</option>
          <option value="overdue">Close date passed</option>
          <option value="month">Closing this month</option>
          <option value="quarter">Closing this quarter</option>
          <option value="nextQuarter">Closing next quarter</option>
          <option value="none">No close date</option>
        </FilterSelect>
        <label className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <input type="checkbox" checked={attentionOnly} onChange={(e) => setAttentionOnly(e.target.checked)} />
          Needs attention
        </label>
        <span className="mx-1 h-5 w-px bg-border" />
        <FilterSelect label="Group by" value={groupBy} onChange={(v) => setGroupBy(v as GroupKey)}>
          <option value="">No grouping</option>
          {Object.entries(GROUP_LABELS).map(([k, l]) => <option key={k} value={k}>Group: {l}</option>)}
        </FilterSelect>
      </div>

      <div className="text-xs text-muted-foreground">
        {filtered.length} opportunities · <span className="font-medium text-foreground">{fmtMoney(totals.value)}</span> total · {fmtMoney(totals.weighted)} weighted
      </div>

      <div className="overflow-x-auto rounded-xl border bg-card">
        {!companies ? <Empty>Loading…</Empty> : filtered.length === 0 ? <Empty>No opportunities match these filters.</Empty> : (
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-[11px] uppercase tracking-wide text-muted-foreground">
              <tr>
                {th("Opportunity", "name", "pl-4")}
                {th("Account", "account")}
                {th("Owner", "owner")}
                {th("Stage", "stage")}
                {th("Value", "value", "text-right")}
                <th className="px-2 py-2 text-right font-medium">Prob.</th>
                {th("Weighted", "weighted", "text-right")}
                {th("Close", "close")}
                {th("Next action", "nextDate")}
                {th("In stage", "age")}
                <th className="px-2 py-2" />
              </tr>
            </thead>
            <tbody>
              {groups.map((g) => {
                const gv = g.rows.reduce((s, r) => s + r.o.value, 0);
                const gw = g.rows.reduce((s, r) => s + r.weighted, 0);
                return [
                  groupBy && (
                    <tr key={`g_${g.key}`} className="border-t bg-muted/30">
                      <td colSpan={4} className="px-4 py-1.5 text-xs font-semibold">{g.key} <span className="font-normal text-muted-foreground">· {g.rows.length}</span></td>
                      <td className="px-2 py-1.5 text-right text-xs font-semibold tabular-nums">{fmtMoneyShort(gv)}</td>
                      <td />
                      <td className="px-2 py-1.5 text-right text-xs tabular-nums text-muted-foreground">{fmtMoneyShort(gw)}</td>
                      <td colSpan={4} />
                    </tr>
                  ),
                  ...g.rows.map(({ o, c, prob, weighted, nextOwner, attention }) => {
                    const inStage = daysSince(o.stageChangedAt ?? o.createdAt);
                    return (
                      <tr
                        key={o.id}
                        onClick={(e) => {
                          if ((e.target as HTMLElement).closest("button, a, select, input")) return;
                          setDrawerOppId(o.id);
                        }}
                        className={cn("cursor-pointer border-t align-top hover:bg-muted/20", drawerOppId === o.id && "bg-primary/5")}
                      >
                        <td className="py-2 pl-4 pr-2">
                          <button type="button" onClick={() => setDrawerOppId(o.id)} className="text-left font-medium hover:underline">{o.name}</button>
                          {attention.length > 0 && (
                            <div className="mt-0.5 flex flex-wrap gap-1">
                              {attention.map((a) => <span key={a} className="rounded bg-amber-100 px-1 py-px text-[10px] font-medium text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">{a}</span>)}
                            </div>
                          )}
                        </td>
                        <td className="px-2 py-2 text-xs"><Link href={`/sales/accounts/${c.id}`} className="hover:underline">{c.name}</Link></td>
                        <td className="px-2 py-2 text-xs whitespace-nowrap">{o.ownerName || "—"}</td>
                        <td className="px-2 py-2">
                          {canEditOpp(o) ? (
                            <select aria-label={`Stage for ${o.name}`} value={o.stage}
                              onChange={async (e) => { await updateOpportunityStage(o.id, e.target.value as OppStage); reload(); }}
                              className={cn("rounded-full border-0 px-2 py-0.5 text-[11px] font-medium focus:ring-2 focus:ring-ring", STAGE_COLORS[o.stage])}>
                              {OPP_STAGES.map((s) => <option key={s}>{s}</option>)}
                            </select>
                          ) : <StageBadge stage={o.stage} />}
                        </td>
                        <td className="px-2 py-2 text-right tabular-nums">{fmtMoney(o.value)}</td>
                        <td className="px-2 py-2 text-right tabular-nums text-muted-foreground">{prob}%</td>
                        <td className="px-2 py-2 text-right tabular-nums text-muted-foreground">{fmtMoney(weighted)}</td>
                        <td className="px-2 py-2 text-xs whitespace-nowrap">
                          {isOpenStage(o.stage) ? <DueChip iso={o.closeDate} /> : fmtDate(o.closeDate)}
                        </td>
                        <td className="max-w-[18rem] px-2 py-2">
                          {o.nextStep ? (
                            <>
                              <div className="truncate text-xs" title={o.nextStep}>{o.nextStep}</div>
                              <div className="flex gap-1 text-[11px] text-muted-foreground">
                                <DueChip iso={o.nextStepDate} className="text-[11px]" /><span>· {nextOwner}</span>
                              </div>
                            </>
                          ) : <span className="text-xs text-muted-foreground">—</span>}
                        </td>
                        <td className="px-2 py-2 text-xs text-muted-foreground whitespace-nowrap">{isOpenStage(o.stage) && inStage !== null ? `${inStage}d` : "—"}</td>
                        <td className="px-2 py-2 text-right">
                          {canEditOpp(o) && (
                            <button type="button" title="Edit" onClick={() => setEditing({ opp: o })} className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground">
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  }),
                ];
              })}
            </tbody>
          </table>
        )}
      </div>

      <OpportunityDrawer opportunityId={drawerOppId} onClose={() => setDrawerOppId(null)} onChanged={reload} />

      <Modal open={!!editing} onClose={() => setEditing(null)} className="max-w-xl max-h-[92vh] overflow-y-auto">
        {editing && companies && (
          <OpportunityEditor
            initial={editing.opp}
            companies={[...companies].sort((a, b) => a.name.localeCompare(b.name))}
            canAssignOwner={access.isManager}
            currentUser={access.userName}
            onSave={async (d) => { await upsertSalesOpportunity(d); setEditing(null); reload(); }}
            onDelete={editing.opp ? async () => { await deleteSalesOpportunity(editing.opp!.id); setEditing(null); reload(); } : undefined}
            onCancel={() => setEditing(null)}
          />
        )}
      </Modal>
    </div>
  );
}
