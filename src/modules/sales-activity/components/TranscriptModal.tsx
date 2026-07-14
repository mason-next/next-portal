"use client";

import { useRef, useState } from "react";
import type { SalesCompany, SalesActivity, SalesContact, OppStage } from "@/types/sales";
import type { AppUser } from "@/types/user";
import { UserPicker, UserAvatar } from "@/components/shared/UserPicker";
import { ActivityLogForm } from "./ActivityLogForm";

interface TranscriptModalProps {
  companies: SalesCompany[];
  currentUser: string;
  isManagement?: boolean;
  onSave: (activity: Omit<SalesActivity, "id" | "createdAt" | "company" | "opportunity">) => void;
  onCreateCompany: (name: string, domain?: string) => Promise<SalesCompany>;
  onCreateOpportunity: (companyId: string, name: string, stage?: OppStage) => Promise<{ id: string; name: string }>;
  onClose: () => void;
}

interface ExtractedItem {
  companyId: string | null;
  companyName: string;
  isNewCompany: boolean;
  opportunityId: string | null;
  opportunityName: string | null;
  isNewOpportunity: boolean;
  activityType: SalesActivity["type"];
  activityDate: string | null;
  suggestedStage: string | null;
  contacts: SalesContact[];
  summary: string;
  actionItems: string[];
  // resolved after inline creation
  resolvedCompanyId?: string;
  resolvedOppId?: string;
  saved?: boolean;
  creating?: boolean;
}

export function TranscriptModal({
  companies, currentUser, isManagement,
  onSave, onCreateCompany, onCreateOpportunity, onClose,
}: TranscriptModalProps) {
  const [transcript, setTranscript] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [selectedReps, setSelectedReps] = useState<AppUser[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<ExtractedItem[] | null>(null);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function extractFile(file: File) {
    const name = file.name.toLowerCase();
    if (!name.endsWith(".txt") && !name.endsWith(".docx")) {
      setError("Only .txt and .docx files are supported.");
      return;
    }
    setIsExtracting(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/sales/extract-file", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setTranscript(data.text);
      setFileName(file.name);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to read file");
    } finally {
      setIsExtracting(false);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) extractFile(file);
  }

  async function handleParse() {
    if (!transcript.trim()) return;
    setIsParsing(true);
    setError(null);
    try {
      const res = await fetch("/api/sales/parse-transcript", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcript,
          reps: selectedReps.length > 0 ? selectedReps.map((r) => r.name).join(", ") : currentUser,
          companies: companies.map((c) => ({
            id: c.id,
            name: c.name,
            opportunities: (c.opportunities ?? []).map((o) => ({ id: o.id, name: o.name })),
          })),
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      const result = await res.json();
      const extracted: ExtractedItem[] = (result.items ?? [result]).map((item: ExtractedItem) => ({
        ...item,
        resolvedCompanyId: item.companyId ?? undefined,
        resolvedOppId: item.opportunityId ?? undefined,
      }));
      setItems(extracted);
      setEditingIdx(0);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to parse transcript");
    } finally {
      setIsParsing(false);
    }
  }

  async function createCompanyForItem(idx: number) {
    const item = items![idx];
    setItems((prev) => prev!.map((it, i) => i === idx ? { ...it, creating: true } : it));
    const company = await onCreateCompany(item.companyName);
    setItems((prev) => prev!.map((it, i) =>
      i === idx ? { ...it, creating: false, isNewCompany: false, resolvedCompanyId: company.id } : it
    ));
  }

  async function createOppForItem(idx: number) {
    const item = items![idx];
    const companyId = item.resolvedCompanyId ?? item.companyId;
    if (!companyId || !item.opportunityName) return;
    setItems((prev) => prev!.map((it, i) => i === idx ? { ...it, creating: true } : it));
    const opp = await onCreateOpportunity(companyId, item.opportunityName, item.suggestedStage as OppStage ?? "Prospecting");
    setItems((prev) => prev!.map((it, i) =>
      i === idx ? { ...it, creating: false, isNewOpportunity: false, resolvedOppId: opp.id } : it
    ));
  }

  function handleSaveItem(idx: number, activity: Omit<SalesActivity, "id" | "createdAt" | "company" | "opportunity">) {
    onSave(activity);
    setItems((prev) => prev!.map((it, i) => i === idx ? { ...it, saved: true } : it));
    setEditingIdx(null);
    // Auto-advance to next unsaved
    const next = items!.findIndex((it, i) => i > idx && !it.saved);
    if (next !== -1) setEditingIdx(next);
  }

  function reset() {
    setItems(null);
    setTranscript("");
    setFileName(null);
    setError(null);
    setEditingIdx(null);
    setSelectedReps([]);
  }

  const allSaved = items?.every((it) => it.saved);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-xl border bg-card shadow-xl">

        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-4 shrink-0">
          <div>
            <h2 className="text-base font-semibold">Import from Transcript</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {items ? `${items.length} company${items.length !== 1 ? " / companies" : ""} detected` : "Paste text or attach a .txt / .docx file"}
            </p>
          </div>
          <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground text-xl leading-none">×</button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">

          {/* ── Step 1: Input ── */}
          {!items && (
            <div className="space-y-3">
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileRef.current?.click()}
                className={`relative rounded-lg border-2 border-dashed px-4 py-5 text-center cursor-pointer transition-colors ${
                  isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/20 hover:border-primary/50 hover:bg-muted/30"
                }`}
              >
                <input ref={fileRef} type="file" accept=".txt,.docx" className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) extractFile(f); e.target.value = ""; }} />
                {isExtracting ? (
                  <p className="text-sm text-muted-foreground">Reading file…</p>
                ) : fileName ? (
                  <div className="flex items-center justify-center gap-2 text-sm">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary shrink-0">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
                    </svg>
                    <span className="font-medium">{fileName}</span>
                    <button type="button" onPointerDown={(e) => { e.stopPropagation(); reset(); }} className="text-muted-foreground hover:text-destructive text-xs ml-1">✕ Remove</button>
                  </div>
                ) : (
                  <div>
                    <p className="text-sm font-medium">Drop file here or click to browse</p>
                    <p className="text-xs text-muted-foreground mt-0.5">.txt or .docx · Teams transcript export</p>
                  </div>
                )}
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t" /></div>
                <div className="relative flex justify-center"><span className="bg-card px-3 text-xs text-muted-foreground">or paste directly</span></div>
              </div>

              <textarea
                value={transcript}
                onChange={(e) => { setTranscript(e.target.value); if (fileName) setFileName(null); }}
                rows={10}
                className="w-full rounded-lg border bg-background px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                placeholder="Paste the transcript text here…"
              />

              <div className="space-y-1">
                <span className="text-xs font-medium text-muted-foreground">Sales rep(s) on this call</span>
                {selectedReps.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-1.5">
                    {selectedReps.map((u) => (
                      <span key={u.id} className="inline-flex items-center gap-1.5 rounded-full border bg-muted/50 pl-1.5 pr-2 py-0.5 text-xs font-medium">
                        <UserAvatar user={u} size={16} />
                        {u.name}
                        <button
                          type="button"
                          onClick={() => setSelectedReps((prev) => prev.filter((r) => r.id !== u.id))}
                          className="text-muted-foreground hover:text-destructive ml-0.5"
                        >✕</button>
                      </span>
                    ))}
                  </div>
                )}
                <UserPicker
                  value=""
                  onChange={(u) => {
                    if (u && !selectedReps.some((r) => r.id === u.id)) {
                      setSelectedReps((prev) => [...prev, u]);
                    }
                  }}
                  placeholder={selectedReps.length > 0 ? "Add another rep…" : "Select reps on this call…"}
                />
                <p className="text-xs text-muted-foreground">Helps AI attribute action items to the right person</p>
              </div>

              {error && <p className="text-sm text-destructive">{error}</p>}

              <button
                type="button"
                onClick={handleParse}
                disabled={!transcript.trim() || isParsing}
                className="w-full rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {isParsing ? (
                  <><svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>Analyzing transcript…</>
                ) : "Generate Notes with AI →"}
              </button>
            </div>
          )}

          {/* ── Step 2: Review items ── */}
          {items && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <button type="button" onClick={reset} className="text-xs text-muted-foreground hover:text-foreground">← Re-paste</button>
                {allSaved && (
                  <span className="ml-auto text-xs text-emerald-600 font-medium">All saved ✓</span>
                )}
              </div>

              {/* Item tabs if multiple */}
              {items.length > 1 && (
                <div className="flex gap-1 flex-wrap">
                  {items.map((it, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setEditingIdx(editingIdx === i ? null : i)}
                      className={`rounded-full px-3 py-1 text-xs font-medium transition-colors border ${
                        it.saved ? "bg-emerald-50 border-emerald-200 text-emerald-700" :
                        editingIdx === i ? "bg-primary text-primary-foreground border-primary" :
                        "hover:bg-muted"
                      }`}
                    >
                      {it.saved ? "✓ " : ""}{it.companyName || `Item ${i + 1}`}
                    </button>
                  ))}
                </div>
              )}

              {/* Active item */}
              {items.map((item, idx) => (
                (editingIdx === idx || items.length === 1) && (
                  <div key={idx} className="space-y-3">
                    {/* AI summary card */}
                    <div className="rounded-lg border bg-violet-50 dark:bg-violet-900/10 p-4 space-y-3">
                      <span className="text-xs font-semibold text-violet-700 dark:text-violet-400 uppercase tracking-wide">AI Extracted</span>

                      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                        <div><span className="text-muted-foreground">Company:</span> <span className="font-medium">{item.companyName || "—"}</span></div>
                        {item.opportunityName && <div><span className="text-muted-foreground">Opportunity:</span> <span className="font-medium">{item.opportunityName}</span></div>}
                        {item.suggestedStage && <div><span className="text-muted-foreground">Stage:</span> <span className="font-medium">{item.suggestedStage}</span></div>}
                        <div><span className="text-muted-foreground">Type:</span> <span className="font-medium">{item.activityType}</span></div>
                      </div>

                      {/* New company banner */}
                      {item.isNewCompany && !item.resolvedCompanyId && (
                        <div className="flex items-center justify-between rounded-md border border-amber-200 bg-amber-50 dark:bg-amber-900/10 px-3 py-2">
                          <div>
                            <p className="text-xs font-medium text-amber-800 dark:text-amber-400">"{item.companyName}" is not in your CRM</p>
                            <p className="text-xs text-amber-600 dark:text-amber-500">Create it to link this activity</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => createCompanyForItem(idx)}
                            disabled={item.creating}
                            className="rounded-md bg-amber-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-700 disabled:opacity-50 shrink-0 ml-3"
                          >
                            {item.creating ? "Creating…" : "Create Company"}
                          </button>
                        </div>
                      )}
                      {item.isNewCompany && item.resolvedCompanyId && (
                        <p className="text-xs text-emerald-600 font-medium">✓ Company created</p>
                      )}

                      {/* New opportunity banner */}
                      {item.opportunityName && item.isNewOpportunity && !item.resolvedOppId && (item.resolvedCompanyId ?? item.companyId) && (
                        <div className="flex items-center justify-between rounded-md border border-blue-200 bg-blue-50 dark:bg-blue-900/10 px-3 py-2">
                          <div>
                            <p className="text-xs font-medium text-blue-800 dark:text-blue-400">"{item.opportunityName}" is a new opportunity</p>
                            <p className="text-xs text-blue-600 dark:text-blue-500">Create it under {item.companyName}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => createOppForItem(idx)}
                            disabled={item.creating}
                            className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50 shrink-0 ml-3"
                          >
                            {item.creating ? "Creating…" : "Create Opportunity"}
                          </button>
                        </div>
                      )}
                      {item.opportunityName && item.isNewOpportunity && item.resolvedOppId && (
                        <p className="text-xs text-emerald-600 font-medium">✓ Opportunity created</p>
                      )}

                      {/* AI Summary */}
                      {item.summary && (
                        <div>
                          <p className="text-xs font-semibold text-violet-700 dark:text-violet-400 mb-1">Summary</p>
                          <p className="text-xs text-muted-foreground leading-relaxed">{item.summary}</p>
                        </div>
                      )}

                      {/* Action Items */}
                      {item.actionItems.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-violet-700 dark:text-violet-400 mb-1">Follow-ups & Action Items</p>
                          <ul className="space-y-1">
                            {item.actionItems.map((ai, i) => (
                              <li key={i} className="flex items-start gap-1.5 text-xs">
                                <span className="mt-0.5 w-3.5 h-3.5 rounded border border-muted-foreground/30 flex-shrink-0 flex items-center justify-center text-[9px] text-muted-foreground">○</span>
                                <span className="text-foreground">{ai}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Contacts */}
                      {item.contacts.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-violet-700 dark:text-violet-400 mb-1">Contacts Mentioned</p>
                          <div className="flex flex-wrap gap-1.5">
                            {item.contacts.map((c, i) => (
                              <span key={i} className="inline-flex items-center gap-1 rounded-full bg-violet-100 dark:bg-violet-900/20 px-2 py-0.5 text-xs font-medium text-violet-700 dark:text-violet-300">
                                {c.name}{c.title ? ` · ${c.title}` : ""}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Review form */}
                    <p className="text-xs font-medium text-foreground">Review and save the activity log entry:</p>
                    <ActivityLogForm
                      companies={companies}
                      currentUser={currentUser}
                      isManagement={isManagement}
                      onSubmit={(activity) => handleSaveItem(idx, {
                        ...activity,
                        companyId: activity.companyId ?? item.resolvedCompanyId ?? null,
                        opportunityId: activity.opportunityId ?? item.resolvedOppId ?? null,
                      })}
                      onCancel={items.length > 1 ? () => setEditingIdx(null) : undefined}
                      prefill={{
                        type: item.activityType,
                        activityDate: item.activityDate ?? undefined,
                        repUserId: selectedReps[0]?.id,
                        repUserName: selectedReps[0]?.name,
                        description: [
                          item.summary,
                          item.actionItems.length > 0
                            ? `\n\nAction items:\n${item.actionItems.map((a) => `• ${a}`).join("\n")}`
                            : "",
                        ].join("").trim(),
                        contacts: item.contacts,
                        companyId: item.resolvedCompanyId ?? item.companyId ?? undefined,
                        opportunityId: item.resolvedOppId ?? item.opportunityId ?? undefined,
                        aiGenerated: true,
                      }}
                    />
                  </div>
                )
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
