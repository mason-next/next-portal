"use client";

import { useRef, useState } from "react";
import type { SalesCompany, OppStage } from "@/types/sales";
import { OPP_STAGES } from "@/types/sales";

export interface CWImportPayload {
  companyMappings: { csvName: string; matchedId: string | null }[];
  selectedOpps: {
    resolvedCsvName: string;
    name: string;
    stage: OppStage;
    resolvedOwnerId: string | null;
    resolvedOwnerName: string;
    value: number;
    notes: string;
    cwNumber: string | null;
    closeDate: string | null;
  }[];
}

interface CsvRow {
  company: string;
  name: string;
  stage: OppStage;
  value: number;
  cwNumber: string | null;
  closeDate: string | null;
  ownerName: string;
}

interface CompanyMapping {
  csvName: string;
  matchedId: string | null;
}

interface CWImportModalProps {
  companies: SalesCompany[];
  onImport: (payload: CWImportPayload) => Promise<void>;
  onClose: () => void;
}

function normalizeStage(raw: string): OppStage {
  const map: Record<string, OppStage> = {
    prospecting: "Prospecting", qualifying: "Qualifying",
    proposal: "Proposal", negotiation: "Negotiation",
    "closed won": "Closed Won", closedwon: "Closed Won",
    "closed lost": "Closed Lost", closedlost: "Closed Lost",
  };
  return map[raw.toLowerCase().replace(/\s+/g, " ").trim()] ?? "Prospecting";
}

function parseCsv(text: string): CsvRow[] {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((h) => h.replace(/^"|"$/g, "").trim().toLowerCase());

  const col = (row: string[], keys: string[]) => {
    for (const k of keys) {
      const idx = headers.indexOf(k);
      if (idx >= 0) return row[idx]?.replace(/^"|"$/g, "").trim() ?? "";
    }
    return "";
  };

  return lines.slice(1).map((line) => {
    const row = line.split(",");
    const valueCents = Math.round(parseFloat(col(row, ["value", "amount", "total"]).replace(/[$,]/g, "")) * 100) || 0;
    const rawDate = col(row, ["close date", "closedate", "expected close", "close"]);
    let closeDate: string | null = null;
    if (rawDate) {
      const d = new Date(rawDate);
      if (!isNaN(d.getTime())) closeDate = d.toISOString().slice(0, 10);
    }
    return {
      company: col(row, ["company", "company name", "account", "account name"]),
      name: col(row, ["opportunity", "opportunity name", "name", "title"]),
      stage: normalizeStage(col(row, ["stage", "status", "phase"])),
      value: valueCents,
      cwNumber: col(row, ["cw #", "cw number", "opportunity id", "id"]) || null,
      closeDate,
      ownerName: col(row, ["owner", "sales rep", "rep", "assigned to"]),
    };
  }).filter((r) => r.company || r.name);
}

export function CWImportModal({ companies, onImport, onClose }: CWImportModalProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<CsvRow[]>([]);
  const [mappings, setMappings] = useState<CompanyMapping[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [step, setStep] = useState<"upload" | "map" | "confirm">("upload");
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleFile(file: File) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const parsed = parseCsv(text);
      if (parsed.length === 0) { setError("No rows found. Check CSV format."); return; }
      setRows(parsed);
      // Build unique company names and auto-match
      const unique = Array.from(new Set(parsed.map((r) => r.company).filter(Boolean)));
      setMappings(unique.map((csvName) => {
        const match = companies.find((c) => c.name.toLowerCase() === csvName.toLowerCase());
        return { csvName, matchedId: match?.id ?? null };
      }));
      setSelected(new Set(parsed.map((_, i) => i)));
      setStep("map");
      setError(null);
    };
    reader.readAsText(file);
  }

  async function handleImport() {
    setImporting(true);
    try {
      const selectedOpps = rows
        .filter((_, i) => selected.has(i))
        .map((r) => ({
          resolvedCsvName: r.company,
          name: r.name,
          stage: r.stage,
          resolvedOwnerId: null,
          resolvedOwnerName: r.ownerName,
          value: r.value,
          notes: "",
          cwNumber: r.cwNumber,
          closeDate: r.closeDate,
        }));
      await onImport({ companyMappings: mappings, selectedOpps });
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Import failed");
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-3xl rounded-xl border bg-card shadow-xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-4 shrink-0">
          <div>
            <h2 className="text-base font-semibold">Import ConnectWise Data</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Upload an opportunity CSV export from ConnectWise</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1 rounded hover:bg-muted">✕</button>
        </div>

        <div className="overflow-auto flex-1 p-6">
          {step === "upload" && (
            <div className="space-y-4">
              <div
                className="rounded-xl border-2 border-dashed p-12 text-center cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors"
                onClick={() => fileRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
              >
                <svg className="mx-auto mb-3 text-muted-foreground" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/>
                </svg>
                <p className="text-sm font-medium">Drop CSV file here or click to browse</p>
                <p className="text-xs text-muted-foreground mt-1">Columns: Company, Opportunity, Stage, Value, Close Date, Owner</p>
              </div>
              <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
              {error && <p className="text-sm text-destructive">{error}</p>}
              <div className="flex justify-end">
                <button onClick={onClose} className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors">Cancel</button>
              </div>
            </div>
          )}

          {step === "map" && (
            <div className="space-y-5">
              {mappings.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold mb-2">Company Matching</h3>
                  <div className="rounded-lg border divide-y text-sm">
                    {mappings.map((m, i) => (
                      <div key={m.csvName} className="flex items-center gap-3 px-3 py-2">
                        <span className="flex-1 font-medium">{m.csvName}</span>
                        <span className="text-muted-foreground text-xs">→</span>
                        <select
                          value={m.matchedId ?? "__new__"}
                          onChange={(e) => {
                            const v = e.target.value;
                            setMappings((prev) => prev.map((x, j) => j === i ? { ...x, matchedId: v === "__new__" ? null : v } : x));
                          }}
                          className="rounded border bg-background px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
                        >
                          <option value="__new__">+ Create new company</option>
                          {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold">Opportunities ({rows.length} found)</h3>
                  <div className="flex gap-2 text-xs">
                    <button onClick={() => setSelected(new Set(rows.map((_, i) => i)))} className="text-primary hover:underline">Select all</button>
                    <button onClick={() => setSelected(new Set())} className="text-primary hover:underline">Clear</button>
                  </div>
                </div>
                <div className="rounded-lg border divide-y text-sm">
                  {rows.map((r, i) => (
                    <label key={i} className="flex items-start gap-3 px-3 py-2 hover:bg-muted/30 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selected.has(i)}
                        onChange={(e) => setSelected((prev) => { const next = new Set(prev); e.target.checked ? next.add(i) : next.delete(i); return next; })}
                        className="mt-0.5"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium truncate">{r.name || "(unnamed)"}</span>
                          <span className="text-[10px] rounded-full bg-muted px-1.5 py-px">{r.stage}</span>
                          {r.cwNumber && <span className="text-[10px] text-muted-foreground">CW#{r.cwNumber}</span>}
                        </div>
                        <div className="flex gap-2 text-xs text-muted-foreground flex-wrap">
                          <span>{r.company}</span>
                          {r.value > 0 && <span>${(r.value / 100).toLocaleString()}</span>}
                          {r.closeDate && <span>{r.closeDate}</span>}
                          {r.ownerName && <span>{r.ownerName}</span>}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {error && <p className="text-sm text-destructive">{error}</p>}

              <div className="flex justify-between gap-3">
                <button onClick={() => setStep("upload")} className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors">← Back</button>
                <div className="flex gap-2">
                  <button onClick={onClose} className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors">Cancel</button>
                  <button
                    onClick={handleImport}
                    disabled={selected.size === 0 || importing}
                    className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
                  >
                    {importing ? "Importing…" : `Import ${selected.size} opportunit${selected.size === 1 ? "y" : "ies"}`}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
