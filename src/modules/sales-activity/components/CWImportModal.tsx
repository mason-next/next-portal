"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import type { SalesCompany, OppStage } from "@/types/sales";
import type { AppUser } from "@/types/user";
import { UserPicker } from "@/components/shared/UserPicker";

const STAGE_OPTIONS: OppStage[] = [
  "Prospecting", "Qualifying", "Proposal", "Negotiation", "Closed Won", "Closed Lost",
];

const STAGE_MAP: Record<string, OppStage> = {
  "Prospect":       "Prospecting",
  "Qualified":      "Qualifying",
  "Quote Complete": "Proposal",
  "Negotiation":    "Negotiation",
  "Won":            "Closed Won",
  "Lost":           "Closed Lost",
};

const STAGE_COLORS: Record<string, string> = {
  Prospecting:    "bg-slate-100 text-slate-600",
  Qualifying:     "bg-blue-100 text-blue-700",
  Proposal:       "bg-violet-100 text-violet-700",
  Negotiation:    "bg-amber-100 text-amber-700",
  "Closed Won":   "bg-emerald-100 text-emerald-700",
  "Closed Lost":  "bg-red-100 text-red-700",
};

interface ParsedOpp {
  cwNumber: string;
  name: string;
  companyName: string;
  stage: OppStage;
  ownerName: string;
  contactName: string;
  value: number; // dollars
  cwStatus: string; // Open | Quote Expired | Won
  closeDate: string | null; // ISO date string
}

interface MatchedCompany {
  csvName: string;
  suggestedCompany: SalesCompany | null;
  opps: ParsedOpp[];
}

export interface CWImportPayload {
  companyMappings: Array<{ csvName: string; matchedId?: string }>;
  selectedOpps: Array<ParsedOpp & { resolvedCsvName: string; resolvedOwnerName: string; resolvedOwnerId: string | null; existingId?: string }>;
}

export type ImportProgressCallback = (done: number, total: number, label: string) => void;

// Convert "Charles Horn" → "chorn" to match CW's rep format
function cwSlug(user: AppUser): string {
  const parts = user.name.trim().split(/\s+/);
  if (parts.length < 2) return user.name.toLowerCase();
  return (parts[0][0] + parts[parts.length - 1]).toLowerCase();
}

function autoMatchRep(cwName: string, users: AppUser[]): AppUser | null {
  if (!cwName) return null;
  const slug = cwName.toLowerCase().trim();
  return users.find((u) => cwSlug(u) === slug) ?? null;
}

interface CWImportModalProps {
  companies: SalesCompany[];
  onImport: (data: CWImportPayload, onProgress: ImportProgressCallback) => Promise<void>;
  onClose: () => void;
}

// ── CSV parser (handles quoted fields) ────────────────────────────────────────
function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') {
      if (inQuotes && text[i + 1] === '"') { field += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      row.push(field); field = "";
    } else if ((ch === "\n" || ch === "\r") && !inQuotes) {
      row.push(field); field = "";
      if (row.some((c) => c.trim())) rows.push(row);
      row = [];
      if (ch === "\r" && text[i + 1] === "\n") i++;
    } else {
      field += ch;
    }
  }
  if (field || row.length) { row.push(field); if (row.some((c) => c.trim())) rows.push(row); }
  return rows;
}

function parseCWCSV(text: string, existingCompanies: SalesCompany[]): MatchedCompany[] {
  const rows = parseCSV(text);
  if (rows.length < 2) return [];

  const rawHeaders = rows[0].map((h) => h.trim());
  const headers = rawHeaders.map((h) => h.toLowerCase());

  // Find a column index by name — order-independent.
  const col = (name: string) => headers.indexOf(name.toLowerCase());

  // CW exports two columns both named "status": one holds an image/icon path,
  // the other holds the text value (Open, Won, Lost, etc.). We can't rely on
  // column order since users can rearrange their CW views.
  // Detect the text column by checking whether the first data row's value
  // looks like an image path (contains "/" or ends with an image extension).
  const statusIndices = headers.reduce<number[]>((acc, h, i) => {
    if (h === "status") acc.push(i);
    return acc;
  }, []);
  const firstRow = rows[1] ?? [];
  const iStatus = statusIndices.length <= 1
    ? (statusIndices[0] ?? -1)
    : (statusIndices.find((idx) => {
        const val = firstRow[idx]?.trim() ?? "";
        return !val.includes("/") && !/\.(png|gif|svg|jpg|jpeg)$/i.test(val);
      }) ?? statusIndices[statusIndices.length - 1]);
  const iSummary   = col("opportunity summary");
  const iCompany   = col("company");
  const iOppNum    = col("opportunity #");
  const iStage     = col("stage");
  const iContact   = col("contact name");
  const iRep       = col("sales rep");
  const iRevenue   = col("revenue");
  const iWon       = col("won");
  const iCloseDate = col("quote expiration date") !== -1 ? col("quote expiration date") : col("close date");

  const parsed: ParsedOpp[] = [];

  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const status = r[iStatus]?.trim() ?? "";

    // Skip rows with no meaningful name
    const name = r[iSummary]?.trim() ?? "";
    if (!name) continue;

    const cwStage = r[iStage]?.trim() ?? "";
    const stage = STAGE_MAP[cwStage] ?? "Prospecting";
    const statusLower = status.toLowerCase();
    const finalStage: OppStage =
      statusLower === "won"  ? "Closed Won"  :
      statusLower === "lost" ? "Closed Lost" : stage;

    const revenue = parseFloat(r[iRevenue]?.trim().replace(/[^0-9.-]/g, "") ?? "0") || 0;
    // Revenue = total project/contract value. Always use it; the "Won" column is a separate CW metric (e.g. GP).
    const value = revenue;

    // Parse CW close date (format: M/D/YYYY or MM/DD/YYYY)
    let closeDate: string | null = null;
    const rawDate = r[iCloseDate]?.trim();
    if (rawDate) {
      const d = new Date(rawDate);
      if (!isNaN(d.getTime())) closeDate = d.toISOString().slice(0, 10);
    }

    parsed.push({
      cwNumber:    r[iOppNum]?.trim() ?? "",
      name,
      companyName: r[iCompany]?.trim() ?? "",
      stage:       finalStage,
      ownerName:   r[iRep]?.trim() ?? "",
      contactName: r[iContact]?.trim() ?? "",
      value:       Math.round(value),
      cwStatus:    status,
      closeDate,
    });
  }

  // Group by company name
  const companyMap = new Map<string, ParsedOpp[]>();
  for (const opp of parsed) {
    if (!companyMap.has(opp.companyName)) companyMap.set(opp.companyName, []);
    companyMap.get(opp.companyName)!.push(opp);
  }

  return Array.from(companyMap.entries()).map(([csvName, opps]) => {
    const suggested =
      existingCompanies.find((c) => c.name.toLowerCase() === csvName.toLowerCase()) ??
      existingCompanies.find((c) =>
        c.name.toLowerCase().includes(csvName.toLowerCase().split(" ")[0]) ||
        csvName.toLowerCase().includes(c.name.toLowerCase().split(" ")[0])
      ) ?? null;
    return { csvName, suggestedCompany: suggested, opps };
  });
}

function fmt(dollars: number) {
  if (!dollars) return null;
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(dollars);
}

const STATUS_CLS: Record<string, string> = {
  "open":          "bg-blue-50 text-blue-700 border-blue-200",
  "quote expired": "bg-amber-50 text-amber-700 border-amber-200",
  "won":           "bg-emerald-50 text-emerald-700 border-emerald-200",
};

// ── Component ─────────────────────────────────────────────────────────────────
export function CWImportModal({ companies, onImport, onClose }: CWImportModalProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [parsed, setParsed] = useState<MatchedCompany[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number; label: string } | null>(null);
  const [done, setDone] = useState<{ created: number; updated: number } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Per-company: selected existing company id, or "" = create new
  const [companyMatch, setCompanyMatch] = useState<Record<string, string>>({});
  // Set of "csvName::index" keys that are checked
  const [checked, setChecked] = useState<Set<string>>(new Set());
  // Per-opp stage overrides: "csvName::index" → stage
  const [stageOverride, setStageOverride] = useState<Record<string, OppStage>>({});

  // Rep name resolution: CW slug → resolved AppUser (null = unresolved)
  const [allUsers, setAllUsers] = useState<AppUser[]>([]);
  const [repMapping, setRepMapping] = useState<Record<string, AppUser | null>>({});

  useEffect(() => {
    fetch("/api/users").then((r) => r.json()).then(setAllUsers).catch(() => {});
  }, []);

  // Unique CW rep slugs in current parsed data
  const uniqueRepSlugs = useMemo(() => {
    if (!parsed) return [];
    const slugs = new Set<string>();
    for (const m of parsed) for (const o of m.opps) if (o.ownerName) slugs.add(o.ownerName);
    return Array.from(slugs).sort();
  }, [parsed]);

  // Auto-match when users load or parsed changes
  useEffect(() => {
    if (!allUsers.length || !uniqueRepSlugs.length) return;
    setRepMapping((prev) => {
      const next = { ...prev };
      for (const slug of uniqueRepSlugs) {
        if (!(slug in next)) next[slug] = autoMatchRep(slug, allUsers);
      }
      return next;
    });
  }, [allUsers, uniqueRepSlugs]);

  const unresolvedReps = uniqueRepSlugs.filter((s) => repMapping[s] === undefined || repMapping[s] === null);

  function oppKey(csvName: string, i: number) { return `${csvName}::${i}`; }

  function handleFile(file: File) {
    if (!file.name.toLowerCase().endsWith(".csv")) {
      setError("Only .csv files are supported.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const result = parseCWCSV(text, companies);
        if (result.length === 0) {
          setError("No importable opportunities found. Check the file format (blank rows are skipped).");
          return;
        }
        // Initialize state from parsed results
        // Lost opps are checked by default (for win rate tracking) but visually distinct
        const matchInit: Record<string, string> = {};
        const checkedInit = new Set<string>();
        const stageInit: Record<string, OppStage> = {};
        for (const m of result) {
          matchInit[m.csvName] = m.suggestedCompany?.id ?? "";
          m.opps.forEach((o, i) => {
            checkedInit.add(oppKey(m.csvName, i)); // check all by default including lost
            stageInit[oppKey(m.csvName, i)] = o.stage;
          });
        }
        setCompanyMatch(matchInit);
        setChecked(checkedInit);
        setStageOverride(stageInit);
        setParsed(result);
        setError(null);
      } catch {
        setError("Failed to parse CSV — please check the file format.");
      }
    };
    reader.readAsText(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  function toggleOpp(key: string) {
    setChecked((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  function toggleAllForCompany(csvName: string, opps: ParsedOpp[], value: boolean) {
    setChecked((prev) => {
      const next = new Set(prev);
      opps.forEach((_, i) => {
        const k = oppKey(csvName, i);
        value ? next.add(k) : next.delete(k);
      });
      return next;
    });
  }

  const selectedCount = useMemo(() => checked.size, [checked]);

  // For each parsed opp, check if an existing opp with the same CW# already exists
  // in the matched company. Key: oppKey → existing opp id.
  const existingOppLookup = useMemo(() => {
    const lookup = new Map<string, string>();
    if (!parsed) return lookup;
    for (const m of parsed) {
      const companyId = companyMatch[m.csvName];
      if (!companyId) continue;
      const company = companies.find((c) => c.id === companyId);
      if (!company) continue;
      // Match by cwNumber field (preferred) or legacy CW# notes prefix
      const cwIndex = new Map<string, string>();
      for (const opp of company.opportunities ?? []) {
        if (opp.cwNumber) {
          cwIndex.set(opp.cwNumber, opp.id);
        } else {
          const match = opp.notes?.match(/^CW#(\d+)/);
          if (match) cwIndex.set(match[1], opp.id);
        }
      }
      m.opps.forEach((o, i) => {
        if (o.cwNumber && cwIndex.has(o.cwNumber)) {
          lookup.set(oppKey(m.csvName, i), cwIndex.get(o.cwNumber)!);
        }
      });
    }
    return lookup;
  }, [parsed, companyMatch, companies]);

  async function handleImport() {
    if (!parsed) return;
    setIsImporting(true);
    setProgress({ done: 0, total: 0, label: "Preparing…" });
    try {
      const companyMappings = parsed.map((m) => ({
        csvName: m.csvName,
        matchedId: companyMatch[m.csvName] || undefined,
      }));
      const selectedOpps = parsed.flatMap((m) =>
        m.opps
          .map((o, i) => {
            const key = oppKey(m.csvName, i);
            const resolvedUser = o.ownerName ? (repMapping[o.ownerName] ?? null) : null;
            return {
              ...o,
              stage: stageOverride[key] ?? o.stage,
              resolvedCsvName: m.csvName,
              resolvedOwnerName: resolvedUser?.name ?? o.ownerName,
              resolvedOwnerId: resolvedUser?.id ?? null,
              existingId: existingOppLookup.get(key),
            };
          })
          .filter((_, i) => checked.has(oppKey(m.csvName, i)))
      );
      const created = selectedOpps.filter((o) => !o.existingId).length;
      const updated = selectedOpps.filter((o) => !!o.existingId).length;
      await onImport({ companyMappings, selectedOpps }, (done, total, label) => {
        setProgress({ done, total, label });
      });
      setDone({ created, updated });
    } catch (err) {
      console.error("[CWImport] Import failed:", err);
      setError(`Import failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsImporting(false);
      setProgress(null);
    }
  }

  const totalOpps = parsed?.reduce((s, m) => s + m.opps.length, 0) ?? 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex max-h-[92vh] w-full max-w-4xl flex-col rounded-xl border bg-card shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-4 shrink-0">
          <div>
            <h2 className="text-base font-semibold">Import ConnectWise Opportunities</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {parsed
                ? `${totalOpps} opps found across ${parsed.length} companies · ${selectedCount} selected to import`
                : "Export the Opportunity List from ConnectWise and upload the CSV — Lost opps imported for win rate tracking"}
            </p>
          </div>
          <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground text-xl leading-none ml-4">×</button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {isImporting && progress ? (
            <div className="py-12 flex flex-col items-center gap-6">
              <div className="w-full max-w-sm space-y-3">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="truncate max-w-[260px]">{progress.label}</span>
                  {progress.total > 0 && (
                    <span className="shrink-0 ml-2 tabular-nums font-medium">
                      {progress.done} / {progress.total}
                    </span>
                  )}
                </div>
                <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-300 ease-out"
                    style={{ width: progress.total > 0 ? `${Math.round((progress.done / progress.total) * 100)}%` : "0%" }}
                  />
                </div>
                {progress.total > 0 && (
                  <p className="text-center text-xs text-muted-foreground">
                    {Math.round((progress.done / progress.total) * 100)}% complete
                  </p>
                )}
              </div>
            </div>
          ) : done ? (
            <div className="py-12 text-center space-y-2">
              <div className="text-4xl mb-3">✓</div>
              <p className="text-sm font-semibold">Import complete</p>
              <p className="text-xs text-muted-foreground">
                {done.created > 0 && `${done.created} created`}
                {done.created > 0 && done.updated > 0 && " · "}
                {done.updated > 0 && `${done.updated} updated`}
              </p>
              <button onClick={onClose} className="mt-4 rounded-md bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
                Done
              </button>
            </div>
          ) : !parsed ? (
            /* Upload zone */
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileRef.current?.click()}
              className={`rounded-xl border-2 border-dashed px-8 py-14 text-center cursor-pointer transition-colors ${
                isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/20 hover:border-primary/50 hover:bg-muted/20"
              }`}
            >
              <input ref={fileRef} type="file" accept=".csv" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }} />
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
                className="mx-auto mb-3 text-muted-foreground">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
                <line x1="12" x2="12" y1="12" y2="18"/><line x1="9" x2="15" y1="15" y2="15"/>
              </svg>
              <p className="text-sm font-medium">Drop ConnectWise CSV here or click to browse</p>
              <p className="text-xs text-muted-foreground mt-1.5">In CW: Opportunities → Export → CSV · Lost opps are imported as Closed Lost for win rate tracking</p>
            </div>
          ) : (
            /* Preview */
            <div className="space-y-4">
              {/* Rep mapping */}
              {uniqueRepSlugs.length > 0 && (
                <div className="rounded-xl border bg-muted/20 p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold">Sales Reps</span>
                    {unresolvedReps.length === 0 ? (
                      <span className="text-[10px] text-emerald-600 font-medium">✓ all matched</span>
                    ) : (
                      <span className="text-[10px] text-amber-600 font-medium">{unresolvedReps.length} need mapping</span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                    {uniqueRepSlugs.map((slug) => {
                      const resolved = repMapping[slug] ?? null;
                      return (
                        <div key={slug} className="flex items-center gap-2">
                          <code className="text-xs bg-muted px-2 py-1 rounded font-mono w-24 shrink-0">{slug}</code>
                          <span className="text-xs text-muted-foreground shrink-0">→</span>
                          <div className="flex-1 min-w-0">
                            <UserPicker
                              value={resolved?.id ?? ""}
                              users={allUsers}
                              placeholder="Select person…"
                              onChange={(user) => setRepMapping((prev) => ({ ...prev, [slug]: user }))}
                            />
                          </div>
                          {resolved && (
                            <span className="text-[10px] text-emerald-600 font-medium shrink-0">✓</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {parsed.map((m) => {
                const allChecked = m.opps.every((_, i) => checked.has(oppKey(m.csvName, i)));
                const someChecked = m.opps.some((_, i) => checked.has(oppKey(m.csvName, i)));
                const matchedCompany = companies.find((c) => c.id === companyMatch[m.csvName]);
                const isNew = !companyMatch[m.csvName];

                return (
                  <div key={m.csvName} className="rounded-xl border bg-card overflow-hidden">
                    {/* Company row */}
                    <div className="flex items-center gap-3 px-4 py-3 bg-muted/20 border-b">
                      {/* Company checkbox */}
                      <input
                        type="checkbox"
                        checked={allChecked}
                        ref={(el) => { if (el) el.indeterminate = someChecked && !allChecked; }}
                        onChange={(e) => toggleAllForCompany(m.csvName, m.opps, e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300 shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-semibold">{m.csvName}</span>
                        <span className="text-xs text-muted-foreground ml-2">{m.opps.length} opp{m.opps.length !== 1 ? "s" : ""}</span>
                      </div>
                      {/* Company match dropdown */}
                      <div className="shrink-0">
                        <select
                          value={companyMatch[m.csvName] ?? ""}
                          onChange={(e) => setCompanyMatch((prev) => ({ ...prev, [m.csvName]: e.target.value }))}
                          className="text-xs rounded-md border px-2 py-1 bg-card max-w-[180px]"
                        >
                          <option value="">+ Create: {m.csvName}</option>
                          {companies.map((c) => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
                      </div>
                      {matchedCompany ? (
                        <span className="text-xs text-emerald-600 font-medium shrink-0">✓ matched</span>
                      ) : (
                        <span className="text-xs text-amber-600 font-medium shrink-0">new</span>
                      )}
                    </div>

                    {/* Opp rows */}
                    <ul className="divide-y">
                      {m.opps.map((o, i) => {
                        const key = oppKey(m.csvName, i);
                        const isChecked = checked.has(key);
                        const stage = stageOverride[key] ?? o.stage;
                        const statusCls = STATUS_CLS[o.cwStatus.toLowerCase()] ?? "bg-muted text-muted-foreground border-transparent";
                        const isLost = stage === "Closed Lost";
                        const isUpdate = existingOppLookup.has(key);
                        return (
                          <li key={i} className={`flex items-start gap-3 px-4 py-3 transition-colors ${!isChecked ? "opacity-40" : ""} ${isLost && isChecked ? "bg-red-50/40 dark:bg-red-900/5" : ""}`}>
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => toggleOpp(key)}
                              className="h-4 w-4 rounded border-gray-300 shrink-0 mt-0.5"
                            />
                            {/* Name + meta */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm font-medium leading-snug">{o.name}</span>
                                {isUpdate && (
                                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
                                    ↺ update
                                  </span>
                                )}
                                {isLost && (
                                  <span className="text-[11px] text-muted-foreground italic">win rate only</span>
                                )}
                              </div>
                              <div className="flex items-center gap-2.5 mt-1 text-xs text-muted-foreground flex-wrap">
                                {o.ownerName && (
                                  <span className="font-medium text-foreground/70">
                                    {repMapping[o.ownerName]?.name ?? o.ownerName}
                                  </span>
                                )}
                                {o.cwNumber && (
                                  <span className="font-mono text-[11px]">#{o.cwNumber}</span>
                                )}
                                {o.closeDate && (
                                  <span className="text-[11px]">closes {new Date(o.closeDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                                )}
                              </div>
                            </div>
                            {/* Right-side badges */}
                            <div className="flex items-center gap-2 shrink-0 pt-0.5">
                              <select
                                value={stage}
                                onChange={(e) => setStageOverride((prev) => ({ ...prev, [key]: e.target.value as OppStage }))}
                                disabled={!isChecked}
                                className={`text-[11px] font-semibold rounded-full px-2.5 py-1 border appearance-none cursor-pointer ${STAGE_COLORS[stage] ?? "bg-muted text-muted-foreground"}`}
                              >
                                {STAGE_OPTIONS.map((s) => (
                                  <option key={s} value={s}>{s}</option>
                                ))}
                              </select>
                              <span className={`text-[11px] font-medium rounded-full px-2.5 py-1 border ${statusCls}`}>
                                {o.cwStatus || "—"}
                              </span>
                              <span className="text-xs font-semibold tabular-nums w-20 text-right">
                                {o.value > 0 ? fmt(o.value) : ""}
                              </span>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                );
              })}
            </div>
          )}
          {error && <p className="text-sm text-destructive rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-2">{error}</p>}
        </div>

        {/* Footer */}
        {parsed && !done && !isImporting && (
          <div className="border-t px-6 py-4 flex items-center justify-between shrink-0">
            <button type="button" onClick={() => { setParsed(null); setError(null); }}
              className="text-xs text-muted-foreground hover:text-foreground">
              ← Upload different file
            </button>
            <div className="flex gap-2">
              <button type="button" onClick={onClose} className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted">Cancel</button>
              <button
                type="button"
                onClick={handleImport}
                disabled={isImporting || selectedCount === 0}
                className="rounded-md bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2"
              >
                {isImporting ? (
                  <><svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>Importing…</>
                ) : `Import ${selectedCount} Opportunit${selectedCount === 1 ? "y" : "ies"}`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
