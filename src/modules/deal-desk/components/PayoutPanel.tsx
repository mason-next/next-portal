"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { calcProjectPayout, calcMemberPayouts } from "@/modules/deal-desk/lib/payout-calc";
import { fmtUSD } from "@/modules/deal-desk/lib/financial-calc";
import { useDealDeskUser } from "@/modules/deal-desk/hooks/useDealDeskUser";
import type { DealDeskQuote, PayoutMilestone, PayoutEvent } from "@/types/deal-desk";
import { DEFAULT_PAYOUT_MILESTONES, defaultMilestonesForType } from "@/types/deal-desk";
import { cn } from "@/lib/utils";

interface PayoutPanelProps {
  quote: DealDeskQuote;
  onUpdate: (updated: DealDeskQuote) => void;
}

export function PayoutPanel({ quote, onUpdate }: PayoutPanelProps) {
  const { userName, isManagement } = useDealDeskUser();
  const [showMilestoneEditor, setShowMilestoneEditor] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentPct, setPaymentPct] = useState("");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [editingMilestones, setEditingMilestones] = useState<PayoutMilestone[]>(quote.milestones);

  const summary = calcProjectPayout(quote);
  const memberRows = calcMemberPayouts(quote);
  const myRow = userName ? memberRows.find((r) => r.name === userName) : undefined;

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
      recordedBy: userName || "Management",
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
    const reset = defaultMilestonesForType(quote.projectType).map((m) => ({ ...m, id: crypto.randomUUID() }));
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

  const billingPct = quote.billingCompletionPct;

  return (
    <div className="space-y-6">
      {/* Billing completion — no slider, clean numeric input + step buttons */}
      <div className="rounded-lg border bg-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold">Billing Completion</h3>
          {isManagement && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={billingPct <= 0}
                onClick={() => updateBillingPct(billingPct - 10)}
                className="rounded border bg-background px-2 py-1 text-xs hover:bg-muted disabled:opacity-40"
              >
                −10%
              </button>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={billingPct}
                  onChange={(e) => updateBillingPct(Number(e.target.value))}
                  className="w-16 rounded-md border bg-background px-2 py-1 text-sm tabular-nums text-center focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <span className="text-sm text-muted-foreground">%</span>
              </div>
              <button
                type="button"
                disabled={billingPct >= 100}
                onClick={() => updateBillingPct(billingPct + 10)}
                className="rounded border bg-background px-2 py-1 text-xs hover:bg-muted disabled:opacity-40"
              >
                +10%
              </button>
            </div>
          )}
          {!isManagement && (
            <span className="text-lg font-bold tabular-nums">{billingPct}%</span>
          )}
        </div>

        {/* Milestone progress track */}
        <div className="relative">
          {/* Background track */}
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all duration-300"
              style={{ width: `${billingPct}%` }}
            />
          </div>

          {/* Milestone markers on the track */}
          <div className="relative mt-3">
            {quote.milestones.map((m) => {
              const pos = m.triggerBillingPct;
              const triggered = billingPct >= pos;
              return (
                <div
                  key={m.id}
                  className="absolute flex flex-col items-center"
                  style={{ left: `${pos}%`, transform: "translateX(-50%)" }}
                >
                  <div className={cn(
                    "w-2.5 h-2.5 rounded-full border-2 -mt-[18px]",
                    triggered
                      ? "bg-emerald-500 border-emerald-500"
                      : "bg-background border-muted-foreground/40"
                  )} />
                  <span className={cn(
                    "mt-1 text-[10px] text-center leading-tight whitespace-nowrap",
                    triggered ? "text-emerald-700 font-medium" : "text-muted-foreground"
                  )}>
                    {pos}%
                  </span>
                </div>
              );
            })}
          </div>
          <div className="mt-5 space-y-1">
            {quote.milestones.map((m) => {
              const triggered = billingPct >= m.triggerBillingPct;
              return (
                <div key={m.id} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      "w-1.5 h-1.5 rounded-full",
                      triggered ? "bg-emerald-500" : "bg-muted-foreground/30"
                    )} />
                    <span className={triggered ? "font-medium" : "text-muted-foreground"}>{m.label}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-muted-foreground">≥ {m.triggerBillingPct}% billed</span>
                    <span className={cn(
                      "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold",
                      triggered ? "bg-emerald-100 text-emerald-800" : "bg-muted text-muted-foreground"
                    )}>
                      {triggered ? `Earned · ${m.commissionPct}%` : `Pending · ${m.commissionPct}%`}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Total Commission",   value: fmtUSD(isManagement ? summary.totalCommissionCents : (myRow?.totalCents ?? 0)),  color: "text-foreground" },
          { label: "Earned (Triggered)", value: fmtUSD(isManagement ? summary.earnedCents : (myRow?.earnedCents ?? 0)), color: "text-emerald-700" },
          { label: "Paid Out",           value: fmtUSD(isManagement ? summary.paidCents : (myRow?.paidCents ?? 0)),   color: "text-blue-700" },
          { label: "Owed",               value: fmtUSD(isManagement ? summary.owedCents : (myRow?.owedCents ?? 0)),   color: "text-amber-700" },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-lg bg-muted/40 p-3">
            <div className="text-xs text-muted-foreground">{label}</div>
            <div className={cn("text-lg font-bold mt-0.5", color)}>{value}</div>
          </div>
        ))}
      </div>

      {/* Milestone editor — management only */}
      {isManagement && (
        <div className="rounded-lg border bg-card overflow-hidden">
          <div className="px-5 py-3 border-b bg-muted/30 flex items-center justify-between">
            <h3 className="text-sm font-semibold">Payout Milestones</h3>
            <button
              type="button"
              onClick={() => { setEditingMilestones(quote.milestones); setShowMilestoneEditor(!showMilestoneEditor); }}
              className="text-xs text-primary hover:underline"
            >
              {showMilestoneEditor ? "Cancel" : "Edit"}
            </button>
          </div>

          {showMilestoneEditor ? (
            <div className="p-5 space-y-3">
              {editingMilestones.map((m) => (
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
                      type="number" min={0} max={100}
                      value={m.triggerBillingPct}
                      onChange={(e) => updateMilestone(m.id, "triggerBillingPct", Number(e.target.value))}
                      className="w-16 rounded-md border bg-background px-2 py-1.5 text-sm tabular-nums text-center focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                    <span className="text-xs text-muted-foreground">%</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-muted-foreground">Release</span>
                    <input
                      type="number" min={0} max={100}
                      value={m.commissionPct}
                      onChange={(e) => updateMilestone(m.id, "commissionPct", Number(e.target.value))}
                      className="w-16 rounded-md border bg-background px-2 py-1.5 text-sm tabular-nums text-center focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                    <span className="text-xs text-muted-foreground">%</span>
                  </div>
                  <button type="button" onClick={() => removeMilestone(m.id)} className="text-xs text-red-500 hover:text-red-700 px-1">✕</button>
                </div>
              ))}
              {(() => {
                const milestoneSum = editingMilestones.reduce((s, m) => s + (m.commissionPct || 0), 0);
                if (milestoneSum !== 100) return (
                  <p className="text-xs text-amber-600 font-medium">
                    Commission % sum: {milestoneSum}% — should total 100% to release the full pool.
                  </p>
                );
              })()}
              <div className="flex gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={addMilestone}>+ Add Milestone</Button>
                <Button variant="outline" size="sm" onClick={resetMilestones}>Reset to Default</Button>
                <Button size="sm" onClick={saveMilestones}>Save Milestones</Button>
              </div>
            </div>
          ) : null}
        </div>
      )}

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

      {/* Payment history + record — management only */}
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
                Enter the % of total commission pool paid in this payment.
                Current paid: {summary.paidPct.toFixed(1)}% · Earned: {summary.triggeredPct.toFixed(1)}%
              </p>
              <div className="flex gap-3 items-end">
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Commission % Released</label>
                  <div className="flex items-center gap-1">
                    <input
                      type="number" min={0} max={100}
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
