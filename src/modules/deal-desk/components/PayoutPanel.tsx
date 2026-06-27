"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { calcProjectPayout, calcMemberPayouts } from "@/modules/deal-desk/lib/payout-calc";
import { fmtUSD, fmtPct } from "@/modules/deal-desk/lib/financial-calc";
import { useDealDeskUser } from "@/modules/deal-desk/hooks/useDealDeskUser";
import type { DealDeskQuote, PayoutMilestone, PayoutEvent } from "@/types/deal-desk";
import { DEFAULT_PAYOUT_MILESTONES } from "@/types/deal-desk";
import { cn } from "@/lib/utils";

interface PayoutPanelProps {
  quote: DealDeskQuote;
  onUpdate: (updated: DealDeskQuote) => void;
}

export function PayoutPanel({ quote, onUpdate }: PayoutPanelProps) {
  const { user, isManagement } = useDealDeskUser();
  const [showMilestoneEditor, setShowMilestoneEditor] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentPct, setPaymentPct] = useState("");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [editingMilestones, setEditingMilestones] = useState<PayoutMilestone[]>(quote.milestones);

  const summary = calcProjectPayout(quote);
  const memberRows = calcMemberPayouts(quote);
  const myRow = user.name ? memberRows.find((r) => r.name === user.name) : undefined;

  function updateBillingPct(pct: number) {
    onUpdate({ ...quote, billingCompletionPct: Math.min(100, Math.max(0, pct)) });
  }

  function recordPayment() {
    const pct = parseFloat(paymentPct);
    if (isNaN(pct) || pct <= 0) return;
    if (summary.paidPct + pct > 100) {
      alert(`This payment (${pct}%) would bring total paid to ${(summary.paidPct + pct).toFixed(1)}%, which exceeds 100%. Reduce the amount and try again.`);
      return;
    }
    const event: PayoutEvent = {
      id: crypto.randomUUID(),
      date: new Date().toISOString(),
      commissionPctReleased: pct,
      notes: paymentNotes.trim(),
      recordedBy: user.name || "Management",
    };
    onUpdate({ ...quote, payoutEvents: [...quote.payoutEvents, event] });
    setPaymentPct("");
    setPaymentNotes("");
    setShowPaymentForm(false);
  }

  function saveMilestones() {
    onUpdate({ ...quote, milestones: editingMilestones });
    setShowMilestoneEditor(false);
  }

  function resetMilestones() {
    const reset = DEFAULT_PAYOUT_MILESTONES.map((m) => ({ ...m, id: crypto.randomUUID() }));
    setEditingMilestones(reset);
  }

  function updateMilestone(id: string, field: keyof PayoutMilestone, value: string | number) {
    setEditingMilestones((prev) =>
      prev.map((m) => m.id === id ? { ...m, [field]: value } : m)
    );
  }

  function addMilestone() {
    setEditingMilestones((prev) => [
      ...prev,
      { id: crypto.randomUUID(), label: "New Milestone", triggerBillingPct: 0, commissionPct: 0 },
    ]);
  }

  function removeMilestone(id: string) {
    setEditingMilestones((prev) => prev.filter((m) => m.id !== id));
  }

  return (
    <div className="space-y-6">
      {/* Billing completion */}
      <div className="rounded-lg border bg-card p-5">
        <h3 className="text-sm font-semibold mb-4">Billing Completion</h3>
        <div className="flex items-center gap-4">
          <input
            type="range"
            min={0}
            max={100}
            value={quote.billingCompletionPct}
            onChange={(e) => isManagement && updateBillingPct(Number(e.target.value))}
            disabled={!isManagement}
            className="flex-1 accent-violet-600 disabled:opacity-50"
          />
          <div className="flex items-center gap-1">
            <input
              type="number"
              min={0}
              max={100}
              value={quote.billingCompletionPct}
              onChange={(e) => isManagement && updateBillingPct(Number(e.target.value))}
              disabled={!isManagement}
              className="w-16 rounded-md border bg-background px-2 py-1 text-sm tabular-nums text-center focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
            />
            <span className="text-sm text-muted-foreground">%</span>
          </div>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Total Commission",  value: fmtUSD(isManagement ? summary.totalCommissionCents : (myRow?.totalCents ?? 0)),  color: "text-foreground" },
          { label: "Earned (Triggered)", value: fmtUSD(isManagement ? summary.earnedCents : (myRow?.earnedCents ?? 0)), color: "text-emerald-700" },
          { label: "Paid Out",          value: fmtUSD(isManagement ? summary.paidCents : (myRow?.paidCents ?? 0)),   color: "text-blue-700" },
          { label: "Owed",              value: fmtUSD(isManagement ? summary.owedCents : (myRow?.owedCents ?? 0)),   color: "text-amber-700" },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-lg bg-muted/40 p-3">
            <div className="text-xs text-muted-foreground">{label}</div>
            <div className={cn("text-lg font-bold mt-0.5", color)}>{value}</div>
          </div>
        ))}
      </div>

      {/* Milestones */}
      <div className="rounded-lg border bg-card overflow-hidden">
        <div className="px-5 py-3 border-b bg-muted/30 flex items-center justify-between">
          <h3 className="text-sm font-semibold">Payout Milestones</h3>
          {isManagement && (
            <button
              type="button"
              onClick={() => { setEditingMilestones(quote.milestones); setShowMilestoneEditor(!showMilestoneEditor); }}
              className="text-xs text-primary hover:underline"
            >
              {showMilestoneEditor ? "Cancel" : "Edit"}
            </button>
          )}
        </div>

        {showMilestoneEditor ? (
          <div className="p-5 space-y-3">
            {editingMilestones.map((m, i) => (
              <div key={m.id} className="grid grid-cols-[1fr_auto_auto_auto] gap-2 items-center">
                <input
                  value={m.label}
                  onChange={(e) => updateMilestone(m.id, "label", e.target.value)}
                  placeholder="Label"
                  className="rounded-md border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <div className="flex items-center gap-1">
                  <span className="text-xs text-muted-foreground whitespace-nowrap">Trigger ≥</span>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={m.triggerBillingPct}
                    onChange={(e) => updateMilestone(m.id, "triggerBillingPct", Number(e.target.value))}
                    className="w-16 rounded-md border bg-background px-2 py-1.5 text-sm tabular-nums text-center focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <span className="text-xs text-muted-foreground">%</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-muted-foreground">Release</span>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={m.commissionPct}
                    onChange={(e) => updateMilestone(m.id, "commissionPct", Number(e.target.value))}
                    className="w-16 rounded-md border bg-background px-2 py-1.5 text-sm tabular-nums text-center focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <span className="text-xs text-muted-foreground">%</span>
                </div>
                <button
                  type="button"
                  onClick={() => removeMilestone(m.id)}
                  className="text-xs text-red-500 hover:text-red-700 px-1"
                >
                  ✕
                </button>
              </div>
            ))}
            {(() => {
              const milestoneSum = editingMilestones.reduce((s, m) => s + (m.commissionPct || 0), 0);
              if (milestoneSum !== 100) {
                return (
                  <p className="text-xs text-amber-600 font-medium">
                    Commission % values sum to {milestoneSum}% — they should total 100% to release the full pool.
                  </p>
                );
              }
            })()}
            <div className="flex gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={addMilestone}>+ Add Milestone</Button>
              <Button variant="outline" size="sm" onClick={resetMilestones}>Reset to 50/40/10</Button>
              <Button size="sm" onClick={saveMilestones}>Save Milestones</Button>
            </div>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/20">
              <tr>
                <th className="px-5 py-2.5 text-left text-xs text-muted-foreground">Milestone</th>
                <th className="px-5 py-2.5 text-right text-xs text-muted-foreground">Billing Trigger</th>
                <th className="px-5 py-2.5 text-right text-xs text-muted-foreground">Commission %</th>
                <th className="px-5 py-2.5 text-right text-xs text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {quote.milestones.map((m) => {
                const triggered = quote.billingCompletionPct >= m.triggerBillingPct;
                return (
                  <tr key={m.id} className={cn(triggered && "bg-emerald-50")}>
                    <td className="px-5 py-3 font-medium">{m.label}</td>
                    <td className="px-5 py-3 text-right tabular-nums">{m.triggerBillingPct}%</td>
                    <td className="px-5 py-3 text-right tabular-nums">{m.commissionPct}%</td>
                    <td className="px-5 py-3 text-right">
                      <span className={cn(
                        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold",
                        triggered
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-slate-100 text-slate-600"
                      )}>
                        {triggered ? "Earned" : "Pending"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Per-member payout breakdown — management only */}
      {isManagement && (
        <div className="rounded-lg border bg-card overflow-hidden">
          <div className="px-5 py-3 border-b bg-muted/30">
            <h3 className="text-sm font-semibold">Team Payout Breakdown</h3>
          </div>
          {memberRows.length === 0 ? (
            <p className="px-5 py-6 text-sm text-muted-foreground">No team members assigned.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-muted/20">
                <tr>
                  <th className="px-5 py-2.5 text-left text-xs text-muted-foreground">Name</th>
                  <th className="px-5 py-2.5 text-left text-xs text-muted-foreground">Role</th>
                  <th className="px-5 py-2.5 text-right text-xs text-muted-foreground">Total</th>
                  <th className="px-5 py-2.5 text-right text-xs text-muted-foreground">Earned</th>
                  <th className="px-5 py-2.5 text-right text-xs text-muted-foreground">Paid</th>
                  <th className="px-5 py-2.5 text-right text-xs text-muted-foreground">Owed</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {memberRows.map((r) => (
                  <tr key={r.memberId}>
                    <td className="px-5 py-3 font-medium">{r.name}</td>
                    <td className="px-5 py-3 text-muted-foreground">{r.role}</td>
                    <td className="px-5 py-3 text-right tabular-nums">{fmtUSD(r.totalCents)}</td>
                    <td className="px-5 py-3 text-right tabular-nums text-emerald-700">{fmtUSD(r.earnedCents)}</td>
                    <td className="px-5 py-3 text-right tabular-nums text-blue-700">{fmtUSD(r.paidCents)}</td>
                    <td className="px-5 py-3 text-right tabular-nums font-semibold text-amber-700">{fmtUSD(r.owedCents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Payment history + record */}
      {isManagement && (
        <div className="rounded-lg border bg-card overflow-hidden">
          <div className="px-5 py-3 border-b bg-muted/30 flex items-center justify-between">
            <h3 className="text-sm font-semibold">Payment History</h3>
            <Button size="sm" onClick={() => setShowPaymentForm(!showPaymentForm)}>
              {showPaymentForm ? "Cancel" : "+ Record Payment"}
            </Button>
          </div>

          {showPaymentForm && (
            <div className="p-5 border-b space-y-3 bg-muted/10">
              <p className="text-xs text-muted-foreground">
                Enter the % of total commission pool that was paid out in this payment.
                Current paid: {summary.paidPct.toFixed(1)}% · Earned: {summary.triggeredPct.toFixed(1)}%
              </p>
              <div className="flex gap-3 items-end">
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Commission % Released</label>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={paymentPct}
                      onChange={(e) => setPaymentPct(e.target.value)}
                      placeholder="50"
                      className="w-20 rounded-md border bg-background px-3 py-1.5 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                    <span className="text-sm text-muted-foreground">%</span>
                  </div>
                </div>
                <div className="flex-1">
                  <label className="text-xs text-muted-foreground block mb-1">Notes (optional)</label>
                  <input
                    value={paymentNotes}
                    onChange={(e) => setPaymentNotes(e.target.value)}
                    placeholder="Payment notes…"
                    className="w-full rounded-md border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <Button onClick={recordPayment}>Save</Button>
              </div>
            </div>
          )}

          {quote.payoutEvents.length === 0 ? (
            <p className="px-5 py-6 text-sm text-muted-foreground">No payments recorded yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-muted/20">
                <tr>
                  <th className="px-5 py-2.5 text-left text-xs text-muted-foreground">Date</th>
                  <th className="px-5 py-2.5 text-right text-xs text-muted-foreground">% Released</th>
                  <th className="px-5 py-2.5 text-right text-xs text-muted-foreground">Pool Amount</th>
                  <th className="px-5 py-2.5 text-left text-xs text-muted-foreground">Notes</th>
                  <th className="px-5 py-2.5 text-left text-xs text-muted-foreground">Recorded By</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {[...quote.payoutEvents].reverse().map((ev) => (
                  <tr key={ev.id}>
                    <td className="px-5 py-3 tabular-nums">{new Date(ev.date).toLocaleDateString()}</td>
                    <td className="px-5 py-3 text-right tabular-nums">{ev.commissionPctReleased}%</td>
                    <td className="px-5 py-3 text-right tabular-nums">{fmtUSD(Math.round((summary.totalCommissionCents * ev.commissionPctReleased) / 100))}</td>
                    <td className="px-5 py-3 text-muted-foreground">{ev.notes || "—"}</td>
                    <td className="px-5 py-3 text-muted-foreground">{ev.recordedBy}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
