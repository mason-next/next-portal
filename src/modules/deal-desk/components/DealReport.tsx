"use client";

import { calcFinancials, fmtUSD, fmtPct } from "@/modules/deal-desk/lib/financial-calc";
import { DealSankey } from "@/modules/deal-desk/components/DealSankey";
import { UserPicker } from "@/components/shared/UserPicker";
import { useDealDeskUser } from "@/modules/deal-desk/hooks/useDealDeskUser";
import type { DealDeskQuote } from "@/types/deal-desk";
import { quarterFromDate } from "@/types/deal-desk";
import type { AppUser } from "@/types/user";
import { cn } from "@/lib/utils";

interface DealReportProps {
  quote: DealDeskQuote;
  onUpdate?: (updated: DealDeskQuote) => void;
}

function Row({ label, value, bold, accent }: { label: string; value: string; bold?: boolean; accent?: boolean }) {
  return (
    <div className="flex justify-between py-2 border-b last:border-0">
      <span className={cn("text-sm", bold ? "font-semibold" : "text-muted-foreground")}>{label}</span>
      <span className={cn("text-sm tabular-nums", bold && "font-bold", accent && "text-emerald-600")}>{value}</span>
    </div>
  );
}

export function DealReport({ quote, onUpdate }: DealReportProps) {
  const f = calcFinancials(quote.categories, quote.projectType);
  const { isManagement } = useDealDeskUser();

  function handleSalespersonChange(user: AppUser | null) {
    if (!onUpdate) return;
    onUpdate({ ...quote, salesperson: user?.name ?? "", salespersonId: user?.id });
  }

  return (
    <div className="space-y-6">
      {/* Project info */}
      <div className="grid grid-cols-2 gap-x-8 gap-y-1 rounded-lg border bg-card p-5">
        {([
          ["Customer",    quote.customer],
          ["Project",     quote.projectName],
          ["Quote",       `${quote.quoteNumber} · ${quote.revision}`],
          ["Project Type",quote.projectType],
        ] as [string, string][]).map(([label, value]) => (
          <div key={label} className="flex gap-2 py-1">
            <span className="text-xs text-muted-foreground w-28 shrink-0">{label}</span>
            <span className="text-sm font-medium">{value}</span>
          </div>
        ))}

        {/* Opportunity number — editable */}
        <div className="flex gap-2 py-1 items-center">
          <span className="text-xs text-muted-foreground w-28 shrink-0">Opportunity #</span>
          {isManagement && onUpdate ? (
            <input
              value={quote.opportunityNumber}
              onChange={(e) => onUpdate({ ...quote, opportunityNumber: e.target.value })}
              placeholder="Add opportunity number…"
              className="flex-1 rounded-md border bg-background px-2.5 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          ) : (
            <span className="text-sm font-medium">{quote.opportunityNumber || "—"}</span>
          )}
        </div>

        {/* Booking date — editable for management; quarter derived */}
        <div className="flex gap-2 py-1 items-center">
          <span className="text-xs text-muted-foreground w-28 shrink-0">Booking Date</span>
          {isManagement && onUpdate ? (
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <input
                type="date"
                value={quote.bookingDate ?? ""}
                onChange={(e) => onUpdate({ ...quote, bookingDate: e.target.value, quarter: e.target.value ? quarterFromDate(e.target.value) : quote.quarter })}
                className="rounded-md border bg-background px-2.5 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
              {quote.bookingDate && (
                <span className="text-xs font-semibold text-muted-foreground">{quote.quarter}</span>
              )}
            </div>
          ) : (
            <span className="text-sm font-medium">
              {quote.bookingDate ? `${quote.bookingDate} · ${quote.quarter}` : "—"}
            </span>
          )}
        </div>

        {/* Salesperson — UserPicker for management, plain text for others */}
        <div className="flex gap-2 py-1 items-center">
          <span className="text-xs text-muted-foreground w-28 shrink-0">Salesperson</span>
          {isManagement && onUpdate ? (
            <div className="flex-1 min-w-0">
              <UserPicker
                value={quote.salespersonId ?? ""}
                onChange={handleSalespersonChange}
                placeholder="Link salesperson…"
              />
            </div>
          ) : (
            <span className="text-sm font-medium">{quote.salesperson || "—"}</span>
          )}
        </div>
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

      {/* Profit flow Sankey — management only */}
      {isManagement && (
        <div className="rounded-lg border bg-card p-5">
          <h3 className="text-sm font-semibold mb-4">Profit Distribution</h3>
          <DealSankey f={f} team={quote.team} />
        </div>
      )}
    </div>
  );
}
