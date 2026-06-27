"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { parseConnectWiseXls } from "@/modules/deal-desk/lib/xls-parser";
import { calcFinancials, fmtUSD, fmtPct } from "@/modules/deal-desk/lib/financial-calc";
import type { DealDeskQuote, DealCategory, TeamMember, CategoryName, ProjectType } from "@/types/deal-desk";
import { CATEGORY_NAMES, PROJECT_TYPES, DEFAULT_PAYOUT_MILESTONES } from "@/types/deal-desk";
import type { AppUser } from "@/types/user";
import { CURRENT_USER } from "@/lib/current-user";
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

const DEFAULT_TEAM: Omit<TeamMember, "id">[] = [
  { name: "", role: "Enterprise Director", matrixKey: "director" },
  { name: "", role: "Account Executive",   matrixKey: "bd" },
  { name: "", role: "Design Engineer",     matrixKey: "de" },
];

// ── User avatar ───────────────────────────────────────────────────────────────

function Avatar({ user, size = 28 }: { user: AppUser; size?: number }) {
  const initials = user.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  if (user.avatarUrl) {
    return <img src={user.avatarUrl} alt={user.name} style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />;
  }
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: "hsl(var(--primary)/0.12)", color: "hsl(var(--primary))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.4, fontWeight: 700, flexShrink: 0 }}>
      {initials}
    </div>
  );
}

// ── User picker dropdown ──────────────────────────────────────────────────────

function UserPicker({
  users,
  value,
  onChange,
  placeholder = "Search users…",
}: {
  users: AppUser[];
  value: string;           // user ID or ""
  onChange: (user: AppUser | null) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = users.find((u) => u.id === value) ?? null;

  const filtered = query
    ? users.filter((u) => u.name.toLowerCase().includes(query.toLowerCase()) || u.title.toLowerCase().includes(query.toLowerCase()))
    : users;

  // Close on outside click
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false); setQuery("");
      }
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => { setOpen((o) => !o); setTimeout(() => inputRef.current?.focus(), 50); }}
        className="w-full flex items-center gap-2 rounded-md border bg-background px-2.5 py-1.5 text-sm text-left hover:bg-muted/40 transition-colors"
      >
        {selected ? (
          <>
            <Avatar user={selected} size={22} />
            <div className="min-w-0 flex-1">
              <div className="font-medium truncate">{selected.name}</div>
            </div>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onChange(null); setQuery(""); }}
              className="text-muted-foreground hover:text-foreground text-xs ml-auto flex-shrink-0"
            >✕</button>
          </>
        ) : (
          <span className="text-muted-foreground">{placeholder}</span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-[200] left-0 right-0 top-full mt-1 rounded-lg border bg-card shadow-xl overflow-hidden" style={{ maxHeight: 260 }}>
          <div className="p-2 border-b">
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Type a name…"
              className="w-full rounded-md border bg-background px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div style={{ overflowY: "auto", maxHeight: 200 }}>
            {filtered.length === 0 ? (
              <div className="px-3 py-4 text-center text-sm text-muted-foreground">No users found</div>
            ) : (
              filtered.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => { onChange(u); setOpen(false); setQuery(""); }}
                  className={cn(
                    "w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left hover:bg-muted/50 transition-colors",
                    u.id === value && "bg-primary/8 text-primary"
                  )}
                >
                  <Avatar user={u} size={28} />
                  <div className="min-w-0">
                    <div className="font-medium truncate">{u.name}</div>
                    <div className="text-xs text-muted-foreground truncate">{u.title}</div>
                  </div>
                </button>
              ))
            )}
          </div>
          {/* Create new user shortcut */}
          <div className="border-t px-3 py-2">
            <a
              href="/admin"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs text-primary hover:underline"
              onClick={() => { setOpen(false); setQuery(""); }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" x2="12" y1="5" y2="19"/><line x1="5" x2="19" y1="12" y2="12"/></svg>
              Add a new user in Admin ↗
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main modal ────────────────────────────────────────────────────────────────

export function ImportModal({ onClose, onImported }: ImportModalProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  const [users, setUsers] = useState<AppUser[]>([]);
  const [salespersonId, setSalespersonId] = useState("");

  const [customer, setCustomer] = useState("");
  const [projectName, setProjectName] = useState("");
  const [quoteNumber, setQuoteNumber] = useState("");
  const [opportunityNumber, setOpportunityNumber] = useState("");
  const [revision, setRevision] = useState("");
  const [projectType, setProjectType] = useState<ProjectType>("Enterprise");
  const [quarter, setQuarter] = useState(currentQuarter());

  const [categories, setCategories] = useState<DealCategory[]>([]);
  const [team, setTeam] = useState<TeamMember[]>(DEFAULT_TEAM.map((m) => ({ ...m, id: crypto.randomUUID() })));
  const [step, setStep] = useState<"upload" | "review">("upload");

  // Fetch users on mount
  useEffect(() => {
    fetch("/api/users").then((r) => r.json()).then(setUsers).catch(() => {});
  }, []);

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

  function setTeamUser(memberId: string, user: AppUser | null) {
    setTeam((prev) => prev.map((m) =>
      m.id === memberId
        ? { ...m, userId: user?.id ?? undefined, avatarUrl: user?.avatarUrl ?? undefined, name: user?.name ?? "" }
        : m
    ));
  }

  function updateTeamMember(memberId: string, field: keyof TeamMember, value: string) {
    setTeam((prev) => prev.map((m) => (m.id === memberId ? { ...m, [field]: value } : m)));
  }

  function addTeamMember() {
    setTeam((prev) => [...prev, { id: crypto.randomUUID(), name: "", role: "", matrixKey: "custom", customRateBps: 0 }]);
  }

  function removeTeamMember(id: string) {
    setTeam((prev) => prev.filter((m) => m.id !== id));
  }

  function handleConfirm() {
    const now = new Date().toISOString();
    const salesperson = users.find((u) => u.id === salespersonId)?.name ?? "";
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
      importedBy: CURRENT_USER,
      quarter,
      status: "Pending",
      commissionStatus: "Estimated",
      categories,
      team: team.filter((m) => m.name.trim() !== ""),
      executiveNotes: "",
      approvalHistory: [],
      auditLog: [{
        id: crypto.randomUUID(),
        action: "Quote imported",
        detail: `Imported ${fileName ?? "manually entered"} by ${CURRENT_USER}`,
        user: CURRENT_USER,
        timestamp: now,
      }],
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
          <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground text-lg leading-none">×</button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

          {/* ── Step: Upload ── */}
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
                    <div className="text-3xl mb-3">📊</div>
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
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }}
              />
              {parseError && <p className="text-sm text-destructive">{parseError}</p>}
              <div className="relative">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t" /></div>
                <div className="relative flex justify-center"><span className="bg-card px-3 text-xs text-muted-foreground">or enter manually</span></div>
              </div>
              <Button variant="outline" className="w-full" onClick={() => setStep("review")}>Enter data manually</Button>
            </div>
          )}

          {/* ── Step: Review ── */}
          {step === "review" && (
            <div className="space-y-6">

              {/* Parse summary */}
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

              {/* Project info */}
              <div>
                <h3 className="text-sm font-semibold mb-3">Project Information</h3>
                <div className="grid grid-cols-2 gap-3">
                  {([
                    { label: "Customer", value: customer, set: setCustomer },
                    { label: "Project Name", value: projectName, set: setProjectName },
                    { label: "Quote Number", value: quoteNumber, set: setQuoteNumber },
                    { label: "Opportunity Number", value: opportunityNumber, set: setOpportunityNumber },
                    { label: "Revision", value: revision, set: setRevision },
                  ] as const).map(({ label, value, set }) => (
                    <label key={label} className="space-y-1">
                      <span className="text-xs font-medium text-muted-foreground">{label}</span>
                      <input
                        value={value}
                        onChange={(e) => set(e.target.value)}
                        className="w-full rounded-md border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    </label>
                  ))}

                  {/* Salesperson — linked to user */}
                  <div className="space-y-1">
                    <span className="text-xs font-medium text-muted-foreground">Salesperson</span>
                    <UserPicker
                      users={users}
                      value={salespersonId}
                      onChange={(u) => setSalespersonId(u?.id ?? "")}
                      placeholder="Link to a user…"
                    />
                  </div>

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

              {/* Financial Categories */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold">Financial Categories</h3>
                  <Button variant="outline" size="sm" onClick={addManualCategory}>+ Add</Button>
                </div>
                <div className="rounded-lg border overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="border-b bg-muted/30">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground w-[34%]">Category</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Revenue ($)</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Cost ($)</th>
                        <th className="px-2 py-2 w-8" />
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {categories.length === 0 ? (
                        <tr><td colSpan={4} className="px-3 py-5 text-center text-xs text-muted-foreground">No categories yet. Upload a file or click + Add.</td></tr>
                      ) : categories.map((cat, idx) => (
                        <tr key={idx} className="hover:bg-muted/20">
                          <td className="px-3 py-2">
                            <select
                              value={cat.name}
                              onChange={(e) => updateCategory(idx, "name", e.target.value as CategoryName)}
                              className="w-full rounded border bg-background px-2 py-1 text-sm focus:outline-none"
                            >
                              {CATEGORY_NAMES.map((n) => <option key={n}>{n}</option>)}
                            </select>
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="number"
                              value={(cat.revenueCents / 100).toFixed(2)}
                              onChange={(e) => updateCategory(idx, "revenueCents", Math.round(parseFloat(e.target.value || "0") * 100))}
                              className="w-full rounded border bg-background px-2 py-1 text-sm focus:outline-none"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="number"
                              value={(cat.costCents / 100).toFixed(2)}
                              onChange={(e) => updateCategory(idx, "costCents", Math.round(parseFloat(e.target.value || "0") * 100))}
                              className="w-full rounded border bg-background px-2 py-1 text-sm focus:outline-none"
                            />
                          </td>
                          <td className="px-2 py-2 text-center">
                            <button type="button" onClick={() => removeCategory(idx)} className="text-muted-foreground hover:text-destructive text-xs">✕</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Commission Team */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-sm font-semibold">Commission Team</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">Link each role to a team member from the directory</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={addTeamMember}>+ Member</Button>
                </div>

                <div className="space-y-2">
                  {team.map((m) => (
                    <div key={m.id} className="grid gap-2 items-start" style={{ gridTemplateColumns: "1fr 1fr auto auto auto" }}>
                      {/* User picker */}
                      <UserPicker
                        users={users}
                        value={m.userId ?? ""}
                        onChange={(u) => setTeamUser(m.id, u)}
                        placeholder="Pick a person…"
                      />
                      {/* Role label */}
                      <input
                        value={m.role}
                        onChange={(e) => updateTeamMember(m.id, "role", e.target.value)}
                        placeholder="Role title"
                        className="rounded-md border bg-background px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                      {/* Matrix key */}
                      <select
                        value={m.matrixKey}
                        onChange={(e) => updateTeamMember(m.id, "matrixKey", e.target.value)}
                        className="rounded-md border bg-background px-2 py-1.5 text-sm focus:outline-none"
                      >
                        <option value="director">Director rate</option>
                        <option value="bd">BD rate</option>
                        <option value="de">DE rate</option>
                        <option value="custom">Custom %</option>
                      </select>
                      {/* Custom rate */}
                      {m.matrixKey === "custom" ? (
                        <input
                          type="number"
                          value={((m.customRateBps ?? 0) / 100).toFixed(2)}
                          onChange={(e) => updateTeamMember(m.id, "customRateBps", String(Math.round(parseFloat(e.target.value || "0") * 100)))}
                          placeholder="Rate %"
                          className="w-20 rounded-md border bg-background px-2 py-1.5 text-sm focus:outline-none"
                        />
                      ) : <div />}
                      {/* Remove */}
                      <button type="button" onClick={() => removeTeamMember(m.id)} className="text-muted-foreground hover:text-destructive text-xs mt-2">✕</button>
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
            <Button onClick={handleConfirm} disabled={!canConfirm}>Save Quote</Button>
          )}
        </div>
      </div>
    </div>
  );
}
