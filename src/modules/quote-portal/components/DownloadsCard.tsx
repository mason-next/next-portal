"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { deleteQuoteDownload, getQuoteDownloads, setQuoteDownloadLabel } from "@/lib/data/quote-portal";
import {
  DOWNLOAD_LABEL_PRESETS,
  MAX_DOWNLOAD_LABEL_LENGTH,
  normalizeDownloadLabel,
  type QuoteDownload,
} from "@/modules/quote-portal/lib/download-labels";

const CUSTOM = "__custom__";

function formatSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const isPreset = (label: string) => (DOWNLOAD_LABEL_PRESETS as readonly string[]).includes(label);

// ── Label picker: preset dropdown with a "Custom…" escape hatch ───────────────
// Callers pass key={value} so a saved label remounts the picker with fresh state.

function LabelPicker({
  value,
  onChange,
  disabled,
  ariaLabel,
}: {
  value: string;
  onChange: (label: string) => void;
  disabled?: boolean;
  ariaLabel: string;
}) {
  const [custom, setCustom] = useState(!isPreset(value));
  const [draft, setDraft] = useState(isPreset(value) ? "" : value);

  function commitDraft() {
    const clean = normalizeDownloadLabel(draft);
    if (clean && clean !== value) onChange(clean);
    if (!clean) { setDraft(isPreset(value) ? "" : value); if (isPreset(value)) setCustom(false); }
  }

  return (
    <div className="flex items-center gap-2">
      <select
        aria-label={ariaLabel}
        disabled={disabled}
        value={custom ? CUSTOM : value}
        onChange={(e) => {
          if (e.target.value === CUSTOM) { setCustom(true); setDraft(""); return; }
          setCustom(false);
          onChange(e.target.value);
        }}
        className="h-9 rounded-md border bg-background px-2.5 text-sm disabled:opacity-50"
      >
        {DOWNLOAD_LABEL_PRESETS.map((p) => (
          <option key={p} value={p}>{p}</option>
        ))}
        <option value={CUSTOM}>Custom…</option>
      </select>
      {custom && (
        <input
          autoFocus
          type="text"
          value={draft}
          maxLength={MAX_DOWNLOAD_LABEL_LENGTH}
          placeholder="e.g. Site Survey"
          disabled={disabled}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commitDraft}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); commitDraft(); } }}
          className="h-9 w-44 rounded-md border bg-background px-2.5 text-sm disabled:opacity-50"
        />
      )}
    </div>
  );
}

// ── Card ──────────────────────────────────────────────────────────────────────

export function DownloadsCard({ quoteId }: { quoteId: string }) {
  const [files, setFiles] = useState<QuoteDownload[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [newLabel, setNewLabel] = useState<string>("Proposal");
  const pdfRef = useRef<HTMLInputElement>(null);

  const load = useCallback(() => {
    getQuoteDownloads(quoteId)
      .then((list) => {
        setFiles(list);
        // Suggest a label for the next file that isn't already used.
        const used = new Set(list.map((f) => f.label));
        setNewLabel(DOWNLOAD_LABEL_PRESETS.find((p) => !used.has(p)) ?? "Proposal");
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Couldn't load files"));
  }, [quoteId]);

  useEffect(() => { load(); }, [load]);

  async function run(key: string, fn: () => Promise<void>) {
    setBusy(key); setError("");
    try { await fn(); load(); }
    catch (err) { setError(err instanceof Error ? err.message : "Something went wrong"); }
    finally { setBusy(null); }
  }

  function upload(file: File) {
    if (!file.name.toLowerCase().endsWith(".pdf")) { setError("Please select a .pdf file."); return; }
    run("upload", async () => {
      const form = new FormData();
      form.append("pdf_file", file);
      form.append("pdf_label", newLabel);
      const res = await fetch(`/api/quotes/${quoteId}/upload`, { method: "POST", body: form });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error ?? "Upload failed");
      }
    });
  }

  return (
    <div className="rounded-xl border bg-card">
      <div className="flex items-start justify-between gap-4 flex-wrap p-5 border-b">
        <div>
          <h2 className="text-base font-semibold">Customer downloads</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Each PDF gets its own button on the customer&apos;s page. Pick what the button says.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <LabelPicker key={newLabel} value={newLabel} onChange={setNewLabel} disabled={busy !== null} ariaLabel="Label for the next PDF" />
          <button
            type="button"
            onClick={() => pdfRef.current?.click()}
            disabled={busy !== null}
            className="inline-flex h-9 items-center gap-1.5 rounded-md border px-3 text-sm font-medium transition-colors hover:bg-muted disabled:opacity-50"
          >
            {busy === "upload" ? "Uploading…" : "Add PDF"}
          </button>
          <input
            ref={pdfRef}
            type="file"
            accept=".pdf"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ""; }}
          />
        </div>
      </div>

      {error && <p className="px-5 pt-3 text-sm text-destructive">{error}</p>}

      {files === null ? (
        <p className="p-5 text-sm text-muted-foreground">Loading…</p>
      ) : files.length === 0 ? (
        <p className="p-5 text-sm text-muted-foreground">
          No PDFs yet. Choose a label, then Add PDF. The customer page shows no download bar until you add one.
        </p>
      ) : (
        <ul className="divide-y">
          {files.map((f) => (
            <li key={f.file} className="flex items-center justify-between gap-4 flex-wrap px-5 py-3.5">
              <div className="min-w-0">
                <div className="truncate text-sm font-medium" title={f.file}>{f.file}</div>
                <div className="text-xs text-muted-foreground">
                  {formatSize(f.size)} · Button reads{" "}
                  <span className="font-medium text-foreground">&ldquo;Download {f.label}&rdquo;</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <LabelPicker
                  key={f.label}
                  value={f.label}
                  disabled={busy !== null}
                  ariaLabel={`Button label for ${f.file}`}
                  onChange={(label) => run(`label:${f.file}`, () => setQuoteDownloadLabel(quoteId, f.file, label))}
                />
                <button
                  type="button"
                  disabled={busy !== null}
                  onClick={() => {
                    if (!window.confirm(`Remove ${f.file}? Customers will no longer be able to download it.`)) return;
                    run(`del:${f.file}`, () => deleteQuoteDownload(quoteId, f.file));
                  }}
                  className="inline-flex h-9 items-center rounded-md border border-destructive/40 px-3 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-50"
                >
                  {busy === `del:${f.file}` ? "Removing…" : "Remove"}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
