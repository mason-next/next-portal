"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useDealDeskStore } from "@/modules/deal-desk/hooks/useDealDeskStore";
import { useDealDeskUser } from "@/modules/deal-desk/hooks/useDealDeskUser";
import { calcMemberPayouts } from "@/modules/deal-desk/lib/payout-calc";
import { calcFinancials, fmtUSD, fmtPct } from "@/modules/deal-desk/lib/financial-calc";
import { memberRateBps } from "@/modules/deal-desk/lib/commission-engine";

interface ReportRow {
  quoteId: string;
  projectName: string;
  customer: string;
  quarter: string;
  personName: string;
  role: string;
  rateBps: number;
  totalCents: number;
  earnedCents: number;
  paidCents: number;
  owedCents: number;
  billingPct: number;
  commissionStatus: string;
  dealStatus: string;
}

export default function CommissionReportPage() {
  const { quotes } = useDealDeskStore();
  const { isManagement } = useDealDeskUser();
  const [quarterFilter, setQuarterFilter] = useState("");
  const [personFilter, setPersonFilter] = useState("");

  const allQuarters = useMemo(() => {
    const qs = new Set(quotes.map((q) => q.quarter).filter(Boolean));
    return Array.from(qs).sort().reverse();
  }, [quotes]);

  const allPeople = useMemo(() => {
    const names = new Set<string>();
    for (const q of quotes) for (const m of q.team) if (m.name) names.add(m.name);
    return Array.from(names).sort();
  }, [quotes]);

  const rows = useMemo((): ReportRow[] => {
    return quotes.flatMap((quote) => {
      if (quarterFilter !== "unpaid" && quarterFilter && quote.quarter !== quarterFilter) return [];
      // Include all team members, even for $0 (no billing yet)
      const f = calcFinancials(quote.categories, quote.projectType);
      const memberRows = calcMemberPayouts(quote);
      return quote.team.map((member) => {
        const payout = memberRows.find((r) => r.memberId === member.id);
        return {
          quoteId: quote.id,
          projectName: quote.projectName,
          customer: quote.customer,
          quarter: quote.quarter,
          personName: member.name,
          role: member.role,
          rateBps: memberRateBps(member, f.band),
          totalCents: payout?.totalCents ?? 0,
          earnedCents: payout?.earnedCents ?? 0,
          paidCents: payout?.paidCents ?? 0,
          owedCents: payout?.owedCents ?? 0,
          billingPct: quote.billingCompletionPct,
          commissionStatus: quote.commissionStatus,
          dealStatus: quote.status,
        };
      }).filter((r) => {
        if (personFilter && r.personName !== personFilter) return false;
        if (quarterFilter === "unpaid" && r.owedCents <= 0) return false;
        return true;
      });
    });
  }, [quotes, quarterFilter, personFilter]);

  // Group by person for subtotals
  const grouped = useMemo(() => {
    const map = new Map<string, ReportRow[]>();
    for (const row of rows) {
      const list = map.get(row.personName) ?? [];
      list.push(row);
      map.set(row.personName, list);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [rows]);

  const totals = useMemo(() => ({
    totalCents:  rows.reduce((s, r) => s + r.totalCents, 0),
    earnedCents: rows.reduce((s, r) => s + r.earnedCents, 0),
    paidCents:   rows.reduce((s, r) => s + r.paidCents, 0),
    owedCents:   rows.reduce((s, r) => s + r.owedCents, 0),
  }), [rows]);

  function csvCell(val: string) { return `"${val.replace(/"/g, '""')}"`; }

  function exportCSV() {
    const headers = ["Person","Project","Customer","Quarter","Role","Rate %","Total Commission","Billing %","Earned","Paid","Owed","Commission Status","Deal Status"];
    const csvRows = rows.map((r) => [
      csvCell(r.personName), csvCell(r.projectName), csvCell(r.customer), csvCell(r.quarter),
      csvCell(r.role), (r.rateBps / 100).toFixed(2),
      (r.totalCents / 100).toFixed(2), r.billingPct.toFixed(0),
      (r.earnedCents / 100).toFixed(2), (r.paidCents / 100).toFixed(2),
      (r.owedCents / 100).toFixed(2), csvCell(r.commissionStatus), csvCell(r.dealStatus),
    ]);
    const totalRow = ['"TOTAL"','""','""','""','""','""',
      (totals.totalCents/100).toFixed(2),'""',
      (totals.earnedCents/100).toFixed(2),(totals.paidCents/100).toFixed(2),(totals.owedCents/100).toFixed(2),'""','""'];
    const csv = [headers.join(","), ...csvRows.map((r) => r.join(",")), totalRow.join(",")].join("\n");
    const label = [personFilter, quarterFilter === "unpaid" ? "unpaid" : quarterFilter].filter(Boolean).join("-") || "all";
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = `commission-report-${label}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  }

  if (!isManagement) {
    return (
      <div className="mx-auto max-w-4xl p-8">
        <p className="text-sm text-muted-foreground">Commission reports are available to management only.</p>
      </div>
    );
  }

  return (
    <>
      <style>{`@media print { .no-print { display:none!important } .print-header { display:block!important } } .print-header { display:none }`}</style>
      <div className="mx-auto max-w-7xl p-8 space-y-6">
        <div className="no-print flex items-center gap-2 text-sm text-muted-foreground">
          <Link href="/sales" className="hover:text-foreground">Sales</Link>
          <span>/</span>
          <Link href="/sales/deal-desk" className="hover:text-foreground">Deal Desk</Link>
          <span>/</span>
          <span className="text-foreground font-medium">Commission Report</span>
        </div>

        <div className="print-header mb-4">
          <h1 className="text-xl font-bold">
            {quarterFilter === "unpaid" ? "Unpaid Commissions" : "Commission Report"}
            {personFilter ? ` — ${personFilter}` : ""}
          </h1>
          <p className="text-sm text-muted-foreground">
            Generated {new Date().toLocaleDateString()}
            {quarterFilter && quarterFilter !== "unpaid" ? ` · ${quarterFilter}` : ""}
          </p>
        </div>

        <div className="no-print flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Commission Report</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {quarterFilter === "unpaid"
                ? "All unpaid commissions across all quarters — cashflow view"
                : "All team members across all projects — $0 shown for unearned commissions"}
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <select
              value={quarterFilter}
              onChange={(e) => setQuarterFilter(e.target.value)}
              className="rounded-md border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">All Quarters</option>
              <option value="unpaid">All Unpaid</option>
              {allQuarters.map((q) => <option key={q} value={q}>{q}</option>)}
            </select>
            <select
              value={personFilter}
              onChange={(e) => setPersonFilter(e.target.value)}
              className="rounded-md border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">All People</option>
              {allPeople.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
            {rows.length > 0 && (
              <>
                <button onClick={exportCSV} className="no-print rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted transition-colors">Export CSV</button>
                <button onClick={() => window.print()} className="no-print rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted transition-colors">Export PDF</button>
              </>
            )}
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Total Commission", value: fmtUSD(totals.totalCents), color: "text-foreground" },
            { label: "Earned (Triggered)", value: fmtUSD(totals.earnedCents), color: "text-emerald-700" },
            { label: "Paid Out", value: fmtUSD(totals.paidCents), color: "text-blue-700" },
            { label: "Owed", value: fmtUSD(totals.owedCents), color: "text-amber-700" },
          ].map(({ label, value, color }) => (
            <div key={label} className="rounded-lg bg-muted/40 p-4">
              <div className="text-xs text-muted-foreground">{label}</div>
              <div className={`text-xl font-bold mt-1 ${color}`}>{value}</div>
            </div>
          ))}
        </div>

        {rows.length === 0 ? (
          <div className="rounded-lg border bg-card p-12 text-center">
            <p className="text-sm text-muted-foreground">No team members assigned to any projects yet.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {grouped.map(([person, personRows]) => {
              const sub = {
                totalCents:  personRows.reduce((s, r) => s + r.totalCents, 0),
                earnedCents: personRows.reduce((s, r) => s + r.earnedCents, 0),
                paidCents:   personRows.reduce((s, r) => s + r.paidCents, 0),
                owedCents:   personRows.reduce((s, r) => s + r.owedCents, 0),
              };
              return (
                <div key={person} className="rounded-lg border bg-card overflow-hidden">
                  <div className="px-5 py-3 border-b bg-muted/30 flex items-center justify-between">
                    <h2 className="text-sm font-semibold">{person}</h2>
                    <div className="flex gap-6 text-xs tabular-nums text-muted-foreground">
                      <span>Total <span className="font-semibold text-foreground">{fmtUSD(sub.totalCents)}</span></span>
                      <span>Earned <span className="font-semibold text-emerald-700">{fmtUSD(sub.earnedCents)}</span></span>
                      <span>Paid <span className="font-semibold text-blue-700">{fmtUSD(sub.paidCents)}</span></span>
                      <span>Owed <span className="font-semibold text-amber-700">{fmtUSD(sub.owedCents)}</span></span>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/20">
                        <tr>
                          {["Project","Customer","Quarter","Role","Rate","Total","Billing","Earned","Paid","Owed","Status"].map((h) => (
                            <th key={h} className="px-4 py-2.5 text-left text-xs text-muted-foreground first:pl-5 last:pr-5">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {personRows.map((r) => (
                          <tr key={`${r.quoteId}-${r.personName}`} className="hover:bg-muted/20">
                            <td className="px-4 py-3 pl-5 font-medium">
                              <Link href={`/sales/deal-desk/${r.quoteId}`} className="hover:underline text-primary no-print">{r.projectName}</Link>
                              <span className="hidden print:inline">{r.projectName}</span>
                            </td>
                            <td className="px-4 py-3 text-muted-foreground">{r.customer}</td>
                            <td className="px-4 py-3 text-muted-foreground">{r.quarter || "—"}</td>
                            <td className="px-4 py-3 text-muted-foreground">{r.role}</td>
                            <td className="px-4 py-3 tabular-nums">{fmtPct(r.rateBps / 100, 2)}</td>
                            <td className="px-4 py-3 tabular-nums font-medium">{fmtUSD(r.totalCents)}</td>
                            <td className="px-4 py-3 tabular-nums">{r.billingPct}%</td>
                            <td className="px-4 py-3 tabular-nums text-emerald-700">{fmtUSD(r.earnedCents)}</td>
                            <td className="px-4 py-3 tabular-nums text-blue-700">{fmtUSD(r.paidCents)}</td>
                            <td className="px-4 py-3 tabular-nums font-semibold text-amber-700">{fmtUSD(r.owedCents)}</td>
                            <td className="px-4 py-3 pr-5">
                              <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">{r.commissionStatus}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
