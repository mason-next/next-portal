"use client";

import { useState } from "react";
import type { SalesOpportunity, SalesCompany, OppStage, ForecastCategory } from "@/types/sales";
import { OPP_STAGES, FORECAST_CATEGORIES, LEAD_SOURCES, STAGE_PROBABILITY, effectiveForecastCategory } from "@/types/sales";
import { toDateInput } from "@/modules/crm/lib/format";
import { checkCwNumberAvailable } from "@/lib/data/cw-sync";
import { Field, TextInput, Select, TextArea, OwnerSelect, PrimaryButton, SecondaryButton } from "./ui";

export type OpportunityInput = Omit<SalesOpportunity, "id" | "createdAt" | "updatedAt" | "company"> & { id?: string };

/**
 * Full CRM opportunity editor: stage, value, probability, close date, forecast
 * category, next step (what / when / who), owner and lead source.
 */
export function OpportunityEditor({
  initial, companyId, companies, canAssignOwner, currentUser, onSave, onCancel, onDelete,
}: {
  initial?: SalesOpportunity;
  companyId?: string;
  companies: Pick<SalesCompany, "id" | "name">[];
  canAssignOwner: boolean;
  currentUser: string;
  onSave: (data: OpportunityInput) => Promise<unknown>;
  onCancel: () => void;
  onDelete?: () => Promise<unknown>;
}) {
  const isCW = Boolean(initial?.cwNumber);
  const [company, setCompany] = useState(initial?.companyId ?? companyId ?? companies[0]?.id ?? "");
  const [name, setName] = useState(initial?.name ?? "");
  const [stage, setStage] = useState<OppStage>(initial?.stage ?? "Prospecting");
  const [value, setValue] = useState(initial ? String(initial.value / 100) : "");
  const [probability, setProbability] = useState(initial?.probability != null ? String(initial.probability) : "");
  const [forecast, setForecast] = useState<ForecastCategory | "">(initial?.forecastCategory ?? "");
  const [closeDate, setCloseDate] = useState(toDateInput(initial?.closeDate));
  const [ownerName, setOwnerName] = useState(initial?.ownerName ?? currentUser);
  const [ownerId, setOwnerId] = useState<string | null>(initial?.ownerId ?? null);
  const [nextStep, setNextStep] = useState(initial?.nextStep ?? "");
  const [nextStepDate, setNextStepDate] = useState(toDateInput(initial?.nextStepDate));
  const [nextOwnerName, setNextOwnerName] = useState(initial?.nextStepOwnerName ?? "");
  const [nextOwnerId, setNextOwnerId] = useState<string | null>(initial?.nextStepOwnerId ?? null);
  const [leadSource, setLeadSource] = useState(initial?.leadSource ?? "");
  const [cwLink, setCwLink] = useState(initial?.cwLink ?? "");
  const [cwNumber, setCwNumber] = useState(initial?.cwNumber ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const closed = stage === "Closed Won" || stage === "Closed Lost";
  const derivedForecast = effectiveForecastCategory({
    stage, probability: probability === "" ? null : Number(probability), forecastCategory: null,
  });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !company) return;
    setSaving(true);
    setError(null);
    try {
      const cw = cwNumber.trim().replace(/^#/, "");
      if (cw && cw !== (initial?.cwNumber ?? "") && !(await checkCwNumberAvailable(cw, initial?.id))) {
        setError(`ConnectWise #${cw} is already linked to another deal.`);
        setSaving(false);
        return;
      }
      await onSave({
        ...(initial?.id ? { id: initial.id } : {}),
        companyId: company,
        name: name.trim(),
        stage,
        ownerId,
        ownerName,
        value: Math.round((parseFloat(value.replace(/[$,]/g, "")) || 0) * 100),
        notes: initial?.notes ?? "",
        closeDate: closeDate || null,
        cwNumber: cwNumber.trim().replace(/^#/, "") || null,
        cwLink: cwLink.trim() || null,
        proposalCreatedAt: initial?.proposalCreatedAt ?? null,
        rating: initial?.rating ?? null,
        commissionTeam: initial?.commissionTeam ?? null,
        parentOppId: initial?.parentOppId ?? null,
        probability: probability === "" ? null : Number(probability),
        forecastCategory: forecast || null,
        nextStep,
        nextStepDate: nextStepDate || null,
        nextStepOwnerName: nextOwnerName,
        nextStepOwnerId: nextOwnerId,
        leadSource,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <h2 className="text-base font-semibold">{initial ? "Edit Opportunity" : "New Opportunity"}</h2>
      {isCW && (
        <p className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-700 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-300">
          Linked to ConnectWise #{initial?.cwNumber}. When this deal&apos;s name, value, close date, stage or rep changes in
          ConnectWise, the next import updates it here. Your edits stay until ConnectWise changes that field. Nothing is sent to ConnectWise.
        </p>
      )}
      <div className="grid grid-cols-2 gap-3">
        {!companyId && (
          <Field label="Account *" className="col-span-2">
            <Select value={company} onChange={(e) => setCompany(e.target.value)} disabled={isCW} required>
              {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </Field>
        )}
        <Field label="Opportunity name *" className="col-span-2">
          <TextInput value={name} onChange={(e) => setName(e.target.value)} required autoFocus placeholder="Network refresh — HQ" />
        </Field>
        <Field label="Stage">
          <Select value={stage} onChange={(e) => setStage(e.target.value as OppStage)}>
            {OPP_STAGES.map((s) => <option key={s}>{s}</option>)}
          </Select>
        </Field>
        <Field label="Deal value ($)">
          <TextInput inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value)} placeholder="25000" />
        </Field>
        <Field label={`Probability % (default ${STAGE_PROBABILITY[stage]}%)`}>
          <TextInput type="number" min={0} max={100} value={closed ? "" : probability} disabled={closed}
            onChange={(e) => setProbability(e.target.value)} placeholder={String(STAGE_PROBABILITY[stage])} />
        </Field>
        <Field label="Expected close date">
          <TextInput type="date" value={closeDate} onChange={(e) => setCloseDate(e.target.value)} />
        </Field>
        <Field label="Forecast category">
          <Select value={forecast} onChange={(e) => setForecast(e.target.value as ForecastCategory | "")} disabled={closed}>
            <option value="">Auto ({derivedForecast})</option>
            {FORECAST_CATEGORIES.filter((c) => c !== "Closed").map((c) => <option key={c}>{c}</option>)}
          </Select>
        </Field>
        <Field label="Owner / rep">
          {canAssignOwner
            ? <OwnerSelect value={ownerName} allowEmpty={false} onChange={(n, id) => { setOwnerName(n); setOwnerId(id); }} />
            : <TextInput value={ownerName || currentUser} disabled />}
        </Field>

        <div className="col-span-2 mt-1 rounded-lg border bg-muted/30 p-3 space-y-3">
          <div>
            <div className="text-xs font-semibold">Next task</div>
            <p className="text-[11px] text-muted-foreground">Saved as a task on this deal. The deal&apos;s next step is always its earliest open task.</p>
          </div>
          <Field label="What needs to happen next">
            <TextInput value={nextStep} onChange={(e) => setNextStep(e.target.value)} placeholder="Send revised quote with 3-year support" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="By when">
              <TextInput type="date" value={nextStepDate} onChange={(e) => setNextStepDate(e.target.value)} />
            </Field>
            <Field label="Who owns it">
              <OwnerSelect value={nextOwnerName} emptyLabel="Deal owner" onChange={(n, id) => { setNextOwnerName(n); setNextOwnerId(id); }} />
            </Field>
          </div>
        </div>

        <Field label="Lead source">
          <TextInput list="crm-lead-sources" value={leadSource} onChange={(e) => setLeadSource(e.target.value)} />
          <datalist id="crm-lead-sources">{LEAD_SOURCES.map((s) => <option key={s} value={s} />)}</datalist>
        </Field>
        <Field label="ConnectWise opportunity #">
          <TextInput value={cwNumber} onChange={(e) => setCwNumber(e.target.value)} placeholder="Blank = local only" inputMode="numeric" />
        </Field>
        <Field label="ConnectWise link" className="col-span-2">
          <TextInput type="url" value={cwLink} onChange={(e) => setCwLink(e.target.value)} placeholder="https://…" />
        </Field>
        {initial?.notes && (
          <Field label="Legacy notes (read-only — copied to the notes timeline)" className="col-span-2">
            <TextArea rows={2} value={initial.notes} readOnly className="opacity-70" />
          </Field>
        )}
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
      <div className="flex items-center justify-between">
        {onDelete ? (
          <button type="button" className="text-xs text-destructive hover:underline"
            onClick={() => confirm(`Delete "${initial?.name}"?`) && onDelete()}>
            Delete opportunity
          </button>
        ) : <span />}
        <div className="flex gap-2">
          <SecondaryButton type="button" onClick={onCancel}>Cancel</SecondaryButton>
          <PrimaryButton type="submit" disabled={saving}>{saving ? "Saving…" : initial ? "Save" : "Create opportunity"}</PrimaryButton>
        </div>
      </div>
    </form>
  );
}
