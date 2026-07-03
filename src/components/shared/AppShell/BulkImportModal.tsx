"use client";

import { useRef, useState, type DragEvent, type ChangeEvent } from "react";
import {
  Upload,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/shared/Modal";
import type { ImportResponse } from "@/app/api/projects/import/route";

// ─── Destination field options ────────────────────────────────────────────────

const DB_FIELD_OPTIONS = [
  { value: "name",             label: "Project Name" },
  { value: "customerName",     label: "Customer / Company Name" },
  { value: "projectNumber",    label: "Project Number" },
  { value: "siteAddress",      label: "Location / Site Address" },
  { value: "coordinatorGroup", label: "Coordinator Group / Department" },
  { value: "projectTypes",     label: "Project Type(s)" },
  { value: "ignore",           label: "— Ignore / Don't Import —" },
] as const;

type DbField = typeof DB_FIELD_OPTIONS[number]["value"];
type Step = "upload" | "map" | "preview" | "importing" | "results";

// ─── Auto-mapping defaults ────────────────────────────────────────────────────

const AUTO_MAP: Record<string, DbField> = {
  "company name":           "customerName",
  "company":                "customerName",
  "customer name":          "customerName",
  "customer":               "customerName",
  "client name":            "customerName",
  "project name":           "name",
  "name":                   "name",
  "project number":         "projectNumber",
  "type":                   "projectTypes",
  "project type":           "projectTypes",
  "location":               "siteAddress",
  "site address":           "siteAddress",
  "address":                "siteAddress",
  "department":             "coordinatorGroup",
  "coordinator group":      "coordinatorGroup",
  // Fields with no database column — default to ignore.
  "status":                 "ignore",
  "percentage complete":    "ignore",
  "project board":          "ignore",
  "field project manager":  "ignore",
  "sales rep":              "ignore",
  "reason for kickback":    "ignore",
  "teams link":             "ignore",
  "selected_project_recid": "ignore",
};

function buildAutoMapping(headers: string[]): Record<string, DbField> {
  const m: Record<string, DbField> = {};
  for (const h of headers) {
    m[h] = AUTO_MAP[h.toLowerCase().trim()] ?? "ignore";
  }
  return m;
}

// ─── CSV parser ───────────────────────────────────────────────────────────────

interface ParsedCSV {
  headers: string[];
  rows: Record<string, string>[];
}

function parseCSV(text: string): ParsedCSV {
  // Strip UTF-8 BOM, normalize line endings.
  const cleaned = text.replace(/^﻿/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const lines = cleaned.split("\n");

  function parseLine(line: string): string[] {
    const fields: string[] = [];
    let cur = "";
    let inQ = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        if (inQ && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQ = !inQ;
        }
      } else if (c === "," && !inQ) {
        fields.push(cur.trim());
        cur = "";
      } else {
        cur += c;
      }
    }
    fields.push(cur.trim());
    return fields;
  }

  const nonEmpty = lines.filter((l) => l.trim());
  if (nonEmpty.length === 0) return { headers: [], rows: [] };

  const headers = parseLine(nonEmpty[0]);
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < nonEmpty.length; i++) {
    const vals = parseLine(nonEmpty[i]);
    if (vals.every((v) => !v)) continue;
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = vals[idx] ?? "";
    });
    rows.push(row);
  }

  return { headers, rows };
}

// ─── Client-side preview validation ──────────────────────────────────────────

const PROJECT_TYPE_NORM: Record<string, string> = {
  "audio visual": "Audio / Visual",
  "audio/visual": "Audio / Visual",
  "audio / visual": "Audio / Visual",
  "a/v": "Audio / Visual",
  "av": "Audio / Visual",
  "structured cabling": "Structured Cabling",
  "cabling": "Structured Cabling",
  "security": "Security",
  "box sale": "Box Sale",
};

function normalizeType(raw: string): string | null {
  return PROJECT_TYPE_NORM[raw.trim().toLowerCase()] ?? null;
}

function extractProjNum(name: string): string | null {
  const m = name.match(/^(\d+)\s*:/);
  return m ? m[1] : null;
}

interface PreviewRow {
  rowIndex: number;
  name: string;
  projectNumber: string;
  customerName: string;
  projectTypes: string[];
  status: "valid" | "warning" | "error";
  issues: string[];
}

function buildPreview(rows: Record<string, string>[], mapping: Record<string, DbField>): PreviewRow[] {
  return rows.map((row, i) => {
    let name = "";
    let customerName = "";
    let projectNumberMapped = "";
    let rawType = "";

    for (const [header, field] of Object.entries(mapping)) {
      if (field === "ignore") continue;
      const val = (row[header] ?? "").trim();
      if (field === "name") name = val;
      else if (field === "customerName") customerName = val;
      else if (field === "projectNumber") projectNumberMapped = val;
      else if (field === "projectTypes") rawType = val;
    }

    const issues: string[] = [];
    let hasError = false;

    if (!name) { issues.push("Missing Project Name"); hasError = true; }
    if (!customerName) { issues.push("Missing Company Name"); hasError = true; }

    let projectNumber = projectNumberMapped;
    if (!projectNumber) {
      const extracted = name ? extractProjNum(name) : null;
      if (extracted) {
        projectNumber = extracted;
      } else {
        projectNumber = "(auto-generated)";
        issues.push("No project number — will be auto-generated");
      }
    }

    let projectTypes: string[] = [];
    if (rawType) {
      const normalized = normalizeType(rawType);
      if (!normalized) {
        issues.push(`Unknown type: "${rawType}"`);
        hasError = true;
      } else {
        projectTypes = [normalized];
      }
    }

    return {
      rowIndex: i + 1,
      name: name || "(blank)",
      projectNumber,
      customerName: customerName || "(blank)",
      projectTypes,
      status: hasError ? "error" : issues.length > 0 ? "warning" : "valid",
      issues,
    };
  });
}

// ─── Component ────────────────────────────────────────────────────────────────

interface BulkImportModalProps {
  onClose: () => void;
  onDone: () => void;
}

export function BulkImportModal({ onClose, onDone }: BulkImportModalProps) {
  const [step, setStep] = useState<Step>("upload");
  const [parsed, setParsed] = useState<ParsedCSV | null>(null);
  const [mapping, setMapping] = useState<Record<string, DbField>>({});
  const [preview, setPreview] = useState<PreviewRow[]>([]);
  const [importResults, setImportResults] = useState<ImportResponse | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isWide = step === "map" || step === "preview";
  const modalClass = isWide ? "max-w-5xl" : "max-w-lg";

  function handleFile(file: File) {
    setUploadError(null);
    if (!file.name.toLowerCase().endsWith(".csv")) {
      setUploadError("Please select a CSV file (.csv).");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setUploadError("File must be under 5 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const result = parseCSV(text);
        if (result.headers.length === 0) {
          setUploadError("The CSV appears to be empty or could not be parsed.");
          return;
        }
        if (result.rows.length > 500) {
          setUploadError(`CSV has ${result.rows.length} rows — maximum is 500.`);
          return;
        }
        setParsed(result);
        setMapping(buildAutoMapping(result.headers));
        setStep("map");
      } catch {
        setUploadError("Could not parse the CSV. Please verify it is a valid CSV file.");
      }
    };
    reader.readAsText(file, "utf-8");
  }

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  function onFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    // Reset so the same file can be re-selected after going back.
    e.target.value = "";
  }

  function goToPreview() {
    if (!parsed) return;
    setPreview(buildPreview(parsed.rows, mapping));
    setStep("preview");
  }

  async function runImport() {
    if (!parsed) return;
    setStep("importing");
    try {
      const res = await fetch("/api/projects/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: parsed.rows, mapping }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error ?? `HTTP ${res.status}`);
      }
      const data = (await res.json()) as ImportResponse;
      setImportResults(data);
    } catch (err) {
      setImportResults({
        created: 0,
        skippedDuplicates: 0,
        failed: parsed.rows.length,
        results: [
          {
            rowIndex: 0,
            status: "error",
            reason: err instanceof Error ? err.message : "Unknown error",
          },
        ],
      });
    }
    setStep("results");
  }

  const nameMapped = Object.values(mapping).includes("name");
  const customerMapped = Object.values(mapping).includes("customerName");
  const canProceedToPreview = nameMapped && customerMapped;

  const validCount = preview.filter((r) => r.status !== "error").length;
  const errorCount = preview.filter((r) => r.status === "error").length;

  const handleClose = step === "importing" ? () => {} : onClose;

  return (
    <Modal open onClose={handleClose} className={modalClass}>

      {/* ── Step 1: Upload ──────────────────────────────────────────────────── */}
      {step === "upload" && (
        <>
          <div className="mb-5">
            <h2 className="text-lg font-semibold">Bulk Import Projects</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Upload a CSV to create multiple projects at once. Max 500 rows.
            </p>
          </div>

          <div
            role="button"
            tabIndex={0}
            aria-label="Upload CSV file"
            className={`flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-10 transition-colors cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-primary ${
              isDragging
                ? "border-primary bg-primary/5"
                : "border-input hover:border-muted-foreground"
            }`}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={onDrop}
            onClick={() => fileInputRef.current?.click()}
            onKeyDown={(e) => e.key === "Enter" && fileInputRef.current?.click()}
          >
            <Upload className="size-8 text-muted-foreground" />
            <div className="text-center">
              <p className="text-sm font-medium">Drop a CSV here or click to browse</p>
              <p className="mt-0.5 text-xs text-muted-foreground">CSV only · Max 500 rows · Max 5 MB</p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              className="sr-only"
              onChange={onFileChange}
            />
          </div>

          {uploadError && (
            <p className="mt-3 flex items-center gap-1.5 text-sm text-destructive">
              <XCircle className="size-4 shrink-0" />
              {uploadError}
            </p>
          )}

          <div className="mt-6 flex justify-end">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </>
      )}

      {/* ── Step 2: Map ─────────────────────────────────────────────────────── */}
      {step === "map" && parsed && (
        <>
          <div className="mb-4">
            <h2 className="text-lg font-semibold">Map CSV Columns</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {parsed.rows.length} row{parsed.rows.length !== 1 ? "s" : ""} detected · Assign each
              CSV column to a destination field. Unmapped columns are ignored.
            </p>
          </div>

          {(!nameMapped || !customerMapped) && (
            <div className="mb-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-800 dark:border-amber-800/40 dark:bg-amber-950/30 dark:text-amber-300">
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
              <span>
                Map at least one column to{" "}
                <strong>Project Name</strong>
                {!customerMapped && (
                  <>
                    {" "}and <strong>Customer / Company Name</strong>
                  </>
                )}{" "}
                to continue.
              </span>
            </div>
          )}

          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/50">
                <tr>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    CSV Column
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Sample Value
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Maps To
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {parsed.headers.map((header) => {
                  const sample = parsed.rows[0]?.[header] ?? "";
                  const current = mapping[header] ?? "ignore";
                  return (
                    <tr key={header} className="hover:bg-muted/20">
                      <td className="px-4 py-2.5 font-mono text-xs font-medium">{header}</td>
                      <td
                        className="max-w-[200px] truncate px-4 py-2.5 text-muted-foreground"
                        title={sample}
                      >
                        {sample || <span className="italic opacity-50">empty</span>}
                      </td>
                      <td className="px-4 py-2.5">
                        <select
                          className="h-8 w-full max-w-[260px] rounded-md border border-input bg-background px-2 text-sm outline-none focus:border-primary"
                          value={current}
                          onChange={(e) =>
                            setMapping((prev) => ({
                              ...prev,
                              [header]: e.target.value as DbField,
                            }))
                          }
                        >
                          {DB_FIELD_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-5 flex justify-between">
            <Button variant="outline" onClick={() => setStep("upload")}>
              <ChevronLeft className="mr-1 size-4" />
              Back
            </Button>
            <Button onClick={goToPreview} disabled={!canProceedToPreview}>
              Preview
              <ChevronRight className="ml-1 size-4" />
            </Button>
          </div>
        </>
      )}

      {/* ── Step 3: Preview ─────────────────────────────────────────────────── */}
      {step === "preview" && (
        <>
          <div className="mb-4">
            <h2 className="text-lg font-semibold">Preview Import</h2>
            <div className="mt-1 flex flex-wrap items-center gap-3 text-sm">
              <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="size-4" />
                {validCount} ready to import
              </span>
              {errorCount > 0 && (
                <span className="flex items-center gap-1 text-destructive">
                  <XCircle className="size-4" />
                  {errorCount} will be skipped
                </span>
              )}
            </div>
          </div>

          <div className="max-h-[420px] overflow-y-auto overflow-x-auto rounded-lg border">
            <table className="w-full text-xs">
              <thead className="sticky top-0 border-b bg-card">
                <tr>
                  <th className="px-3 py-2.5 text-left font-semibold text-muted-foreground">#</th>
                  <th className="w-8 px-3 py-2.5" />
                  <th className="px-3 py-2.5 text-left font-semibold text-muted-foreground">Project Name</th>
                  <th className="px-3 py-2.5 text-left font-semibold text-muted-foreground">Proj #</th>
                  <th className="px-3 py-2.5 text-left font-semibold text-muted-foreground">Customer</th>
                  <th className="px-3 py-2.5 text-left font-semibold text-muted-foreground">Type</th>
                  <th className="px-3 py-2.5 text-left font-semibold text-muted-foreground">Note</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {preview.map((row) => (
                  <tr
                    key={row.rowIndex}
                    className={
                      row.status === "error"
                        ? "bg-destructive/5 text-muted-foreground"
                        : row.status === "warning"
                        ? "bg-amber-50/60 dark:bg-amber-950/10"
                        : undefined
                    }
                  >
                    <td className="px-3 py-2 text-muted-foreground">{row.rowIndex}</td>
                    <td className="px-3 py-2">
                      {row.status === "valid" && (
                        <CheckCircle2 className="size-3.5 text-emerald-500" />
                      )}
                      {row.status === "warning" && (
                        <AlertCircle className="size-3.5 text-amber-500" />
                      )}
                      {row.status === "error" && (
                        <XCircle className="size-3.5 text-destructive" />
                      )}
                    </td>
                    <td
                      className="max-w-[200px] truncate px-3 py-2 font-medium"
                      title={row.name}
                    >
                      {row.name}
                    </td>
                    <td className="px-3 py-2 font-mono text-muted-foreground">{row.projectNumber}</td>
                    <td
                      className="max-w-[140px] truncate px-3 py-2 text-muted-foreground"
                      title={row.customerName}
                    >
                      {row.customerName}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {row.projectTypes.join(", ") || "—"}
                    </td>
                    <td
                      className="max-w-[200px] truncate px-3 py-2 text-muted-foreground"
                      title={row.issues.join("; ")}
                    >
                      {row.issues.join("; ") || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-5 flex justify-between">
            <Button variant="outline" onClick={() => setStep("map")}>
              <ChevronLeft className="mr-1 size-4" />
              Back
            </Button>
            <Button onClick={runImport} disabled={validCount === 0}>
              Import {validCount} Project{validCount !== 1 ? "s" : ""}
              <ChevronRight className="ml-1 size-4" />
            </Button>
          </div>
        </>
      )}

      {/* ── Step 4: Importing ───────────────────────────────────────────────── */}
      {step === "importing" && (
        <div className="flex flex-col items-center justify-center gap-4 py-14">
          <Loader2 className="size-8 animate-spin text-primary" />
          <div className="text-center">
            <p className="font-medium">Importing projects…</p>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Do not close this window.
            </p>
          </div>
        </div>
      )}

      {/* ── Step 5: Results ─────────────────────────────────────────────────── */}
      {step === "results" && importResults && (
        <>
          <div className="mb-5">
            <h2 className="text-lg font-semibold">Import Complete</h2>
          </div>

          <div className="mb-5 grid grid-cols-3 gap-3">
            <div className="rounded-lg border bg-emerald-50 p-4 text-center dark:bg-emerald-950/20">
              <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {importResults.created}
              </div>
              <div className="mt-0.5 text-xs text-muted-foreground">Created</div>
            </div>
            <div className="rounded-lg border bg-amber-50 p-4 text-center dark:bg-amber-950/20">
              <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                {importResults.skippedDuplicates}
              </div>
              <div className="mt-0.5 text-xs text-muted-foreground">Skipped (Duplicate)</div>
            </div>
            <div className="rounded-lg border bg-red-50 p-4 text-center dark:bg-red-950/20">
              <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                {importResults.failed}
              </div>
              <div className="mt-0.5 text-xs text-muted-foreground">Failed</div>
            </div>
          </div>

          {(importResults.skippedDuplicates > 0 || importResults.failed > 0) && (
            <div className="mb-5 overflow-hidden rounded-lg border">
              <div className="border-b bg-muted/40 px-4 py-2 text-xs font-semibold text-muted-foreground">
                Row Details
              </div>
              <div className="max-h-52 overflow-y-auto">
                <table className="w-full text-xs">
                  <tbody className="divide-y">
                    {importResults.results
                      .filter((r) => r.status !== "created")
                      .map((r) => (
                        <tr key={`${r.rowIndex}-${r.status}`} className="hover:bg-muted/20">
                          <td className="w-16 px-3 py-2 text-muted-foreground">
                            {r.rowIndex > 0 ? `Row ${r.rowIndex}` : "—"}
                          </td>
                          <td className="px-3 py-2">
                            {r.status === "duplicate" ? (
                              <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400">
                                <AlertCircle className="size-3" />
                                Duplicate
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-destructive">
                                <XCircle className="size-3" />
                                Error
                              </span>
                            )}
                          </td>
                          <td
                            className="max-w-[300px] truncate px-3 py-2 text-muted-foreground"
                            title={r.reason}
                          >
                            {r.reason}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
            {importResults.created > 0 && (
              <Button onClick={onDone}>View Projects</Button>
            )}
          </div>
        </>
      )}
    </Modal>
  );
}
