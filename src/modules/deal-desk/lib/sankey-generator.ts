import type { DealDeskQuote, TeamMember } from "@/types/deal-desk";
import { calcFinancials, fmtPct } from "./financial-calc";
import { memberPayoutCents, memberRateBps } from "./commission-engine";
import { DEFAULT_COMMISSION_MATRIX } from "./commission-engine";

function r2(n: number): number {
  return Math.round(n * 100) / 100;
}

function pctLabel(bps: number): string {
  return fmtPct(bps / 100, 2).replace("%", "");
}

function revPct(cents: number, revenueCents: number): string {
  if (revenueCents === 0) return "0";
  return fmtPct((cents / revenueCents) * 100, 1).replace("%", "");
}

export function generateSankeyText(quote: DealDeskQuote): string {
  const f = calcFinancials(quote.categories);
  const rev = f.revenueCents;
  const gmPct = fmtPct(f.grossMarginPct, 0).replace("%", "");
  const cogsPct = fmtPct(100 - f.grossMarginPct, 0).replace("%", "");
  const commPct = pctLabel(f.band.totalBps);
  const masonPct = revPct(f.masonShareCents, rev);
  const ovhdPct = pctLabel(f.band.directorBps + f.band.bdBps + f.band.deBps); // overhead as labeled
  const masonProfitPct = revPct(f.masonProfitCents, rev);
  const lbPct = revPct(f.leadershipBonusCents, rev);
  const retainedPct = revPct(f.masonRetainedProfitCents, rev);

  const salariesPct = revPct(f.salariesOverheadCents, rev);

  const lines: string[] = [];

  const display = (c: number) => r2(c / 100);

  lines.push(
    `Revenue (100%) [${display(f.costCents)}] Job Cost/COGS (${cogsPct}%) #ff7f0e`,
    `Revenue (100%) [${display(f.grossProfitCents)}] Profit (${gmPct}%)`,
    `Profit (${gmPct}%) [${display(f.masonShareCents)}] Mason Share (${masonPct}%)`,
    `Profit (${gmPct}%) [${display(f.commissionPoolCents)}] Commission Pool (${commPct}%)`,
  );

  // Team member payouts
  for (const member of quote.team) {
    const payout = memberPayoutCents(rev, member, f.band);
    const rateBps = memberRateBps(member, f.band);
    const ratePct = pctLabel(rateBps);
    lines.push(
      `Commission Pool (${commPct}%) [${display(payout)}] ${member.name} / ${member.role} (${ratePct}%)`
    );
  }

  // If no team defined, fall back to matrix defaults
  if (quote.team.length === 0) {
    lines.push(
      `Commission Pool (${commPct}%) [${display(Math.round((rev * f.band.directorBps) / 10000))}] Enterprise Director (${pctLabel(f.band.directorBps)}%)`,
      `Commission Pool (${commPct}%) [${display(Math.round((rev * f.band.bdBps) / 10000))}] Account Executive (${pctLabel(f.band.bdBps)}%)`,
      `Commission Pool (${commPct}%) [${display(Math.round((rev * f.band.deBps) / 10000))}] Design Engineer (${pctLabel(f.band.deBps)}%)`,
    );
  }

  lines.push(
    `Mason Share (${masonPct}%) [${display(f.salariesOverheadCents)}] Salaries, Overhead & Burden (${salariesPct}%)`,
    `Mason Share (${masonPct}%) [${display(f.masonProfitCents)}] Mason Profit (${masonProfitPct}%)`,
    `Mason Profit (${masonProfitPct}%) [${display(f.leadershipBonusCents)}] Leadership Bonus (${lbPct}% of Mason Profit)`,
    `Mason Profit (${masonProfitPct}%) [${display(f.masonRetainedProfitCents)}] Mason Retained Profit (${retainedPct}%)`,
    `:Revenue (100%) #1f77b4`,
    `:Profit (${gmPct}%) #2ca02c`,
  );

  return lines.join("\n");
}

export { DEFAULT_COMMISSION_MATRIX };
