"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Plus } from "lucide-react";
import { Modal } from "@/components/shared/Modal";
import { getCrmAccounts, type AccountRollup } from "@/lib/data/crm";
import { upsertSalesCompany } from "@/lib/data/sales-activity";
import type { SalesCompany } from "@/types/sales";
import { ACCOUNT_STATUSES, isOpenStage, weightedValue } from "@/types/sales";
import { useCrmAccess } from "@/modules/crm/hooks/useCrmAccess";
import { fmtMoneyShort, daysSince } from "@/modules/crm/lib/format";
import {
  PageHeader, FilterSelect, SearchInput, StatusBadge, DueChip, CompanyLogo, PrimaryButton, Empty,
} from "@/modules/crm/components/ui";
import { AccountForm } from "@/modules/crm/components/AccountForm";
import { usePersistentFilter } from "@/lib/storage/use-persistent-filter";
import { cn } from "@/lib/utils";

interface Row {
  c: SalesCompany;
  r: AccountRollup;
  openCount: number;
  pipeline: number;
  weighted: number;
  won: number;
}

type SortKey = "name" | "owner" | "pipeline" | "weighted" | "lastTouch" | "nextDate";

export default function AccountsPage() {
  const router = useRouter();
  const access = useCrmAccess();
  const [data, setData] = useState<{ companies: SalesCompany[]; rollups: Record<string, AccountRollup> } | null>(null);
  const [q, setQ] = useState("");
  const [owner, setOwner] = usePersistentFilter("crm.accounts.owner", "");
  const [status, setStatus] = usePersistentFilter("crm.accounts.status", "");
  const [territory, setTerritory] = usePersistentFilter("crm.accounts.territory", "");
  const [vertical, setVertical] = usePersistentFilter("crm.accounts.vertical", "");
  const [pipelineOnly, setPipelineOnly] = useState(false);
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "pipeline", dir: -1 });
  const [creating, setCreating] = useState(false);

  useEffect(() => { getCrmAccounts().then(setData); }, []);

  const rows: Row[] = useMemo(() => (data?.companies ?? []).map((c) => {
    const opps = c.opportunities ?? [];
    const open = opps.filter((o) => isOpenStage(o.stage));
    return {
      c,
      r: data!.rollups[c.id] ?? { lastTouch: null, nextDate: null, openTasks: 0, overdueTasks: 0, noteCount: 0 },
      openCount: open.length,
      pipeline: open.reduce((s, o) => s + o.value, 0),
      weighted: open.reduce((s, o) => s + weightedValue(o), 0),
      won: opps.filter((o) => o.stage === "Closed Won").reduce((s, o) => s + o.value, 0),
    };
  }), [data]);

  const uniq = (xs: (string | undefined)[]) => Array.from(new Set(xs.filter((x): x is string => !!x?.trim()))).sort();
  const owners = uniq(rows.map((r) => r.c.ownerName));
  const territories = uniq(rows.map((r) => r.c.territory));
  const verticals = uniq(rows.map((r) => r.c.vertical));

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const out = rows.filter(({ c, openCount }) => {
      if (owner === "__none" ? !!c.ownerName : owner && c.ownerName !== owner) return false;
      if (status && c.accountStatus !== status) return false;
      if (territory && c.territory !== territory) return false;
      if (vertical && c.vertical !== vertical) return false;
      if (pipelineOnly && openCount === 0) return false;
      if (needle) {
        const hay = [c.name, c.domain, c.ownerName, c.territory, c.vertical, ...(c.opportunities ?? []).map((o) => o.name)].join(" ").toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });
    const val = (r: Row): string | number => {
      switch (sort.key) {
        case "name": return r.c.name.toLowerCase();
        case "owner": return (r.c.ownerName || "~").toLowerCase();
        case "pipeline": return r.pipeline;
        case "weighted": return r.weighted;
        case "lastTouch": return r.r.lastTouch ?? "";
        case "nextDate": return r.r.nextDate ?? "9999";
      }
    };
    return out.sort((a, b) => {
      const va = val(a), vb = val(b);
      return (va < vb ? -1 : va > vb ? 1 : 0) * sort.dir;
    });
  }, [rows, q, owner, status, territory, vertical, pipelineOnly, sort]);

  const totals = filtered.reduce(
    (t, r) => ({ pipeline: t.pipeline + r.pipeline, weighted: t.weighted + r.weighted, opps: t.opps + r.openCount, overdue: t.overdue + r.r.overdueTasks }),
    { pipeline: 0, weighted: 0, opps: 0, overdue: 0 },
  );

  function header(label: string, key: SortKey, className?: string) {
    const active = sort.key === key;
    return (
      <th className={cn("px-3 py-2 font-medium", className)}>
        <button type="button" className="inline-flex items-center gap-0.5 uppercase tracking-wide hover:text-foreground"
          onClick={() => setSort((s) => ({ key, dir: s.key === key ? (s.dir === 1 ? -1 : 1) : key === "name" || key === "owner" || key === "nextDate" ? 1 : -1 }))}>
          {label}{active && (sort.dir === 1 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
        </button>
      </th>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-5 p-8">
      <PageHeader
        title="Accounts"
        subtitle="Every company at a glance — owner, pipeline, last touch and what's next"
        actions={access.canEdit && <PrimaryButton onClick={() => setCreating(true)}><Plus className="h-3.5 w-3.5" />Account</PrimaryButton>}
      />

      <div className="flex flex-wrap items-center gap-2">
        <SearchInput value={q} onChange={setQ} placeholder="Search accounts, domains, opps…" />
        {access.isManager && (
          <FilterSelect label="Owner" value={owner} onChange={setOwner}>
            <option value="">All owners</option>
            <option value="__none">Unassigned</option>
            {owners.map((o) => <option key={o}>{o}</option>)}
          </FilterSelect>
        )}
        <FilterSelect label="Status" value={status} onChange={setStatus}>
          <option value="">All statuses</option>
          {ACCOUNT_STATUSES.map((s) => <option key={s}>{s}</option>)}
        </FilterSelect>
        <FilterSelect label="Territory" value={territory} onChange={setTerritory}>
          <option value="">All territories</option>
          {territories.map((t) => <option key={t}>{t}</option>)}
        </FilterSelect>
        <FilterSelect label="Vertical" value={vertical} onChange={setVertical}>
          <option value="">All verticals</option>
          {verticals.map((v) => <option key={v}>{v}</option>)}
        </FilterSelect>
        <label className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <input type="checkbox" checked={pipelineOnly} onChange={(e) => setPipelineOnly(e.target.checked)} />
          Has open pipeline
        </label>
        <div className="ml-auto text-xs text-muted-foreground">
          {filtered.length} accounts · {totals.opps} open opps · <span className="font-medium text-foreground">{fmtMoneyShort(totals.pipeline)}</span> pipeline · {fmtMoneyShort(totals.weighted)} weighted
          {totals.overdue > 0 && <span className="text-red-600 dark:text-red-400"> · {totals.overdue} overdue tasks</span>}
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border bg-card">
        {!data ? <Empty>Loading…</Empty> : filtered.length === 0 ? <Empty>No accounts match these filters.</Empty> : (
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-[11px] uppercase tracking-wide text-muted-foreground">
              <tr>
                {header("Account", "name", "pl-4")}
                {header("Owner", "owner")}
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Territory / Vertical</th>
                <th className="px-3 py-2 text-right font-medium">Open</th>
                {header("Pipeline", "pipeline", "text-right")}
                {header("Weighted", "weighted", "text-right")}
                {header("Last touch", "lastTouch")}
                {header("Next date", "nextDate")}
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map(({ c, r, openCount, pipeline, weighted }) => {
                const since = daysSince(r.lastTouch);
                return (
                  <tr key={c.id} className="cursor-pointer hover:bg-muted/30" onClick={() => router.push(`/sales/accounts/${c.id}`)}>
                    <td className="py-2.5 pl-4 pr-3">
                      <Link href={`/sales/accounts/${c.id}`} className="flex items-center gap-2.5" onClick={(e) => e.stopPropagation()}>
                        <CompanyLogo name={c.name} domain={c.domain} />
                        <div className="min-w-0">
                          <div className="truncate font-medium hover:underline">{c.name}</div>
                          {c.domain && <div className="truncate text-xs text-muted-foreground">{c.domain}</div>}
                        </div>
                      </Link>
                    </td>
                    <td className="px-3 py-2.5 text-xs">{c.ownerName || <span className="text-muted-foreground">Unassigned</span>}</td>
                    <td className="px-3 py-2.5"><StatusBadge status={c.accountStatus ?? "Prospect"} /></td>
                    <td className="px-3 py-2.5 text-xs text-muted-foreground">{[c.territory, c.vertical].filter(Boolean).join(" · ") || "—"}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{openCount || "—"}</td>
                    <td className="px-3 py-2.5 text-right font-medium tabular-nums">{pipeline ? fmtMoneyShort(pipeline) : "—"}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-muted-foreground">{weighted ? fmtMoneyShort(weighted) : "—"}</td>
                    <td className={cn("px-3 py-2.5 text-xs whitespace-nowrap", since === null ? "text-muted-foreground" : since > 30 ? "text-amber-600 dark:text-amber-400" : "")}>
                      {since === null ? "Never" : since === 0 ? "Today" : `${since}d ago`}
                    </td>
                    <td className="px-3 py-2.5">
                      <DueChip iso={r.nextDate} />
                      {r.overdueTasks > 0 && <div className="text-[11px] text-red-600 dark:text-red-400">{r.overdueTasks} overdue</div>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <Modal open={creating} onClose={() => setCreating(false)} className="max-w-xl">
        {creating && (
          <AccountForm
            canAssignOwner={access.isManager}
            currentUser={access.userName}
            territories={territories}
            verticals={verticals}
            onSave={async (d) => {
              const c = await upsertSalesCompany(d);
              const mine = access.isManager || !c.ownerName || c.ownerName === access.userName || data?.companies.some((x) => x.id === c.id);
              if (!mine) {
                // The server reused an existing account that belongs to another rep.
                throw new Error(`"${c.name}" already exists and is owned by ${c.ownerName}. Ask them or a manager to add you, or log a deal on it from an import.`);
              }
              router.push(`/sales/accounts/${c.id}`);
            }}
            onCancel={() => setCreating(false)}
          />
        )}
      </Modal>
    </div>
  );
}
