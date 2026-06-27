"use client";

import { useState } from "react";
import { calcFinancials, fmtUSD, fmtPct } from "@/modules/deal-desk/lib/financial-calc";
import { memberPayoutCents, memberRateBps, DEFAULT_COMMISSION_MATRIX } from "@/modules/deal-desk/lib/commission-engine";
import { useDealDeskUser } from "@/modules/deal-desk/hooks/useDealDeskUser";
import type { DealDeskQuote, CommissionStatus } from "@/types/deal-desk";
import { COMMISSION_STATUSES } from "@/types/deal-desk";
import { cn } from "@/lib/utils";

interface CommissionPanelProps {
  quote: DealDeskQuote;
  onCommissionStatusChange?: (status: CommissionStatus) => void;
}


export function CommissionPanel({ quote, onCommissionStatusChange }: CommissionPanelProps) {
  const [showMatrix, setShowMatrix] = useState(false);
  const { user, isManagement } = useDealDeskUser();
  const f = calcFinancials(quote.categories);
  const rev = f.revenueCents;

  const teamRows = quote.team.map((m) => ({
    member: m,
    rateBps: memberRateBps(m, f.band),
    payoutCents: memberPayoutCents(rev, m, f.band),
  }));

  const totalPayoutCents = teamRows.reduce((s, r) => s + r.payoutCents, 0);

  // Role-based visibility: salesperson sees only their own row
  const myRow = user.name
    ? teamRows.find((r) => r.member.name === user.name)
    : undefined;
  const visibleRows = isManagement ? teamRows : (myRow ? [myRow] : []);

  return (
    <div className="space-y-6">
      {/* Band callout */}
      <div className="rounded-lg border-2 border-primary/20 bg-primary/5 p-5">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-xs text-muted-foreground mb-1">Applicable Commission Band</div>
            <div className="text-xl font-bold">{f.band.label}</div>
            <div className="text-sm text-muted-foreground mt-1">
              {fmtPct(f.grossMarginPct, 2)} margin · {fmtPct(f.band.totalBps / 100, 2)} total commission rate on revenue
            </div>
          </div>
          {isManagement && (
            <button
              type="button"
              onClick={() => setShowMatrix(!showMatrix)}
              className="text-xs text-primary hover:underline whitespace-nowrap"
            >
              {showMatrix ? "Hide" : "View"} full matrix
            </button>
          )}
        </div>
        <div className="mt-4 grid grid-cols-3 gap-4">
          <div>
            <div className="text-xs text-muted-foreground">Total Revenue</div>
            <div className="text-base font-bold">{fmtUSD(rev)}</div>
          </div>
          {isManagement ? (
            <div>
              <div className="text-xs text-muted-foreground">Commission Pool ({fmtPct(f.band.totalBps / 100, 2)})</div>
              <div className="text-base font-bold text-violet-700">{fmtUSD(f.commissionPoolCents)}</div>
            </div>
          ) : myRow ? (
            <div>
              <div className="text-xs text-muted-foreground">Your Commission ({fmtPct(myRow.rateBps / 100, 2)})</div>
              <div className="text-base font-bold text-violet-700">{fmtUSD(myRow.payoutCents)}</div>
            </div>
          ) : (
            <div />
          )}
          {isManagement && (
            <div>
              <div className="text-xs text-muted-foreground">Commission Status</div>
              <select
                value={quote.commissionStatus}
                onChange={(e) => onCommissionStatusChange?.(e.target.value as CommissionStatus)}
                className="mt-0.5 rounded-md border bg-background px-2 py-1 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {COMMISSION_STATUSES.map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Full commission matrix — management only */}
      {isManagement && showMatrix && (
        <div className="overflow-x-auto rounded-lg border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr>
                <th className="px-4 py-2 text-left text-xs text-muted-foreground">Margin Band</th>
                <th className="px-4 py-2 text-right text-xs text-muted-foreground">Total</th>
                <th className="px-4 py-2 text-right text-xs text-muted-foreground">Director</th>
                <th className="px-4 py-2 text-right text-xs text-muted-foreground">BD</th>
                <th className="px-4 py-2 text-right text-xs text-muted-foreground">DE</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {DEFAULT_COMMISSION_MATRIX.map((band) => (
                <tr key={band.label} className={cn(band.label === f.band.label && "bg-primary/10 font-semibold")}>
                  <td className="px-4 py-2">{band.label}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{fmtPct(band.totalBps / 100, 2)}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{fmtPct(band.directorBps / 100, 2)}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{fmtPct(band.bdBps / 100, 2)}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{fmtPct(band.deBps / 100, 2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Team payout table */}
      <div className="rounded-lg border bg-card overflow-hidden">
        <div className="px-5 py-3 border-b bg-muted/30">
          <h3 className="text-sm font-semibold">
            {isManagement ? "Team Payouts" : "Your Commission"}
          </h3>
        </div>
        {visibleRows.length === 0 ? (
          <p className="px-5 py-6 text-sm text-muted-foreground">
            {isManagement
              ? "No team members assigned. Add team members when importing or editing this quote."
              : "You are not listed as a team member on this project."}
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/20">
              <tr>
                <th className="px-5 py-2.5 text-left text-xs text-muted-foreground">Name</th>
                <th className="px-5 py-2.5 text-left text-xs text-muted-foreground">Role</th>
                <th className="px-5 py-2.5 text-right text-xs text-muted-foreground">Rate</th>
                <th className="px-5 py-2.5 text-right text-xs text-muted-foreground">Payout</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {visibleRows.map(({ member, rateBps, payoutCents }) => (
                <tr key={member.id}>
                  <td className="px-5 py-3 font-medium">{member.name}</td>
                  <td className="px-5 py-3 text-muted-foreground">{member.role}</td>
                  <td className="px-5 py-3 text-right tabular-nums">{fmtPct(rateBps / 100, 2)}</td>
                  <td className="px-5 py-3 text-right tabular-nums font-semibold text-violet-700">{fmtUSD(payoutCents)}</td>
                </tr>
              ))}
              {isManagement && (
                <tr className="border-t-2 bg-muted/20 font-semibold">
                  <td className="px-5 py-3" colSpan={3}>Total Commission Payout</td>
                  <td className="px-5 py-3 text-right tabular-nums text-violet-700">{fmtUSD(totalPayoutCents)}</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Full profit distribution — management only */}
      {isManagement && (
        <div className="rounded-lg border bg-card p-5 space-y-1">
          <h3 className="text-sm font-semibold mb-3">Full Profit Distribution</h3>
          {[
            ["Commission Pool",         fmtUSD(f.commissionPoolCents),         fmtPct(f.band.totalBps / 100, 2)],
            ["Mason Share",             fmtUSD(f.masonShareCents),              fmtPct((f.masonShareCents / rev) * 100, 1)],
            ["Salaries & Overhead",     fmtUSD(f.salariesOverheadCents),        "12.00%"],
            ["Mason Profit",            fmtUSD(f.masonProfitCents),             fmtPct((f.masonProfitCents / rev) * 100, 2)],
            ["Leadership Bonus",        fmtUSD(f.leadershipBonusCents),         fmtPct((f.leadershipBonusCents / rev) * 100, 2)],
            ["Mason Retained Profit",   fmtUSD(f.masonRetainedProfitCents),     fmtPct((f.masonRetainedProfitCents / rev) * 100, 2)],
          ].map(([label, value, pct]) => (
            <div key={label} className="flex justify-between py-1.5 border-b last:border-0 text-sm">
              <span className="text-muted-foreground">{label}</span>
              <div className="flex gap-4 tabular-nums">
                <span className="text-muted-foreground w-14 text-right">{pct}</span>
                <span className="font-medium w-28 text-right">{value}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
