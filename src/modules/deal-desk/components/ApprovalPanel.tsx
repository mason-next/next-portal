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

export function ApprovalPanel({ quote, onStatusChange, onNotesChange }: ApprovalPanelProps) {
  const [comment, setComment] = useState("");
  const [notes, setNotes] = useState(quote.executiveNotes);
  const [notesSaved, setNotesSaved] = useState(false);

  function handleAction(status: DealStatus) {
    onStatusChange(status, comment.trim());
    setComment("");
  }

  function handleSaveNotes() {
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
      </div>

      {/* Take action */}
      <div className="rounded-lg border bg-card p-5 space-y-4">
        <h3 className="text-sm font-semibold">Update Status</h3>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={3}
          placeholder="Optional comment…"
          className="w-full rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
        />
        <div className="flex gap-2">
          <Button onClick={() => handleAction("Approved")} className="bg-emerald-600 hover:bg-emerald-700 text-white">
            Approve
          </Button>
          <Button variant="outline" onClick={() => handleAction("Rejected")} className="border-red-300 text-red-700 hover:bg-red-50">
            Reject
          </Button>
          <Button variant="ghost" onClick={() => handleAction("Pending")}>
            Mark Pending
          </Button>
        </div>
      </div>

      {/* Executive notes */}
      <div className="rounded-lg border bg-card p-5 space-y-3">
        <h3 className="text-sm font-semibold">Executive Notes</h3>
        <p className="text-xs text-muted-foreground">Assumptions, risks, exceptions, and deal context.</p>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={6}
          className="w-full rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
        />
        <Button variant="outline" size="sm" onClick={handleSaveNotes}>
          {notesSaved ? "Saved ✓" : "Save Notes"}
        </Button>
      </div>

      {/* Approval history */}
      {quote.approvalHistory.length > 0 && (
        <div className="rounded-lg border bg-card p-5">
          <h3 className="text-sm font-semibold mb-3">Approval History</h3>
          <div className="space-y-3">
            {[...quote.approvalHistory].reverse().map((event) => (
              <div key={event.id} className="border-l-2 border-muted pl-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", STATUS_TONE[event.status])}>
                    {event.status}
                  </span>
                  <span>{event.user}</span>
                  <span>·</span>
                  <span>{new Date(event.timestamp).toLocaleString()}</span>
                </div>
                {event.comment && (
                  <p className="mt-1 text-sm">{event.comment}</p>
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
          <div className="space-y-2">
            {[...quote.auditLog].reverse().map((entry) => (
              <div key={entry.id} className="text-xs">
                <div className="font-medium">{entry.action}</div>
                <div className="text-muted-foreground">{entry.detail} · {entry.user} · {new Date(entry.timestamp).toLocaleString()}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
