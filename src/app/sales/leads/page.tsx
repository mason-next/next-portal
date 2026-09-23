"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { Modal } from "@/components/shared/Modal";
import { getLeads, upsertLead, deleteLead, convertLead, getCrmAccounts } from "@/lib/data/crm";
import type { SalesLead } from "@/types/sales";
import { LEAD_STATUSES } from "@/types/sales";
import { useCrmAccess } from "@/modules/crm/hooks/useCrmAccess";
import { fmtMoneyShort, fmtDate } from "@/modules/crm/lib/format";
import {
  PageHeader, FilterSelect, SearchInput, StatusBadge, PrimaryButton, SecondaryButton, Empty, Field, TextInput,
} from "@/modules/crm/components/ui";
import { LeadForm } from "@/modules/crm/components/LeadForm";

export default function LeadsPage() {
  const router = useRouter();
  const access = useCrmAccess();
  const [leads, setLeads] = useState<SalesLead[] | null>(null);
  const [lookups, setLookups] = useState<{ territories: string[]; verticals: string[] }>({ territories: [], verticals: [] });
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("active");
  const [owner, setOwner] = useState("");
  const [editing, setEditing] = useState<{ lead?: SalesLead } | null>(null);
  const [converting, setConverting] = useState<SalesLead | null>(null);
  const [oppName, setOppName] = useState("");
  const [createOpp, setCreateOpp] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(() => getLeads().then(setLeads), []);
  useEffect(() => {
    reload();
    getCrmAccounts().then(({ companies }) => {
      const uniq = (xs: (string | undefined)[]) => Array.from(new Set(xs.filter((x): x is string => !!x?.trim()))).sort();
      setLookups({ territories: uniq(companies.map((c) => c.territory)), verticals: uniq(companies.map((c) => c.vertical)) });
    }).catch(() => {});
  }, [reload]);

  const owners = Array.from(new Set((leads ?? []).map((l) => l.ownerName).filter(Boolean))).sort();
  const filtered = useMemo(() => (leads ?? []).filter((l) => {
    if (status === "active" && (l.status === "Converted" || l.status === "Disqualified")) return false;
    if (status !== "active" && status !== "all" && l.status !== status) return false;
    if (owner === "__pool" ? !!l.ownerName : owner && l.ownerName !== owner) return false;
    const needle = q.trim().toLowerCase();
    if (needle && ![l.name, l.companyName, l.email, l.source, l.territory, l.vertical].join(" ").toLowerCase().includes(needle)) return false;
    return true;
  }), [leads, status, owner, q]);

  const counts = LEAD_STATUSES.map((s) => ({ s, n: (leads ?? []).filter((l) => l.status === s).length }));
  const canTouch = (l: SalesLead) => access.canEdit && l.status !== "Converted" && (access.isManager || !l.ownerName || l.ownerName === access.userName);

  async function doConvert() {
    if (!converting) return;
    setError(null);
    try {
      const res = await convertLead(converting.id, { createOpportunity: createOpp, opportunityName: oppName });
      router.push(`/sales/accounts/${res.companyId}${res.opportunityId ? `?opp=${res.opportunityId}` : ""}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Conversion failed");
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-5 px-4 py-5 sm:p-8">
      <PageHeader
        title="Leads"
        subtitle="Unqualified interest — work it, qualify it, then convert it into an account and opportunity"
        actions={access.canEdit && <PrimaryButton onClick={() => setEditing({})}><Plus className="h-3.5 w-3.5" />Lead</PrimaryButton>}
      />

      <div className="flex flex-wrap gap-2">
        {counts.map(({ s, n }) => (
          <button key={s} type="button" onClick={() => setStatus(s)}
            className={`rounded-lg border px-3 py-1.5 text-left transition-colors ${status === s ? "border-primary bg-primary/5" : "bg-card hover:bg-muted/40"}`}>
            <div className="text-[11px] text-muted-foreground">{s}</div>
            <div className="text-lg font-bold tabular-nums">{n}</div>
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <SearchInput value={q} onChange={setQ} placeholder="Search leads…" />
        <FilterSelect label="Status" value={status} onChange={setStatus}>
          <option value="active">Active (New / Working / Qualified)</option>
          <option value="all">All</option>
          {LEAD_STATUSES.map((s) => <option key={s}>{s}</option>)}
        </FilterSelect>
        <FilterSelect label="Owner" value={owner} onChange={setOwner}>
          <option value="">All owners</option>
          <option value="__pool">Unassigned pool</option>
          {owners.map((o) => <option key={o}>{o}</option>)}
        </FilterSelect>
      </div>

      <div className="overflow-x-auto rounded-xl border bg-card">
        {!leads ? <Empty>Loading…</Empty> : filtered.length === 0 ? <Empty>No leads here. Add one to start qualifying.</Empty> : (
          <>
          <ul className="divide-y md:hidden">
            {filtered.map((l) => (
              <li key={l.id} className="px-4 py-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-medium">{l.companyName || l.name || "—"}</div>
                    <div className="truncate text-xs text-muted-foreground">{[l.companyName ? l.name : "", l.title, l.source].filter(Boolean).join(" · ") || "—"}</div>
                  </div>
                  <StatusBadge status={l.status} />
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  {l.status === "Converted" && l.convertedCompanyId ? (
                    <button type="button" className="text-xs text-primary" onClick={() => router.push(`/sales/accounts/${l.convertedCompanyId}`)}>Open account →</button>
                  ) : canTouch(l) ? (
                    <>
                      {!l.ownerName && !access.isManager && (
                        <SecondaryButton className="h-8 px-2.5 text-xs" onClick={async () => { await upsertLead({ ...l, ownerName: access.userName }); reload(); }}>Claim</SecondaryButton>
                      )}
                      <SecondaryButton className="h-8 px-2.5 text-xs" onClick={() => setEditing({ lead: l })}>Edit</SecondaryButton>
                      {l.status !== "Disqualified" && (
                        <PrimaryButton className="h-8 px-2.5 text-xs" onClick={() => { setConverting(l); setOppName(`${l.companyName || l.name} — New Opportunity`); setCreateOpp(true); setError(null); }}>Convert</PrimaryButton>
                      )}
                    </>
                  ) : null}
                  <span className="ml-auto text-xs text-muted-foreground">{l.estimatedValue ? fmtMoneyShort(l.estimatedValue) : ""}</span>
                </div>
              </li>
            ))}
          </ul>
          <table className="hidden w-full text-sm md:table">
            <thead className="bg-muted/40 text-left text-[11px] uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="py-2 pl-4 pr-2 font-medium">Lead</th>
                <th className="px-2 py-2 font-medium">Company</th>
                <th className="px-2 py-2 font-medium">Status</th>
                <th className="px-2 py-2 font-medium">Owner</th>
                <th className="px-2 py-2 font-medium">Source</th>
                <th className="px-2 py-2 font-medium">Territory / Vertical</th>
                <th className="px-2 py-2 text-right font-medium">Est. value</th>
                <th className="px-2 py-2 font-medium">Added</th>
                <th className="px-2 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map((l) => (
                <tr key={l.id} className="align-top hover:bg-muted/20">
                  <td className="py-2 pl-4 pr-2">
                    <div className="font-medium">{l.name || "—"}</div>
                    <div className="text-xs text-muted-foreground">{[l.title, l.email, l.phone].filter(Boolean).join(" · ")}</div>
                  </td>
                  <td className="px-2 py-2">{l.companyName || "—"}</td>
                  <td className="px-2 py-2"><StatusBadge status={l.status} /></td>
                  <td className="px-2 py-2 text-xs">{l.ownerName || <span className="text-muted-foreground">Pool</span>}</td>
                  <td className="px-2 py-2 text-xs">{l.source || "—"}</td>
                  <td className="px-2 py-2 text-xs text-muted-foreground">{[l.territory, l.vertical].filter(Boolean).join(" · ") || "—"}</td>
                  <td className="px-2 py-2 text-right tabular-nums">{l.estimatedValue ? fmtMoneyShort(l.estimatedValue) : "—"}</td>
                  <td className="px-2 py-2 text-xs text-muted-foreground whitespace-nowrap">{fmtDate(l.createdAt)}</td>
                  <td className="px-2 py-2 text-right whitespace-nowrap">
                    {l.status === "Converted" && l.convertedCompanyId ? (
                      <button type="button" className="text-xs text-primary hover:underline" onClick={() => router.push(`/sales/accounts/${l.convertedCompanyId}`)}>Open account →</button>
                    ) : canTouch(l) ? (
                      <div className="flex justify-end gap-1.5">
                        {!l.ownerName && !access.isManager && (
                          <SecondaryButton className="h-7 px-2 text-xs" onClick={async () => { await upsertLead({ ...l, ownerName: access.userName }); reload(); }}>Claim</SecondaryButton>
                        )}
                        <SecondaryButton className="h-7 px-2 text-xs" onClick={() => setEditing({ lead: l })}>Edit</SecondaryButton>
                        {l.status !== "Disqualified" && (
                          <PrimaryButton className="h-7 px-2 text-xs" onClick={() => { setConverting(l); setOppName(`${l.companyName || l.name} — New Opportunity`); setCreateOpp(true); setError(null); }}>Convert</PrimaryButton>
                        )}
                      </div>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </>
        )}
      </div>

      <Modal open={!!editing} onClose={() => setEditing(null)} className="max-w-xl">
        {editing && (
          <LeadForm
            initial={editing.lead}
            isManager={access.isManager}
            currentUser={access.userName}
            territories={lookups.territories}
            verticals={lookups.verticals}
            onSave={async (d) => { await upsertLead(d); setEditing(null); reload(); }}
            onDelete={editing.lead ? async () => { await deleteLead(editing.lead!.id); setEditing(null); reload(); } : undefined}
            onCancel={() => setEditing(null)}
          />
        )}
      </Modal>

      <Modal open={!!converting} onClose={() => setConverting(null)}>
        {converting && (
          <div className="space-y-4">
            <h2 className="text-base font-semibold">Convert lead</h2>
            <p className="text-sm text-muted-foreground">
              This links <strong className="text-foreground">{converting.companyName || converting.name}</strong> to an existing account with the same name, or creates one,
              adds {converting.name ? <strong className="text-foreground">{converting.name}</strong> : "the lead"} as a contact, and carries the lead notes into the account timeline.
            </p>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={createOpp} onChange={(e) => setCreateOpp(e.target.checked)} />
              Also create an opportunity ({fmtMoneyShort(converting.estimatedValue)}, {converting.status === "Qualified" ? "Qualifying" : "Prospecting"})
            </label>
            {createOpp && (
              <Field label="Opportunity name">
                <TextInput value={oppName} onChange={(e) => setOppName(e.target.value)} />
              </Field>
            )}
            {error && <p className="text-xs text-destructive">{error}</p>}
            <div className="flex justify-end gap-2">
              <SecondaryButton onClick={() => setConverting(null)}>Cancel</SecondaryButton>
              <PrimaryButton onClick={doConvert}>Convert</PrimaryButton>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
