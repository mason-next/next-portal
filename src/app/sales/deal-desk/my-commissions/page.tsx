"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useDealDeskStore } from "@/modules/deal-desk/hooks/useDealDeskStore";
import { useDealDeskUser } from "@/modules/deal-desk/hooks/useDealDeskUser";
import { calcMemberPayouts } from "@/modules/deal-desk/lib/payout-calc";
import { calcFinancials, fmtUSD, fmtPct } from "@/modules/deal-desk/lib/financial-calc";
import { memberRateBps } from "@/modules/deal-desk/lib/commission-engine";
import type { DealDeskRole } from "@/types/deal-desk";

interface ProjectRow {
  quoteId: string; projectName: string; customer: string; quarter: string;
  role: string; rateBps: number; totalCents: number; earnedCents: number;
  paidCents: number; owedCents: number; billingPct: number; commissionStatus: string;
}

export default function MyCommissionsPage() {
  const { quotes } = useDealDeskStore();
  const { user, setUser } = useDealDeskUser();
  const [quarterFilter, setQuarterFilter] = useState("");

  const allNames = useMemo(() => {
    const names = new Set<string>();
    for (const q of quotes) for (const m of q.team) if (m.name) names.add(m.name);
    return Array.from(names).sort();
  }, [quotes]);

  const allQuarters = useMemo(() => {
    const qs = new Set(quotes.map((q) => q.quarter).filter(Boolean));
    return Array.from(qs).sort().reverse();
  }, [quotes]);

  const rows = useMemo((): ProjectRow[] => {
    if (!user.name) return [];
    return quotes.flatMap((quote) => {
      if (quarterFilter && quote.quarter !== quarterFilter) return [];
      const member = quote.team.find((m) => m.name === user.name);
      if (!member) return [];
      const f = calcFinancials(quote.categories);
      const memberRows = calcMemberPayouts(quote);
      const myPayout = memberRows.find((r) => r.memberId === member.id);
      if (!myPayout) return [];
      return [{
        quoteId: quote.id, projectName: quote.projectName, customer: quote.customer,
        quarter: quote.quarter, role: member.role, rateBps: memberRateBps(member, f.band),
        totalCents: myPayout.totalCents, earnedCents: myPayout.earnedCents,
        paidCents: myPayout.paidCents, owedCents: myPayout.owedCents,
        billingPct: quote.billingCompletionPct, commissionStatus: quote.commissionStatus,
      }];
    });
  }, [quotes, user.name, quarterFilter]);

  const totals = useMemo(() => ({
    totalCents: rows.reduce((s, r) => s + r.totalCents, 0),
    earnedCents: rows.reduce((s, r) => s + r.earnedCents, 0),
    paidCents: rows.reduce((s, r) => s + r.paidCents, 0),
    owedCents: rows.reduce((s, r) => s + r.owedCents, 0),
  }), [rows]);

  function csvCell(val: string) { return `"${val.replace(/"/g, '""')}"`; }

  function exportCSV() {
    const headers = ["Project","Customer","Quarter","Role","Rate %","Total Commission","Billing %","Earned","Paid","Owed","Status"];
    const csvRows = rows.map((r) => [
      csvCell(r.projectName), csvCell(r.customer), csvCell(r.quarter), csvCell(r.role),
      (r.rateBps/100).toFixed(2), (r.totalCents/100).toFixed(2), r.billingPct.toFixed(0),
      (r.earnedCents/100).toFixed(2), (r.paidCents/100).toFixed(2), (r.owedCents/100).toFixed(2), csvCell(r.commissionStatus),
    ]);
    const totalRow = ['"TOTAL"','""','""','""','""',(totals.totalCents/100).toFixed(2),'""',(totals.earnedCents/100).toFixed(2),(totals.paidCents/100).toFixed(2),(totals.owedCents/100).toFixed(2),'""'];
    const csv = [headers.join(","), ...csvRows.map((r) => r.join(",")), totalRow.join(",")].join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = `commissions-${user.name.replace(/\s+/g,"-").toLowerCase()}-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
  }

  return (
    <>
      <style>{`@media print { .no-print { display:none!important } .print-header { display:block!important } } .print-header { display:none }`}</style>
      <div className="mx-auto max-w-6xl p-8 space-y-6">
        <div className="no-print flex items-center gap-2 text-sm text-muted-foreground">
          <Link href="/sales" className="hover:text-foreground">Sales</Link>
          <span>/</span>
          <Link href="/sales/deal-desk" className="hover:text-foreground">Deal Desk</Link>
          <span>/</span>
          <span className="text-foreground font-medium">My Commissions</span>
        </div>
        <div className="print-header mb-4">
          <h1 className="text-xl font-bold">Commission Report — {user.name}</h1>
          <p className="text-sm text-muted-foreground">Generated {new Date().toLocaleDateString()}{quarterFilter ? ` · ${quarterFilter}` : ""}</p>
        </div>
        <div className="flex items-center justify-between gap-4 flex-wrap no-print">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">My Commissions</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Personal commission report across all assigned projects</p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2">
              <span className="text-xs text-muted-foreground">Viewing as</span>
              <select value={user.name} onChange={(e) => setUser({ ...user, name: e.target.value })} className="text-sm font-medium bg-transparent focus:outline-none">
                <option value="">— Select —</option>
                {allNames.map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
              <span className="text-muted-foreground">·</span>
              <select value={user.role} onChange={(e) => setUser({ ...user, role: e.target.value as DealDeskRole })} className="text-sm bg-transparent focus:outline-none">
                <option value="management">Management</option>
                <option value="salesperson">Salesperson</option>
              </select>
            </div>
            <select value={quarterFilter} onChange={(e) => setQuarterFilter(e.target.value)} className="rounded-md border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
              <option value="">All Quarters</option>
              {allQuarters.map((q) => <option key={q} value={q}>{q}</option>)}
            </select>
            {rows.length > 0 && <>
              <button onClick={exportCSV} className="rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted transition-colors">Export CSV</button>
              <button onClick={() => window.print()} className="rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted transition-colors">Export PDF</button>
            </>}
          </div>
        </div>

        {!user.name ? (
          <div className="rounded-lg border bg-card p-12 text-center">
            <p className="text-sm text-muted-foreground">Select a team member above to view commissions.</p>
          </div>
        ) : (
          <>
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
            <div className="rounded-lg border bg-card overflow-hidden">
              <div className="px-5 py-3 border-b bg-muted/30">
                <h2 className="text-sm font-semibold">Projects — {user.name} {rows.length > 0 && <span className="text-muted-foreground font-normal ml-2">({rows.length} project{rows.length !== 1 ? "s" : ""})</span>}</h2>
              </div>
              {rows.length === 0 ? (
                <p className="px-5 py-8 text-sm text-muted-foreground">{user.name} is not listed as a team member on any projects{quarterFilter ? ` in ${quarterFilter}` : ""}.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/20">
                      <tr>
                        {["Project","Customer","Quarter","Role","Rate","Total","Billing","Earned","Paid","Owed","Status"].map((h) => (
                          <th key={h} className="px-4 py-3 text-left text-xs text-muted-foreground first:pl-5 last:pr-5">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {rows.map((r) => (
                        <tr key={r.quoteId} className="hover:bg-muted/20">
                          <td className="px-4 py-3 pl-5 font-medium">
                            <Link href={`/sales/deal-desk/${r.quoteId}`} className="hover:underline text-primary no-print">{r.projectName}</Link>
                            <span className="hidden print:inline">{r.projectName}</span>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">{r.customer}</td>
                          <td className="px-4 py-3 text-muted-foreground">{r.quarter}</td>
                          <td className="px-4 py-3 text-muted-foreground">{r.role}</td>
                          <td className="px-4 py-3 tabular-nums">{fmtPct(r.rateBps/100, 2)}</td>
                          <td className="px-4 py-3 tabular-nums font-medium">{fmtUSD(r.totalCents)}</td>
                          <td className="px-4 py-3 tabular-nums">{r.billingPct}%</td>
                          <td className="px-4 py-3 tabular-nums text-emerald-700">{fmtUSD(r.earnedCents)}</td>
                          <td className="px-4 py-3 tabular-nums text-blue-700">{fmtUSD(r.paidCents)}</td>
                          <td className="px-4 py-3 tabular-nums font-semibold text-amber-700">{fmtUSD(r.owedCents)}</td>
                          <td className="px-4 py-3 pr-5 no-print">
                            <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">{r.commissionStatus}</span>
                          </td>
                        </tr>
                      ))}
                      <tr className="border-t-2 bg-muted/20 font-semibold">
                        <td className="px-4 py-3 pl-5" colSpan={5}>Total</td>
                        <td className="px-4 py-3 tabular-nums">{fmtUSD(totals.totalCents)}</td>
                        <td className="px-4 py-3" />
                        <td className="px-4 py-3 tabular-nums text-emerald-700">{fmtUSD(totals.earnedCents)}</td>
                        <td className="px-4 py-3 tabular-nums text-blue-700">{fmtUSD(totals.paidCents)}</td>
                        <td className="px-4 py-3 tabular-nums text-amber-700">{fmtUSD(totals.owedCents)}</td>
                        <td className="px-4 py-3 pr-5 no-print" />
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </>
  );
}
