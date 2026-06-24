import { calcFinancials, fmtUSD, fmtPct } from "@/modules/deal-desk/lib/financial-calc";
import { memberPayoutCents, memberRateBps } from "@/modules/deal-desk/lib/commission-engine";
import type { DealDeskQuote } from "@/types/deal-desk";
import { cn } from "@/lib/utils";

interface DealReportProps {
  quote: DealDeskQuote;
}

function Row({ label, value, bold, accent }: { label: string; value: string; bold?: boolean; accent?: boolean }) {
  return (
    <div className="flex justify-between py-2 border-b last:border-0">
      <span className={cn("text-sm", bold ? "font-semibold" : "text-muted-foreground")}>{label}</span>
      <span className={cn("text-sm tabular-nums", bold && "font-bold", accent && "text-emerald-600")}>{value}</span>
    </div>
  );
}

export function DealReport({ quote }: DealReportProps) {
  const f = calcFinancials(quote.categories);

  return (
    <div className="space-y-6">
      {/* Project info */}
      <div className="grid grid-cols-2 gap-x-8 gap-y-1 rounded-lg border bg-card p-5">
        {[
          ["Customer",       quote.customer],
          ["Project",        quote.projectName],
          ["Quote",          `${quote.quoteNumber} · ${quote.revision}`],
          ["Opportunity",    quote.opportunityNumber || "—"],
          ["Salesperson",    quote.salesperson || "—"],
          ["Project Type",   quote.projectType],
          ["Quarter",        quote.quarter],
          ["Imported By",    quote.importedBy],
        ].map(([label, value]) => (
          <div key={label} className="flex gap-2 py-1">
            <span className="text-xs text-muted-foreground w-28 shrink-0">{label}</span>
            <span className="text-sm font-medium">{value}</span>
          </div>
        ))}
      </div>

      {/* Financial summary */}
      <div className="rounded-lg border bg-card p-5">
        <h3 className="text-sm font-semibold mb-3">Financial Summary</h3>
        <Row label="Total Revenue"   value={fmtUSD(f.revenueCents)} />
        <Row label="Total COGS"      value={fmtUSD(f.costCents)} />
        <Row label="Gross Profit"    value={fmtUSD(f.grossProfitCents)} bold accent />
        <Row label="Gross Margin"    value={fmtPct(f.grossMarginPct, 2)} bold accent />
        <Row label="Commission Band" value={f.band.label} />
      </div>

      {/* Category breakdown */}
      <div className="rounded-lg border bg-card p-5">
        <h3 className="text-sm font-semibold mb-3">Category Breakdown</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="pb-2 text-left text-xs text-muted-foreground">Category</th>
                <th className="pb-2 text-right text-xs text-muted-foreground">Revenue</th>
                <th className="pb-2 text-right text-xs text-muted-foreground">Cost</th>
                <th className="pb-2 text-right text-xs text-muted-foreground">Profit</th>
                <th className="pb-2 text-right text-xs text-muted-foreground">Margin</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {quote.categories.map((cat) => {
                const profit = cat.revenueCents - cat.costCents;
                const margin = cat.revenueCents > 0 ? (profit / cat.revenueCents) * 100 : 0;
                const revShare = f.revenueCents > 0 ? (cat.revenueCents / f.revenueCents) * 100 : 0;
                return (
                  <tr key={cat.name}>
                    <td className="py-2">
                      <div className="font-medium">{cat.name}</div>
                      <div className="mt-1 h-1 w-full rounded-full bg-muted overflow-hidden">
                        <div className="h-full rounded-full bg-primary/60" style={{ width: `${revShare}%` }} />
                      </div>
                    </td>
                    <td className="py-2 text-right tabular-nums">{fmtUSD(cat.revenueCents)}</td>
                    <td className="py-2 text-right tabular-nums text-muted-foreground">{fmtUSD(cat.costCents)}</td>
                    <td className="py-2 text-right tabular-nums font-medium">{fmtUSD(profit)}</td>
                    <td className={cn("py-2 text-right tabular-nums font-semibold", margin < 20 ? "text-amber-600" : "text-emerald-600")}>
                      {fmtPct(margin, 1)}
                    </td>
                  </tr>
                );
              })}
              <tr className="border-t-2 font-semibold">
                <td className="py-2">Total</td>
                <td className="py-2 text-right tabular-nums">{fmtUSD(f.revenueCents)}</td>
                <td className="py-2 text-right tabular-nums text-muted-foreground">{fmtUSD(f.costCents)}</td>
                <td className="py-2 text-right tabular-nums text-emerald-600">{fmtUSD(f.grossProfitCents)}</td>
                <td className={cn("py-2 text-right tabular-nums font-bold", f.grossMarginPct < 20 ? "text-amber-600" : "text-emerald-600")}>
                  {fmtPct(f.grossMarginPct, 2)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* P&L waterfall */}
      <div className="rounded-lg border bg-card p-5">
        <h3 className="text-sm font-semibold mb-3">Profit Waterfall</h3>
        <div className="space-y-1">
          {[
            { label: "Revenue",                   cents: f.revenueCents,             pct: 100,                                            color: "bg-blue-500" },
            { label: "Job Cost / COGS",           cents: f.costCents,                pct: (f.costCents / f.revenueCents) * 100,           color: "bg-orange-400" },
            { label: "Gross Profit",              cents: f.grossProfitCents,         pct: f.grossMarginPct,                               color: "bg-emerald-500" },
            { label: "Commission Pool",           cents: f.commissionPoolCents,      pct: (f.band.totalBps / 100),                        color: "bg-violet-400" },
            { label: "Mason Share",               cents: f.masonShareCents,          pct: (f.masonShareCents / f.revenueCents) * 100,     color: "bg-cyan-500" },
            { label: "Salaries & Overhead (12%)", cents: f.salariesOverheadCents,    pct: 12,                                             color: "bg-slate-400" },
            { label: "Mason Profit",              cents: f.masonProfitCents,         pct: (f.masonProfitCents / f.revenueCents) * 100,    color: "bg-teal-500" },
            { label: "Leadership Bonus",          cents: f.leadershipBonusCents,     pct: (f.leadershipBonusCents / f.revenueCents) * 100, color: "bg-amber-400" },
            { label: "Mason Retained Profit",     cents: f.masonRetainedProfitCents, pct: (f.masonRetainedProfitCents / f.revenueCents) * 100, color: "bg-green-600" },
          ].map((row) => (
            <div key={row.label} className="flex items-center gap-3">
              <div className="w-44 shrink-0 text-xs text-muted-foreground">{row.label}</div>
              <div className="flex-1 h-5 bg-muted rounded overflow-hidden">
                <div className={cn("h-full rounded", row.color)} style={{ width: `${Math.max(0.5, Math.min(100, row.pct))}%` }} />
              </div>
              <div className="w-28 text-right text-xs tabular-nums font-medium">{fmtUSD(row.cents)}</div>
              <div className="w-12 text-right text-xs tabular-nums text-muted-foreground">{fmtPct(row.pct, 1)}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
