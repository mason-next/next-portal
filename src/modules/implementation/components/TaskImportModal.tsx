"use client";

import { useState, useRef, type ChangeEvent, type DragEvent } from "react";
import { Upload, CheckCircle2, AlertCircle, AlertTriangle, FileText } from "lucide-react";
import { Modal } from "@/components/shared/Modal";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useUsersContext } from "@/components/shared/AppShell/UsersProvider";
import { parseDelimitedText } from "@/lib/csv/delimited-parser";
import type { TaskPriority } from "@/types/implementation";

// ─── Types ────────────────────────────────────────────────────────────────────

interface RawRow {
  title: string;
  project: string;
  priority: string;
  dueDate: string;
  assignedTo: string;
  description: string;
}

interface ValidatedRow {
  rowIndex: number;
  raw: RawRow;
  resolved?: {
    projectId: string | null;
    isPersonal: boolean;
    priority: TaskPriority;
    dueDate: string | null;
    assigneeIds: string[];
  };
  errors: string[];
  isDuplicate: boolean;
}

interface ImportSummary {
  created: number;
  duplicates: number;
  errors: number;
  personal: number;
  project: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function normalizePriority(val: string): TaskPriority | null {
  const v = val.trim().toLowerCase();
  if (v === "low" || v === "l" || v === "1") return "Low";
  if (v === "medium" || v === "med" || v === "m" || v === "2") return "Medium";
  if (v === "high" || v === "h" || v === "3") return "High";
  if (v === "critical" || v === "crit" || v === "c" || v === "4") return "Critical";
  return null;
}

function parseDueDate(val: string): string | null {
  if (!val.trim()) return null;
  // MM/DD/YYYY
  const match = val.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (match) {
    const [, m, d, y] = match;
    const date = new Date(Number(y), Number(m) - 1, Number(d));
    if (!isNaN(date.getTime())) return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  // Fallback: ISO or other parseable format
  const d = new Date(val);
  if (!isNaN(d.getTime())) return d.toISOString().split("T")[0];
  return null;
}

function findColIndex(headers: string[], aliases: string[]): number {
  for (const a of aliases) {
    const key = a.toLowerCase().trim();
    const idx = headers.findIndex((h) => h.toLowerCase().trim() === key);
    if (idx >= 0) return idx;
  }
  for (const a of aliases) {
    const key = a.toLowerCase().trim();
    const idx = headers.findIndex(
      (h) => h.toLowerCase().includes(key) || key.includes(h.toLowerCase().trim())
    );
    if (idx >= 0) return idx;
  }
  return -1;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function TaskImportModal({
  onClose,
  onImported,
}: {
  onClose: () => void;
  onImported: () => void;
}) {
  const { users } = useUsersContext();
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [projects, setProjects] = useState<{ id: string; name: string }[] | null>(null);
  const [previewRows, setPreviewRows] = useState<ValidatedRow[] | null>(null);
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [importing, setImporting] = useState(false);
  const [parsing, setParsing] = useState(false);

  async function ensureProjects() {
    if (projects) return projects;
    const data: { id: string; name: string }[] = await fetch("/api/projects/list")
      .then((r) => r.json())
      .catch(() => []);
    setProjects(data);
    return data;
  }

  async function processFile(file: File) {
    setFileName(file.name);
    setParsing(true);
    try {
      const text = await file.text();
      const grid = parseDelimitedText(text);
      if (grid.length < 2) {
        alert("CSV appears empty or has no data rows.");
        return;
      }

      const headers = grid[0];
      const dataRows = grid.slice(1).filter((r) => r.some((c) => c.trim()));

      const titleIdx    = findColIndex(headers, ["title", "task title", "task name", "name"]);
      const projectIdx  = findColIndex(headers, ["project", "project name"]);
      const priorityIdx = findColIndex(headers, ["priority"]);
      const dueDateIdx  = findColIndex(headers, ["due date", "duedate", "due"]);
      const assigneeIdx = findColIndex(headers, ["assigned to", "assignee", "assign to", "owner", "user"]);
      const descIdx     = findColIndex(headers, ["description", "desc", "notes", "details", "body"]);

      const projs = await ensureProjects();
      const projByName: Record<string, string> = {};
      for (const p of projs) projByName[p.name.toLowerCase().trim()] = p.id;

      const userByName: Record<string, string> = {};
      const userByEmail: Record<string, string> = {};
      for (const u of users) {
        if (u.name) userByName[u.name.toLowerCase().trim()] = u.id;
        if (u.email) userByEmail[u.email.toLowerCase().trim()] = u.id;
      }

      const get = (row: string[], idx: number) => (idx >= 0 ? row[idx] ?? "" : "").trim();

      const seenKeys = new Set<string>();
      const validated: ValidatedRow[] = dataRows.map((r, i) => {
        const raw: RawRow = {
          title:      get(r, titleIdx),
          project:    get(r, projectIdx),
          priority:   get(r, priorityIdx),
          dueDate:    get(r, dueDateIdx),
          assignedTo: get(r, assigneeIdx),
          description: get(r, descIdx),
        };

        const errors: string[] = [];

        if (!raw.title)    errors.push("Title is required");
        if (!raw.project)  errors.push("Project is required");
        if (!raw.priority) errors.push("Priority is required");
        if (!raw.dueDate)  errors.push("Due Date is required");
        if (!raw.assignedTo) errors.push("Assigned To is required");

        const priority = normalizePriority(raw.priority);
        if (raw.priority && !priority) errors.push(`Invalid priority "${raw.priority}" — use Low / Medium / High / Critical`);

        const dueDateIso = parseDueDate(raw.dueDate);
        if (raw.dueDate && !dueDateIso) errors.push(`Invalid date "${raw.dueDate}" — use MM/DD/YYYY`);

        let projectId: string | null = null;
        let isPersonal = false;
        if (raw.project) {
          const pLower = raw.project.toLowerCase().trim();
          if (pLower === "personal task (no project)" || pLower === "personal") {
            isPersonal = true;
          } else {
            const pid = projByName[pLower];
            if (pid) projectId = pid;
            else if (raw.project) errors.push(`Project not found: "${raw.project}"`);
          }
        }

        const byName  = userByName[raw.assignedTo.toLowerCase().trim()];
        const byEmail = userByEmail[raw.assignedTo.toLowerCase().trim()];
        const assigneeId = byName ?? byEmail ?? null;
        if (raw.assignedTo && !assigneeId) errors.push(`User not found: "${raw.assignedTo}"`);

        const batchKey = `${raw.title.toLowerCase()}|${assigneeId ?? ""}|${projectId ?? (isPersonal ? "personal" : "")}|${dueDateIso ?? ""}`;
        const isDuplicate = errors.length === 0 && seenKeys.has(batchKey);
        if (errors.length === 0 && !isDuplicate) seenKeys.add(batchKey);

        return {
          rowIndex: i + 2,
          raw,
          resolved: errors.length === 0 && priority && assigneeId
            ? { projectId, isPersonal, priority, dueDate: dueDateIso, assigneeIds: [assigneeId] }
            : undefined,
          errors,
          isDuplicate,
        };
      });

      setPreviewRows(validated);
    } finally {
      setParsing(false);
    }
  }

  async function handleImport() {
    if (!previewRows) return;
    const validRows = previewRows.filter((r) => r.resolved && !r.isDuplicate);
    if (!validRows.length) return;
    setImporting(true);
    try {
      const res = await fetch("/api/tasks/bulk-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rows: validRows.map((r) => ({
            title: r.raw.title,
            projectId: r.resolved!.projectId,
            isPersonal: r.resolved!.isPersonal,
            priority: r.resolved!.priority,
            dueDate: r.resolved!.dueDate,
            assigneeIds: r.resolved!.assigneeIds,
            description: r.raw.description,
          })),
        }),
      });
      const data: ImportSummary = await res.json();
      setSummary(data);
      onImported();
    } finally {
      setImporting(false);
    }
  }

  // ─── Done state ───────────────────────────────────────────────────────────

  if (summary) {
    return (
      <Modal open onClose={onClose}>
        <div className="flex items-center gap-2 mb-4">
          <CheckCircle2 className="size-5 text-emerald-500" />
          <h2 className="text-lg font-semibold">Import Complete</h2>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <SummaryCard label="Tasks Created"     value={summary.created}    color="green"  />
          <SummaryCard label="Duplicates Skipped" value={summary.duplicates} color="yellow" />
          <SummaryCard label="Errors"             value={summary.errors}     color="red"    />
          <SummaryCard label="Personal Tasks"     value={summary.personal}   color="blue"   />
          <SummaryCard label="Project Tasks"      value={summary.project}    color="purple" />
        </div>
        <div className="mt-5 flex justify-end">
          <Button onClick={onClose}>Close</Button>
        </div>
      </Modal>
    );
  }

  // ─── Preview state ────────────────────────────────────────────────────────

  if (previewRows) {
    const validCount = previewRows.filter((r) => r.resolved && !r.isDuplicate).length;
    const errorCount = previewRows.filter((r) => r.errors.length > 0).length;
    const dupCount   = previewRows.filter((r) => r.isDuplicate).length;

    return (
      <Modal open onClose={onClose}>
        <div className="flex items-start justify-between mb-4">
          <h2 className="text-lg font-semibold">Preview Import</h2>
          <div className="flex items-center gap-3 text-xs mt-1">
            <span className="text-emerald-600 dark:text-emerald-400 font-medium">{validCount} valid</span>
            {dupCount > 0 && (
              <span className="text-amber-600 dark:text-amber-400 font-medium">{dupCount} duplicate{dupCount !== 1 ? "s" : ""}</span>
            )}
            {errorCount > 0 && (
              <span className="text-red-600 dark:text-red-400 font-medium">{errorCount} error{errorCount !== 1 ? "s" : ""}</span>
            )}
          </div>
        </div>

        <div className="overflow-auto max-h-80 rounded-lg border text-xs">
          <table className="w-full border-collapse">
            <thead className="sticky top-0 bg-muted text-muted-foreground">
              <tr>
                <th className="px-2 py-2 text-left font-semibold w-8">#</th>
                <th className="px-2 py-2 text-left font-semibold">Title</th>
                <th className="px-2 py-2 text-left font-semibold">Project</th>
                <th className="px-2 py-2 text-left font-semibold">Priority</th>
                <th className="px-2 py-2 text-left font-semibold">Due</th>
                <th className="px-2 py-2 text-left font-semibold">Assignee</th>
                <th className="px-2 py-2 text-left font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {previewRows.map((row) => {
                const isValid = Boolean(row.resolved) && !row.isDuplicate;
                const isDup = row.isDuplicate;
                return (
                  <tr
                    key={row.rowIndex}
                    className={cn(
                      "border-t",
                      isValid ? "bg-emerald-50/50 dark:bg-emerald-950/20"
                      : isDup  ? "bg-amber-50/50 dark:bg-amber-950/20"
                      :          "bg-red-50/50 dark:bg-red-950/20"
                    )}
                  >
                    <td className="px-2 py-2 text-muted-foreground">{row.rowIndex}</td>
                    <td className="px-2 py-2 font-medium max-w-36 truncate" title={row.raw.title}>
                      {row.raw.title || <span className="italic text-muted-foreground/40">empty</span>}
                    </td>
                    <td className="px-2 py-2 max-w-28 truncate text-muted-foreground" title={row.raw.project}>
                      {row.raw.project}
                    </td>
                    <td className="px-2 py-2 text-muted-foreground">{row.raw.priority}</td>
                    <td className="px-2 py-2 text-muted-foreground whitespace-nowrap">{row.raw.dueDate}</td>
                    <td className="px-2 py-2 max-w-24 truncate text-muted-foreground" title={row.raw.assignedTo}>
                      {row.raw.assignedTo}
                    </td>
                    <td className="px-2 py-2 whitespace-nowrap">
                      {isValid ? (
                        <span className="flex items-center gap-1 text-emerald-700 dark:text-emerald-400">
                          <CheckCircle2 className="size-3" /> Valid
                        </span>
                      ) : isDup ? (
                        <span className="flex items-center gap-1 text-amber-700 dark:text-amber-400">
                          <AlertTriangle className="size-3" /> Duplicate
                        </span>
                      ) : (
                        <span
                          className="flex items-center gap-1 text-red-700 dark:text-red-400 cursor-help"
                          title={row.errors.join(" · ")}
                        >
                          <AlertCircle className="size-3 shrink-0" />
                          <span className="truncate max-w-32">{row.errors[0]}</span>
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => { setPreviewRows(null); setFileName(null); }}
            className="text-sm text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
          >
            ← Upload another file
          </button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button
              onClick={handleImport}
              disabled={importing || validCount === 0}
            >
              {importing
                ? "Importing…"
                : validCount === 0
                ? "No valid rows"
                : `Import ${validCount} Task${validCount !== 1 ? "s" : ""}`}
            </Button>
          </div>
        </div>
      </Modal>
    );
  }

  // ─── Upload state ─────────────────────────────────────────────────────────

  return (
    <Modal open onClose={onClose}>
      <h2 className="mb-4 text-lg font-semibold">Import Tasks from CSV</h2>

      <div className="mb-4 rounded-lg border bg-muted/30 p-3 text-xs space-y-1.5">
        <p className="font-semibold text-foreground text-sm">Expected CSV columns</p>
        <p className="font-mono text-muted-foreground">Title, Project, Priority, Due Date, Assigned To, Description</p>
        <div className="mt-2 space-y-0.5 text-muted-foreground">
          <p><strong>Project:</strong> exact project name or <code className="bg-muted px-1 rounded">Personal task (no project)</code></p>
          <p><strong>Priority:</strong> Low · Medium · High · Critical</p>
          <p><strong>Due Date:</strong> MM/DD/YYYY format</p>
          <p><strong>Assigned To:</strong> user&apos;s full name or email</p>
        </div>
      </div>

      <div
        onDragOver={(e: DragEvent) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e: DragEvent) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) processFile(f); }}
        onClick={() => fileRef.current?.click()}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed py-10 transition-colors select-none",
          dragging ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground/40 hover:bg-muted/20"
        )}
      >
        {parsing ? (
          <>
            <FileText className="size-8 text-primary animate-pulse" />
            <p className="text-sm font-medium text-primary">Parsing {fileName}…</p>
          </>
        ) : fileName ? (
          <>
            <CheckCircle2 className="size-8 text-emerald-500" />
            <p className="text-sm font-medium">{fileName}</p>
          </>
        ) : (
          <>
            <Upload className={cn("size-8", dragging ? "text-primary" : "text-muted-foreground/40")} />
            <div className="text-center">
              <p className="text-sm font-medium">Drop a CSV file here</p>
              <p className="text-xs text-muted-foreground mt-0.5">or click to browse</p>
            </div>
          </>
        )}
        <input
          ref={fileRef}
          type="file"
          accept=".csv,.tsv,.txt"
          className="hidden"
          onChange={(e: ChangeEvent<HTMLInputElement>) => {
            const f = e.target.files?.[0];
            if (f) processFile(f);
            e.target.value = "";
          }}
        />
      </div>

      <div className="mt-4 flex justify-end">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
      </div>
    </Modal>
  );
}

function SummaryCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: "green" | "yellow" | "red" | "blue" | "purple";
}) {
  const textClass = {
    green:  "text-emerald-700 dark:text-emerald-400",
    yellow: "text-amber-700 dark:text-amber-400",
    red:    "text-red-700 dark:text-red-400",
    blue:   "text-blue-700 dark:text-blue-400",
    purple: "text-purple-700 dark:text-purple-400",
  }[color];

  return (
    <div className="rounded-lg border p-3">
      <p className={cn("text-2xl font-bold tabular-nums", textClass)}>{value}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
    </div>
  );
}
