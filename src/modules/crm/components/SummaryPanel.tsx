"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { summarizeNotes } from "@/lib/data/crm";
import { FilterSelect, MiniMarkdown, Panel, SecondaryButton } from "./ui";

/** On-demand AI digest of recent notes (all visible accounts, or one account). */
export function SummaryPanel({ companyId, defaultDays = 14, title = "AI summary of recent notes" }: {
  companyId?: string;
  defaultDays?: number;
  title?: string;
}) {
  const [days, setDays] = useState(String(defaultDays));
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ markdown: string; noteCount: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setLoading(true);
    setError(null);
    try {
      const res = await summarizeNotes({ companyId, days: Number(days) });
      if (res.error !== undefined) setError(res.error);
      else setResult(res);
    } catch {
      setError("Summary failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Panel
      title={<span className="inline-flex items-center gap-1.5"><Sparkles className="h-3.5 w-3.5 text-violet-500" />{title}</span>}
      actions={
        <>
          <FilterSelect label="Summary window" value={days} onChange={setDays}>
            <option value="7">Last 7 days</option>
            <option value="14">Last 14 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
          </FilterSelect>
          <SecondaryButton type="button" onClick={run} disabled={loading} className="h-8 text-xs">
            {loading ? "Summarizing…" : result ? "Refresh" : "Summarize"}
          </SecondaryButton>
        </>
      }
    >
      <div className="px-4 py-3">
        {error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : result ? (
          <>
            <MiniMarkdown text={result.markdown} />
            {result.noteCount > 0 && <p className="mt-3 text-[11px] text-muted-foreground">Generated from {result.noteCount} note{result.noteCount === 1 ? "" : "s"}. AI summaries can miss nuance — check the notes before acting.</p>}
          </>
        ) : (
          <p className="text-sm text-muted-foreground">Condense the notes from the selected window into headlines, per-account status, upcoming dates and suggested follow-ups.</p>
        )}
      </div>
    </Panel>
  );
}
