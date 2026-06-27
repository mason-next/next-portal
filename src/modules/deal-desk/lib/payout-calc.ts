import type { DealDeskQuote, PayoutMilestone } from "@/types/deal-desk";
import { memberPayoutCents, memberRateBps } from "./commission-engine";
import { calcFinancials } from "./financial-calc";

export interface ProjectPayoutSummary {
  totalCommissionCents: number;
  triggeredPct: number;    // sum of triggered milestone commissionPct values
  earnedCents: number;     // totalCommissionCents × triggeredPct / 100
  paidPct: number;         // sum of payoutEvents commissionPctReleased
  paidCents: number;       // totalCommissionCents × paidPct / 100
  owedCents: number;       // earnedCents - paidCents
  triggeredMilestones: PayoutMilestone[];
}

export interface MemberPayoutRow {
  memberId: string;
  name: string;
  role: string;
  rateBps: number;
  totalCents: number;
  earnedCents: number;
  paidCents: number;
  owedCents: number;
}

export function calcProjectPayout(quote: DealDeskQuote): ProjectPayoutSummary {
  const f = calcFinancials(quote.categories);
  const totalCommissionCents = f.commissionPoolCents;
  const billingPct = quote.billingCompletionPct ?? 0;
  const milestones = quote.milestones ?? [];
  const payoutEvents = quote.payoutEvents ?? [];

  const triggeredMilestones = milestones.filter((m) => billingPct >= m.triggerBillingPct);
  const triggeredPct = Math.min(100, triggeredMilestones.reduce((s, m) => s + m.commissionPct, 0));

  const paidPct = Math.min(100, payoutEvents.reduce((s, e) => s + e.commissionPctReleased, 0));

  const earnedCents = Math.round((totalCommissionCents * triggeredPct) / 100);
  const paidCents = Math.round((totalCommissionCents * paidPct) / 100);
  const owedCents = Math.max(0, earnedCents - paidCents);

  return { totalCommissionCents, triggeredPct, earnedCents, paidPct, paidCents, owedCents, triggeredMilestones };
}

export function calcMemberPayouts(quote: DealDeskQuote): MemberPayoutRow[] {
  const f = calcFinancials(quote.categories);
  const rev = f.revenueCents;
  const summary = calcProjectPayout(quote);
  const totalPool = summary.totalCommissionCents;

  return quote.team.map((m) => {
    const totalCents = memberPayoutCents(rev, m, f.band);
    const memberSharePct = totalPool > 0 ? totalCents / totalPool : 0;

    const earnedCents = Math.round(summary.earnedCents * memberSharePct);
    const paidCents = Math.round(summary.paidCents * memberSharePct);
    const owedCents = Math.max(0, earnedCents - paidCents);

    return {
      memberId: m.id,
      name: m.name,
      role: m.role,
      rateBps: memberRateBps(m, f.band),
      totalCents,
      earnedCents,
      paidCents,
      owedCents,
    };
  });
}
