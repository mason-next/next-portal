import type { DealCategory, CommissionBand, ProjectType } from "@/types/deal-desk";
import {
  findBand,
  getCommissionMatrix,
  SALARIES_OVERHEAD_BPS,
  LEADERSHIP_BONUS_RATE,
} from "./commission-engine";

export interface DealFinancials {
  revenueCents: number;
  costCents: number;
  grossProfitCents: number;
  grossMarginPct: number;
  netProfitMarginPct: number;
  bandLookupPct: number;
  bandLookupLabel: string;
  band: CommissionBand;
  commissionPoolCents: number;
  masonShareCents: number;
  salariesOverheadCents: number;
  masonProfitCents: number;
  leadershipBonusCents: number;
  masonRetainedProfitCents: number;
}

export function calcFinancials(categories: DealCategory[], projectType?: ProjectType): DealFinancials {
  const revenueCents = categories.reduce((s, c) => s + c.revenueCents, 0);
  const costCents = categories.reduce((s, c) => s + c.costCents, 0);
  const grossProfitCents = revenueCents - costCents;
  const grossMarginPct = revenueCents > 0 ? (grossProfitCents / revenueCents) * 100 : 0;

  const salariesOverheadCents = Math.round((revenueCents * SALARIES_OVERHEAD_BPS) / 10000);
  // Net profit before commission — used as the Pod band lookup key
  const netProfitBeforeCommCents = grossProfitCents - salariesOverheadCents;
  const netProfitMarginPct = revenueCents > 0 ? (netProfitBeforeCommCents / revenueCents) * 100 : 0;

  // All project types use gross margin % for band lookup; the matrix itself differs per type
  const bandLookupPct = grossMarginPct;
  const bandLookupLabel = "Gross Margin";

  const matrix = getCommissionMatrix(projectType);
  const band = findBand(bandLookupPct, matrix);

  // Commission is always applied to gross revenue
  const commissionPoolCents = Math.round((revenueCents * band.totalBps) / 10000);
  const masonShareCents = grossProfitCents - commissionPoolCents;
  const masonProfitCents = masonShareCents - salariesOverheadCents;
  const leadershipBonusCents = Math.round(masonProfitCents * LEADERSHIP_BONUS_RATE);
  const masonRetainedProfitCents = masonProfitCents - leadershipBonusCents;

  return {
    revenueCents,
    costCents,
    grossProfitCents,
    grossMarginPct,
    netProfitMarginPct,
    bandLookupPct,
    bandLookupLabel,
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
