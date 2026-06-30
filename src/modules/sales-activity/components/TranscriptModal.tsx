"use client";

import { useState } from "react";
import type { SalesCompany, SalesActivity, OppStage } from "@/types/sales";
import { ACTIVITY_TYPES } from "@/types/sales";
import { ActivityLogForm } from "./ActivityLogForm";

interface TranscriptModalProps {
  companies: SalesCompany[];
  currentUser: string;
  isManagement: boolean;
  onSave: (activity: Omit<SalesActivity, "id" | "createdAt" | "company" | "opportunity">) => Promise<unknown>;
  onCreateCompany: (name: string, domain?: string) => Promise<SalesCompany>;
  onCreateOpportunity: (companyId: string, name: string, stage?: OppStage) => Promise<{ id: string; name: string }>;
  onClose: () => void;
}

type Step = "paste" | "review";

interface ParsedActivity {
  type: SalesActivity["type"];
  description: string;
  companyName: string;
  contacts: { name: string; title: string }[];
  aiGenerated: boolean;
}

export function TranscriptModal({
  companies, currentUser, isManagement, onSave, onCreateCompany, onClose,
}: TranscriptModalProps) {
  const [step, setStep] = useState<Step>("paste");
  const [transcript, setTranscript] = useState("");
  const [parsing, setParsing] = useState(false);
  const [parsed, setParsed] = useState<ParsedActivity | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleParse() {
    if (!transcript.trim()) return;
    setParsing(true);
    setError(null);
    try {
      const res = await fetch("/api/sales/transcript-parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json() as ParsedActivity;
      setParsed(data);
      setStep("review");
    } catch {
      // Fall back: treat transcript as manual notes
      setParsed({
        type: "Call",
        description: transcript,
        companyName: "",
        contacts: [],
        aiGenerated: false,
      });
      setStep("review");
    } finally {
      setParsing(false);
    }
  }

  function skipToReview() {
    setParsed({
      type: "Call",
      description: transcript,
      companyName: "",
      contacts: [],
      aiGenerated: false,
    });
    setStep("review");
  }

  const matchedCompany = parsed?.companyName
    ? companies.find((c) => c.name.toLowerCase() === parsed.companyName.toLowerCase())
    : undefined;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl rounded-xl border bg-card shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div>
            <h2 className="text-base font-semibold">Import from Transcript</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Paste call notes or a transcript — we&apos;ll extract activity details
            </p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1 rounded hover:bg-muted">✕</button>
        </div>

        <div className="p-6">
          {step === "paste" && (
            <div className="space-y-4">
              <label className="block space-y-1.5">
                <span className="text-sm font-medium">Transcript / Notes</span>
                <textarea
                  value={transcript}
                  onChange={(e) => setTranscript(e.target.value)}
                  rows={10}
                  autoFocus
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-y font-mono"
                  placeholder="Paste your call transcript, meeting notes, or email thread here…"
                />
              </label>

              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}

              <div className="flex justify-between gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={skipToReview}
                    disabled={!transcript.trim()}
                    className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50"
                  >
                    Skip AI →
                  </button>
                  <button
                    type="button"
                    onClick={handleParse}
                    disabled={!transcript.trim() || parsing}
                    className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
                  >
                    {parsing ? "Parsing…" : "Parse with AI →"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {step === "review" && parsed && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setStep("paste")}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  ← Back
                </button>
                {parsed.aiGenerated && (
                  <span className="rounded-full bg-violet-100 text-violet-700 px-2 py-px text-xs font-medium">AI extracted</span>
                )}
                {matchedCompany && (
                  <span className="text-xs text-muted-foreground">Matched to: <strong>{matchedCompany.name}</strong></span>
                )}
              </div>

              <ActivityLogForm
                companies={companies}
                currentUser={currentUser}
                isManagement={isManagement}
                prefill={{
                  type: ACTIVITY_TYPES.includes(parsed.type) ? parsed.type : "Call",
                  description: parsed.description,
                  contacts: parsed.contacts,
                  companyId: matchedCompany?.id ?? "",
                  aiGenerated: parsed.aiGenerated,
                }}
                onSubmit={async (data) => {
                  await onSave(data);
                  onClose();
                }}
                onCancel={onClose}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
