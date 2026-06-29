"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { DealDeskQuote, DealStatus } from "@/types/deal-desk";
import { cn } from "@/lib/utils";

interface ApprovalPanelProps {
  quote: DealDeskQuote;
  onStatusChange: (status: DealStatus, comment: string) => void;
  onNotesChange: (notes: string) => void;
}

const STATUS_TONE: Record<DealStatus, string> = {
  Pending:  "bg-amber-100 text-amber-800 border-amber-200",
  Approved: "bg-emerald-100 text-emerald-800 border-emerald-200",
  Rejected: "bg-red-100 text-red-800 border-red-200",
};

const STATUS_DESC: Record<DealStatus, string> = {
  Pending:  "Commissions are estimated only. No payouts can be processed.",
  Approved: "Deal is approved. Commission payouts can now be tracked and processed.",
  Rejected: "Deal is rejected. Commission payouts are blocked.",
};

export function ApprovalPanel({ quote, onStatusChange, onNotesChange }: ApprovalPanelProps) {
  const [comment, setComment] = useState("");
  const [notes, setNotes] = useState(quote.executiveNotes);
  const [notesSaved, setNotesSaved] = useState(false);

  function handleAction(status: DealStatus) {
    onStatusChange(status, comment.trim());
    setComment("");
  }

  function handleNotesBlur() {
    if (notes === quote.executiveNotes) return;
    onNotesChange(notes);
    setNotesSaved(true);
    setTimeout(() => setNotesSaved(false), 2000);
  }

  return (
    <div className="space-y-6">
      {/* Current status */}
      <div className={cn("rounded-lg border p-5", STATUS_TONE[quote.status])}>
        <div className="text-xs font-medium mb-1 opacity-70">Current Status</div>
        <div className="text-2xl font-bold">{quote.status}</div>
        <p className="text-xs mt-2 opacity-80">{STATUS_DESC[quote.status]}</p>
      </div>

      {/* Take action */}
      <div className="rounded-lg border bg-card p-5 space-y-4">
        <div>
          <h3 className="text-sm font-semibold">Update Status</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Any comment you add is saved to the approval history and audit log.
          </p>
        </div>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={3}
          placeholder="Add a comment (optional — logged with the decision)…"
          className="w-full rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
        />
        <div className="flex gap-2">
          <Button
            onClick={() => handleAction("Approved")}
            disabled={quote.status === "Approved"}
            className="bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50"
          >
            Approve
          </Button>
          <Button
            variant="outline"
            onClick={() => handleAction("Rejected")}
            disabled={quote.status === "Rejected"}
            className="border-red-300 text-red-700 hover:bg-red-50 disabled:opacity-50"
          >
            Reject
          </Button>
          <Button
            variant="ghost"
            onClick={() => handleAction("Pending")}
            disabled={quote.status === "Pending"}
            className="disabled:opacity-50"
          >
            Mark Pending
          </Button>
        </div>
      </div>

      {/* Executive notes */}
      <div className="rounded-lg border bg-card p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold">Executive Notes</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Internal context, assumptions, exceptions, or deal conditions. Management only.
            </p>
          </div>
          {notesSaved && <span className="text-xs text-emerald-600 font-medium">Saved ✓</span>}
        </div>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={handleNotesBlur}
          rows={5}
          placeholder="Add internal notes about this deal…"
          className="w-full rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
        />
      </div>

      {/* Approval history */}
      {quote.approvalHistory.length > 0 && (
        <div className="rounded-lg border bg-card p-5">
          <h3 className="text-sm font-semibold mb-3">Approval History</h3>
          <div className="space-y-3">
            {[...quote.approvalHistory].reverse().map((event) => (
              <div key={event.id} className="border-l-2 border-muted pl-3">
                <div className="flex items-center gap-2 text-xs">
                  <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold border", STATUS_TONE[event.status])}>
                    {event.status}
                  </span>
                  <span className="font-medium">{event.user}</span>
                  <span className="text-muted-foreground">·</span>
                  <span className="text-muted-foreground">{new Date(event.timestamp).toLocaleString()}</span>
                </div>
                {event.comment && (
                  <p className="mt-1.5 text-sm text-muted-foreground italic">&ldquo;{event.comment}&rdquo;</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Audit log */}
      {quote.auditLog.length > 0 && (
        <div className="rounded-lg border bg-card p-5">
          <h3 className="text-sm font-semibold mb-3">Audit Log</h3>
          <div className="divide-y">
            {[...quote.auditLog].reverse().map((entry) => (
              <div key={entry.id} className="py-2 text-xs">
                <div className="font-medium text-foreground">{entry.action}</div>
                <div className="text-muted-foreground mt-0.5">{entry.detail}</div>
                <div className="text-muted-foreground/70 mt-0.5">{entry.user} · {new Date(entry.timestamp).toLocaleString()}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
