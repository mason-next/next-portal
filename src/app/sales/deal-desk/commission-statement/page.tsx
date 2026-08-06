"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useDealDeskUser } from "@/modules/deal-desk/hooks/useDealDeskUser";
import { getWonOppsWithInvoices } from "@/lib/data/sales-activity";
import {
  calcCommissionStatement,
  parseQuarter,
  prevQuarter,
  fmtUSD,
  fmtBps,
  fmtDate,
} from "@/modules/deal-desk/lib/commission-statement";
import type { SalesOpportunity, SalesOppInvoice } from "@/types/sales";
import type { CommissionStatement } from "@/modules/deal-desk/lib/commission-statement";

// ─── Billing status badge ─────────────────────────────────────────────────────

const STATUS_STYLE = {
  Unbilled: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  Partial:  "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  Invoiced: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  Paid:     "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
};

function StatusBadge({ status }: { status: string }) {
  const cls = STATUS_STYLE[status as keyof typeof STATUS_STYLE] ?? "bg-muted text-muted-foreground";
  return <span className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold ${cls}`}>{status}</span>;
}

// ─── KPI card ────────────────────────────────────────────────────────────────

function KpiCard({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: string }) {
  return (
    <div className="rounded-lg border bg-card p-5 shadow-sm">
      <div className="mb-1 text-xs text-muted-foreground">{label}</div>
      <div className={`text-xl font-extrabold tracking-tight ${accent ?? ""}`}>{value}</div>
      {sub && <div className="mt-0.5 text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
}

// ─── Invoice detail section ───────────────────────────────────────────────────

function InvoiceDetail({ invoices, oppName }: { invoices: SalesOppInvoice[]; oppName: string }) {
  if (invoices.length === 0) return null;
  return (
    <div className="mt-2 ml-4 rounded-lg border bg-muted/20 overflow-hidden">
      <div className="px-3 py-1.5 border-b bg-muted/30 text-xs font-medium text-muted-foreground">{oppName} — Invoices</div>
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b bg-muted/10">
            <th className="px-3 py-1.5 text-left font-medium text-muted-foreground">Invoice #</th>
            <th className="px-3 py-1.5 text-left font-medium text-muted-foreground">Date</th>
            <th className="px-3 py-1.5 text-right font-medium text-muted-foreground">Subtotal</th>
            <th className="px-3 py-1.5 text-right font-medium text-muted-foreground">Balance</th>
            <th className="px-3 py-1.5 text-left font-medium text-muted-foreground">Status</th>
            <th className="px-3 py-1.5 text-left font-medium text-muted-foreground">Paid</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {invoices.map((inv) => (
            <tr key={inv.id} className="hover:bg-muted/20">
              <td className="px-3 py-1.5 font-medium">{inv.invoiceNumber || "—"}</td>
              <td className="px-3 py-1.5 text-muted-foreground">{fmtDate(inv.invoiceDate)}</td>
              <td className="px-3 py-1.5 text-right tabular-nums">{fmtUSD(inv.subtotalCents)}</td>
              <td className="px-3 py-1.5 text-right tabular-nums">{fmtUSD(inv.openBalanceCents)}</td>
              <td className="px-3 py-1.5"><StatusBadge status={inv.paymentStatus} /></td>
              <td className="px-3 py-1.5 text-muted-foreground">{fmtDate(inv.paymentDate)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

type WonOpp = SalesOpportunity & { invoices: SalesOppInvoice[]; children: SalesOpportunity[] };

export default function CommissionStatementPage() {
  const { userName, isManagement } = useDealDeskUser();

  const [opps, setOpps] = useState<WonOpp[]>([]);
  const [loading, setLoading] = useState(true);

  const [personFilter, setPersonFilter] = useState("");
  const [quarter, setQuarter] = useState("Q2 2026");
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  useEffect(() => {
    getWonOppsWithInvoices()
      .then(setOpps)
      .catch(() => setOpps([]))
      .finally(() => setLoading(false));
  }, []);

  // Auto-set person filter for non-management
  useEffect(() => {
    if (!isManagement && userName) setPersonFilter(userName);
  }, [isManagement, userName]);

  // All unique names that appear on any commission team
  const allPeople = useMemo(() => {
    const names = new Set<string>();
    for (const opp of opps) {
      for (const m of (opp.commissionTeam ?? [])) {
        if (m.name) names.add(m.name);
      }
    }
    return Array.from(names).sort();
  }, [opps]);

  const effectivePerson = isManagement ? personFilter : userName;

  const q2Range = useMemo(() => { try { return parseQuarter(quarter); } catch { return null; } }, [quarter]);
  const q1Range = useMemo(() => q2Range ? prevQuarter(q2Range) : null, [q2Range]);

  const statement: CommissionStatement | null = useMemo(() => {
    if (!effectivePerson) return null;
    try {
      return calcCommissionStatement(opps, effectivePerson, quarter);
    } catch {
      return null;
    }
  }, [opps, effectivePerson, quarter]);

  function toggleRow(id: string) {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  const quarters = [
    "Q1 2026", "Q2 2026", "Q3 2026", "Q4 2026",
    "Q1 2027", "Q2 2027",
  ];

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .print-show { display: block !important; }
          body { background: white; }
          .print-page { box-shadow: none !important; border: none !important; }
        }
        .print-show { display: none; }
      `}</style>

      <div className="mx-auto max-w-7xl p-8 space-y-6">
        {/* Breadcrumb */}
        <div className="no-print flex items-center gap-2 text-sm text-muted-foreground">
          <Link href="/sales" className="hover:text-foreground">Sales</Link>
          <span>/</span>
          <Link href="/sales/deal-desk" className="hover:text-foreground">Deal Desk</Link>
          <span>/</span>
          <span className="text-foreground font-medium">Commission Statement</span>
        </div>

        {/* Print header */}
        <div className="print-show border-b pb-4">
          <h1 className="text-2xl font-bold">Commission Statement</h1>
          {statement && (
            <p className="text-sm text-muted-foreground mt-1">
              {statement.personName} · {statement.reportQuarter} · Generated {new Date(statement.generatedAt).toLocaleDateString()}
            </p>
          )}
        </div>

        {/* Controls */}
        <div className="no-print flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Commission Statement</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Invoice-based commission tracking with 0/50/100 payout rule</p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            {isManagement && (
              <select
                value={personFilter}
                onChange={(e) => setPersonFilter(e.target.value)}
                className="rounded-md border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">— Select person —</option>
                {allPeople.map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            )}
            <select
              value={quarter}
              onChange={(e) => setQuarter(e.target.value)}
              className="rounded-md border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {quarters.map((q) => <option key={q} value={q}>{q}</option>)}
            </select>
            <button
              onClick={() => window.print()}
              className="rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted transition-colors"
            >
              Print / PDF
            </button>
          </div>
        </div>

        {loading ? (
          <div className="py-16 text-center text-sm text-muted-foreground">Loading…</div>
        ) : !effectivePerson ? (
          <div className="rounded-lg border bg-card p-12 text-center">
            <p className="text-sm text-muted-foreground">Select a person to generate their commission statement.</p>
          </div>
        ) : !statement || statement.rows.length === 0 ? (
          <div className="rounded-lg border bg-card p-12 text-center">
            <p className="text-sm text-muted-foreground">
              No Closed Won opportunities with a commission team entry for <strong>{effectivePerson}</strong>.
            </p>
            <p className="text-xs text-muted-foreground mt-1">Add this person to a commission team via the $ button on the Pipeline tab.</p>
          </div>
        ) : (
          <>
            {/* KPI cards */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <KpiCard
                label="Total Commission"
                value={fmtUSD(statement.totalCommCents)}
                sub={`${statement.rows.length} project${statement.rows.length !== 1 ? "s" : ""}`}
              />
              <KpiCard
                label={q1Range ? `${q1Range.label} Due` : "Prior Quarter Due"}
                value={fmtUSD(statement.q1TotalCents)}
                sub="Prior quarter earned"
                accent={statement.q1TotalCents > 0 ? "text-blue-700" : ""}
              />
              <KpiCard
                label={`${statement.reportQuarter} Payable`}
                value={fmtUSD(statement.q2TotalCents)}
                sub="This quarter incremental"
                accent={statement.q2TotalCents > 0 ? "text-emerald-700" : ""}
              />
              <KpiCard
                label="Future (Pending Billing)"
                value={fmtUSD(statement.futureTotalCents)}
                sub="Not yet invoiced or paid"
                accent={statement.futureTotalCents > 0 ? "text-amber-700" : ""}
              />
            </div>

            {/* At-a-Glance table */}
            <div className="rounded-xl border bg-card overflow-x-auto print-page">
              <div className="px-5 py-3 border-b bg-muted/30">
                <h2 className="text-sm font-semibold">At a Glance — {effectivePerson}</h2>
              </div>
              <table className="w-full text-sm">
                <thead className="bg-muted/20 border-b">
                  <tr>
                    <th className="px-4 py-2.5 text-left text-xs text-muted-foreground">Project</th>
                    <th className="px-4 py-2.5 text-right text-xs text-muted-foreground">Contract</th>
                    <th className="px-4 py-2.5 text-right text-xs text-muted-foreground">Invoiced</th>
                    <th className="px-4 py-2.5 text-right text-xs text-muted-foreground">Balance</th>
                    <th className="px-4 py-2.5 text-center text-xs text-muted-foreground">Status</th>
                    <th className="px-4 py-2.5 text-center text-xs text-muted-foreground">Rate</th>
                    <th className="px-4 py-2.5 text-right text-xs text-muted-foreground">Total Comm</th>
                    <th className="px-4 py-2.5 text-right text-xs text-muted-foreground">Q1 Due</th>
                    <th className="px-4 py-2.5 text-right text-xs text-muted-foreground">{quarter} Payable</th>
                    <th className="px-4 py-2.5 text-right text-xs text-muted-foreground">Future</th>
                    <th className="no-print px-4 py-2.5 w-8" />
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {statement.rows.map((row) => {
                    const expanded = expandedRows.has(row.opp.id);
                    return (
                      <React.Fragment key={row.opp.id}>
                        <tr className="hover:bg-muted/20 transition-colors">
                          <td className="px-4 py-3 font-medium max-w-[220px]">
                            <span className="truncate block" title={row.opp.name}>{row.opp.name}</span>
                            {row.opp.cwNumber && <span className="text-[10px] text-muted-foreground">CW #{row.opp.cwNumber}</span>}
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums">{fmtUSD(row.contractValueCents)}</td>
                          <td className="px-4 py-3 text-right tabular-nums">{fmtUSD(row.totalInvoicedCents)}</td>
                          <td className="px-4 py-3 text-right tabular-nums">{row.openBalanceCents > 0 ? fmtUSD(row.openBalanceCents) : "—"}</td>
                          <td className="px-4 py-3 text-center"><StatusBadge status={row.billingStatus} /></td>
                          <td className="px-4 py-3 text-center tabular-nums text-xs">{fmtBps(row.member.rateBps)}</td>
                          <td className="px-4 py-3 text-right tabular-nums font-semibold">{fmtUSD(row.totalCommCents)}</td>
                          <td className="px-4 py-3 text-right tabular-nums text-blue-700 font-medium">
                            {row.q1DueCents > 0 ? fmtUSD(row.q1DueCents) : "—"}
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums text-emerald-700 font-medium">
                            {row.q2PayableCents > 0 ? fmtUSD(row.q2PayableCents) : "—"}
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums text-amber-700">
                            {row.futureCents > 0 ? fmtUSD(row.futureCents) : "—"}
                          </td>
                          <td className="no-print px-4 py-3">
                            {row.invoices.length > 0 && (
                              <button
                                onClick={() => toggleRow(row.opp.id)}
                                className="text-muted-foreground hover:text-foreground transition-colors"
                                title={expanded ? "Hide invoices" : "Show invoices"}
                              >
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                  {expanded
                                    ? <polyline points="18 15 12 9 6 15" />
                                    : <polyline points="6 9 12 15 18 9" />}
                                </svg>
                              </button>
                            )}
                          </td>
                        </tr>
                        {/* Invoice detail row — always rendered, hidden via CSS unless expanded */}
                        {row.invoices.length > 0 && (
                          <tr className={expanded ? "" : "hidden print:table-row"}>
                            <td colSpan={11} className="px-4 pb-3">
                              <InvoiceDetail invoices={row.invoices} oppName={row.opp.name} />
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
                <tfoot className="border-t bg-muted/20">
                  <tr>
                    <td className="px-4 py-3 font-semibold text-sm" colSpan={1}>Totals</td>
                    <td className="px-4 py-3 text-right tabular-nums font-semibold">{fmtUSD(statement.totalContractCents)}</td>
                    <td className="px-4 py-3 text-right tabular-nums font-semibold">{fmtUSD(statement.totalInvoicedCents)}</td>
                    <td colSpan={3} />
                    <td className="px-4 py-3 text-right tabular-nums font-bold">{fmtUSD(statement.totalCommCents)}</td>
                    <td className="px-4 py-3 text-right tabular-nums font-bold text-blue-700">{fmtUSD(statement.q1TotalCents)}</td>
                    <td className="px-4 py-3 text-right tabular-nums font-bold text-emerald-700">{fmtUSD(statement.q2TotalCents)}</td>
                    <td className="px-4 py-3 text-right tabular-nums font-bold text-amber-700">{fmtUSD(statement.futureTotalCents)}</td>
                    <td className="no-print" />
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Payout rule legend */}
            <div className="no-print rounded-lg border bg-muted/20 px-5 py-3 text-xs text-muted-foreground">
              <span className="font-semibold text-foreground mr-2">Payout Rule:</span>
              0% until invoiced · 50% once any invoice is issued · 100% when fully invoiced and paid
            </div>
          </>
        )}
      </div>
    </>
  );
}
