"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { parseConnectWiseXls } from "@/modules/deal-desk/lib/xls-parser";
import { calcFinancials, fmtUSD, fmtPct } from "@/modules/deal-desk/lib/financial-calc";
import type { DealDeskQuote, DealCategory, TeamMember, CategoryName, ProjectType } from "@/types/deal-desk";
import { CATEGORY_NAMES, PROJECT_TYPES, DEFAULT_PAYOUT_MILESTONES } from "@/types/deal-desk";
import { useSession } from "@/lib/auth/client";
import { cn } from "@/lib/utils";

interface ImportModalProps {
  onClose: () => void;
  onImported: (quote: DealDeskQuote) => void;
}

function currentQuarter(): string {
  const now = new Date();
  const q = Math.ceil((now.getMonth() + 1) / 3);
  return `Q${q} ${now.getFullYear()}`;
}

const DEFAULT_TEAM: TeamMember[] = [
  { id: crypto.randomUUID(), name: "", role: "Enterprise Director", matrixKey: "director" },
  { id: crypto.randomUUID(), name: "", role: "Account Executive",   matrixKey: "bd" },
  { id: crypto.randomUUID(), name: "", role: "Design Engineer",     matrixKey: "de" },
];

export function ImportModal({ onClose, onImported }: ImportModalProps) {
  const { name: currentUserName } = useSession();
  const fileRef = useRef<HTMLInputElement>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  const [customer, setCustomer] = useState("");
  const [projectName, setProjectName] = useState("");
  const [quoteNumber, setQuoteNumber] = useState("");
  const [opportunityNumber, setOpportunityNumber] = useState("");
  const [revision, setRevision] = useState("");
  const [salesperson, setSalesperson] = useState("");
  const [projectType, setProjectType] = useState<ProjectType>("Enterprise");
  const [quarter, setQuarter] = useState(currentQuarter());

  const [categories, setCategories] = useState<DealCategory[]>([]);
  const [team, setTeam] = useState<TeamMember[]>(DEFAULT_TEAM.map((m) => ({ ...m, id: crypto.randomUUID() })));

  const [step, setStep] = useState<"upload" | "review">("upload");

  async function handleFile(file: File) {
    setIsParsing(true);
    setParseError(null);
    setFileName(file.name);
    try {
      const result = await parseConnectWiseXls(file);
      if (result.meta.customer) setCustomer(result.meta.customer);
      if (result.meta.quoteName) setProjectName(result.meta.quoteName);
      if (result.meta.quoteNumber) setQuoteNumber(result.meta.quoteNumber);
      if (result.meta.version) setRevision(`v${result.meta.version}`);
      setCategories(result.categories);
      setStep("review");
    } catch (e) {
      setParseError("Could not parse this file. Make sure it is an internal ConnectWise Sell cost export (.xls).");
      console.error(e);
    } finally {
      setIsParsing(false);
    }
  }

  function addManualCategory() {
    setCategories((prev) => [...prev, { name: "Equipment", revenueCents: 0, costCents: 0 }]);
  }

  function updateCategory(idx: number, field: keyof DealCategory, value: string | number) {
    setCategories((prev) => prev.map((c, i) => (i === idx ? { ...c, [field]: value } : c)));
  }

  function removeCategory(idx: number) {
    setCategories((prev) => prev.filter((_, i) => i !== idx));
  }

  function updateTeamMember(id: string, field: keyof TeamMember, value: string) {
    setTeam((prev) => prev.map((m) => (m.id === id ? { ...m, [field]: value } : m)));
  }

  function addTeamMember() {
    setTeam((prev) => [...prev, { id: crypto.randomUUID(), name: "", role: "", matrixKey: "custom", customRateBps: 0 }]);
  }

  function removeTeamMember(id: string) {
    setTeam((prev) => prev.filter((m) => m.id !== id));
  }

  function handleConfirm() {
    const now = new Date().toISOString();
    const quote: DealDeskQuote = {
      id: crypto.randomUUID(),
      customer,
      projectName,
      quoteNumber,
      opportunityNumber,
      revision,
      version: 1,
      projectType,
      salesperson,
      importedAt: now,
      importedBy: currentUserName,
      quarter,
      status: "Pending",
      commissionStatus: "Estimated",
      categories,
      team: team.filter((m) => m.name.trim() !== ""),
      executiveNotes: "",
      approvalHistory: [],
      auditLog: [
        {
          id: crypto.randomUUID(),
          action: "Quote imported",
          detail: `Imported ${fileName ?? "manually entered"} by ${currentUserName}`,
          user: currentUserName,
          timestamp: now,
        },
      ],
      sourceFiles: fileName ? [fileName] : [],
      createdAt: now,
      updatedAt: now,
      billingCompletionPct: 0,
      milestones: DEFAULT_PAYOUT_MILESTONES,
      payoutEvents: [],
    };
    onImported(quote);
  }

  const f = categories.length > 0 ? calcFinancials(categories) : null;
  const canConfirm = projectName.trim() !== "" && customer.trim() !== "" && categories.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col rounded-xl border bg-card shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div>
            <h2 className="text-base font-semibold">Import Quote</h2>
            <p className="text-xs text-muted-foreground">ConnectWise internal cost export (.xls) or manual entry</p>
          </div>
          <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground text-lg">×</button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {/* Step: Upload */}
          {step === "upload" && (
            <div className="space-y-4">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="w-full rounded-lg border-2 border-dashed p-10 text-center hover:border-primary hover:bg-primary/5 transition-colors"
              >
                {isParsing ? (
                  <p className="text-sm text-muted-foreground">Parsing file…</p>
                ) : (
                  <>
                    <p className="text-sm font-medium">Drop or click to upload internal XLS export</p>
                    <p className="mt-1 text-xs text-muted-foreground">ConnectWise Sell cost export · .xls or .xlsx</p>
                  </>
                )}
              </button>
              <input
                ref={fileRef}
                type="file"
                accept=".xls,.xlsx"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                  e.target.value = "";
                }}
              />
              {parseError && <p className="text-sm text-destructive">{parseError}</p>}
              <div className="relative">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t" /></div>
                <div className="relative flex justify-center"><span className="bg-card px-3 text-xs text-muted-foreground">or enter manually</span></div>
              </div>
              <Button variant="outline" className="w-full" onClick={() => setStep("review")}>
                Enter data manually
              </Button>
            </div>
          )}

          {/* Step: Review & Metadata */}
          {step === "review" && (
            <div className="space-y-6">
              {/* Auto-parse summary */}
              {f && (
                <div className="rounded-lg border bg-muted/40 p-4 grid grid-cols-3 gap-4 text-sm">
                  <div><div className="text-xs text-muted-foreground mb-1">Revenue</div><div className="font-bold">{fmtUSD(f.revenueCents)}</div></div>
                  <div><div className="text-xs text-muted-foreground mb-1">COGS</div><div className="font-bold">{fmtUSD(f.costCents)}</div></div>
                  <div><div className="text-xs text-muted-foreground mb-1">Gross Margin</div><div className={cn("font-bold", f.grossMarginPct < 20 ? "text-amber-600" : "text-emerald-600")}>{fmtPct(f.grossMarginPct, 2)}</div></div>
                  <div><div className="text-xs text-muted-foreground mb-1">Commission Band</div><div className="font-semibold">{f.band.label}</div></div>
                  <div><div className="text-xs text-muted-foreground mb-1">Commission Pool</div><div className="font-bold">{fmtUSD(f.commissionPoolCents)}</div></div>
                  <div><div className="text-xs text-muted-foreground mb-1">File</div><div className="truncate text-muted-foreground">{fileName ?? "—"}</div></div>
                </div>
              )}

              {/* Metadata */}
              <div>
                <h3 className="text-sm font-semibold mb-3">Project Information</h3>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: "Customer", value: customer, set: setCustomer },
                    { label: "Project Name", value: projectName, set: setProjectName },
                    { label: "Quote Number", value: quoteNumber, set: setQuoteNumber },
                    { label: "Opportunity Number", value: opportunityNumber, set: setOpportunityNumber },
                    { label: "Revision", value: revision, set: setRevision },
                    { label: "Salesperson", value: salesperson, set: setSalesperson },
                  ].map(({ label, value, set }) => (
                    <label key={label} className="space-y-1">
                      <span className="text-xs font-medium text-muted-foreground">{label}</span>
                      <input
                        value={value}
                        onChange={(e) => set(e.target.value)}
                        className="w-full rounded-md border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    </label>
                  ))}
                  <label className="space-y-1">
                    <span className="text-xs font-medium text-muted-foreground">Project Type</span>
                    <select
                      value={projectType}
                      onChange={(e) => setProjectType(e.target.value as ProjectType)}
                      className="w-full rounded-md border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      {PROJECT_TYPES.map((t) => <option key={t}>{t}</option>)}
                    </select>
                  </label>
                  <label className="space-y-1">
                    <span className="text-xs font-medium text-muted-foreground">Quarter</span>
                    <input
                      value={quarter}
                      onChange={(e) => setQuarter(e.target.value)}
                      className="w-full rounded-md border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </label>
                </div>
              </div>

              {/* Categories */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold">Financial Categories</h3>
                  <Button variant="outline" size="sm" onClick={addManualCategory}>+ Add</Button>
                </div>
                <div className="space-y-2">
                  {categories.map((cat, idx) => (
                    <div key={idx} className="grid grid-cols-7 gap-2 items-center">
                      <select
                        value={cat.name}
                        onChange={(e) => updateCategory(idx, "name", e.target.value as CategoryName)}
                        className="col-span-2 rounded-md border bg-background px-2 py-1.5 text-sm"
                      >
                        {CATEGORY_NAMES.map((n) => <option key={n}>{n}</option>)}
                      </select>
                      <div className="col-span-2">
                        <input
                          type="number"
                          value={(cat.revenueCents / 100).toFixed(2)}
                          onChange={(e) => updateCategory(idx, "revenueCents", Math.round(parseFloat(e.target.value || "0") * 100))}
                          className="w-full rounded-md border bg-background px-2 py-1.5 text-sm"
                          placeholder="Revenue"
                        />
                      </div>
                      <div className="col-span-2">
                        <input
                          type="number"
                          value={(cat.costCents / 100).toFixed(2)}
                          onChange={(e) => updateCategory(idx, "costCents", Math.round(parseFloat(e.target.value || "0") * 100))}
                          className="w-full rounded-md border bg-background px-2 py-1.5 text-sm"
                          placeholder="Cost"
                        />
                      </div>
                      <button type="button" onClick={() => removeCategory(idx)} className="text-xs text-muted-foreground hover:text-destructive">✕</button>
                    </div>
                  ))}
                  {categories.length === 0 && (
                    <p className="text-sm text-muted-foreground py-3 text-center">No categories yet. Upload a file or click + Add.</p>
                  )}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">Revenue · Cost (in dollars)</div>
              </div>

              {/* Team */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold">Commission Team</h3>
                  <Button variant="outline" size="sm" onClick={addTeamMember}>+ Member</Button>
                </div>
                <div className="space-y-2">
                  {team.map((m) => (
                    <div key={m.id} className="grid grid-cols-8 gap-2 items-center">
                      <input
                        value={m.name}
                        onChange={(e) => updateTeamMember(m.id, "name", e.target.value)}
                        placeholder="Name"
                        className="col-span-2 rounded-md border bg-background px-2 py-1.5 text-sm"
                      />
                      <input
                        value={m.role}
                        onChange={(e) => updateTeamMember(m.id, "role", e.target.value)}
                        placeholder="Role"
                        className="col-span-2 rounded-md border bg-background px-2 py-1.5 text-sm"
                      />
                      <select
                        value={m.matrixKey}
                        onChange={(e) => updateTeamMember(m.id, "matrixKey", e.target.value)}
                        className="col-span-2 rounded-md border bg-background px-2 py-1.5 text-sm"
                      >
                        <option value="director">Director rate</option>
                        <option value="bd">BD rate</option>
                        <option value="de">DE rate</option>
                        <option value="custom">Custom %</option>
                      </select>
                      {m.matrixKey === "custom" && (
                        <input
                          type="number"
                          value={((m.customRateBps ?? 0) / 100).toFixed(2)}
                          onChange={(e) => updateTeamMember(m.id, "customRateBps", String(Math.round(parseFloat(e.target.value || "0") * 100)))}
                          placeholder="Rate %"
                          className="rounded-md border bg-background px-2 py-1.5 text-sm"
                        />
                      )}
                      <button type="button" onClick={() => removeTeamMember(m.id)} className="text-xs text-muted-foreground hover:text-destructive col-start-8">✕</button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t px-6 py-4">
          <Button variant="ghost" onClick={step === "review" && fileName === null ? () => setStep("upload") : onClose}>
            {step === "review" && fileName === null ? "← Back" : "Cancel"}
          </Button>
          {step === "review" && (
            <Button onClick={handleConfirm} disabled={!canConfirm}>
              Save Quote
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
