import type { DealCategory, CommissionBand } from "@/types/deal-desk";
import {
  findBand,
  SALARIES_OVERHEAD_BPS,
  LEADERSHIP_BONUS_RATE,
  DEFAULT_COMMISSION_MATRIX,
} from "./commission-engine";

export interface DealFinancials {
  revenueCents: number;
  costCents: number;
  grossProfitCents: number;
  grossMarginPct: number;
  band: CommissionBand;
  commissionPoolCents: number;
  masonShareCents: number;
  salariesOverheadCents: number;
  masonProfitCents: number;
  leadershipBonusCents: number;
  masonRetainedProfitCents: number;
}

export function calcFinancials(categories: DealCategory[]): DealFinancials {
  const revenueCents = categories.reduce((s, c) => s + c.revenueCents, 0);
  const costCents = categories.reduce((s, c) => s + c.costCents, 0);
  const grossProfitCents = revenueCents - costCents;
  const grossMarginPct = revenueCents > 0 ? (grossProfitCents / revenueCents) * 100 : 0;
  const band = findBand(grossMarginPct, DEFAULT_COMMISSION_MATRIX);

  // Commission is calculated on revenue (not profit)
  const commissionPoolCents = Math.round((revenueCents * band.totalBps) / 10000);
  const masonShareCents = grossProfitCents - commissionPoolCents;
  const salariesOverheadCents = Math.round((revenueCents * SALARIES_OVERHEAD_BPS) / 10000);
  const masonProfitCents = masonShareCents - salariesOverheadCents;
  const leadershipBonusCents = Math.round(masonProfitCents * LEADERSHIP_BONUS_RATE);
  const masonRetainedProfitCents = masonProfitCents - leadershipBonusCents;

  return {
    revenueCents,
    costCents,
    grossProfitCents,
    grossMarginPct,
    band,
    commissionPoolCents,
    masonShareCents,
    salariesOverheadCents,
    masonProfitCents,
    leadershipBonusCents,
    masonRetainedProfitCents,
  };
}

export function centsToDisplay(cents: number): number {
  return cents / 100;
}

export function bpsToDisplay(bps: number): number {
  return bps / 100;
}

export function fmtUSD(cents: number): string {
  return (cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });
}

export function fmtPct(value: number, decimals = 2): string {
  return `${value.toFixed(decimals)}%`;
}
