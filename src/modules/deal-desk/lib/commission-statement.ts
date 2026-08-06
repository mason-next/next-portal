import type { SalesOpportunity, SalesOppInvoice, CommissionTeamMember } from "@/types/sales";

// ─── Quarter helpers ──────────────────────────────────────────────────────────

export interface QuarterRange {
  label: string;  // e.g. "Q2 2026"
  start: Date;
  end: Date;
}

export function parseQuarter(quarter: string): QuarterRange {
  const m = quarter.match(/Q(\d)\s*(\d{4})/i);
  if (!m) throw new Error(`Invalid quarter format: ${quarter}`);
  const q = parseInt(m[1], 10);
  const year = parseInt(m[2], 10);
  const startMonth = (q - 1) * 3; // 0-indexed
  const start = new Date(Date.UTC(year, startMonth, 1));
  const end = new Date(Date.UTC(year, startMonth + 3, 0, 23, 59, 59, 999));
  return { label: `Q${q} ${year}`, start, end };
}

export function prevQuarter(qr: QuarterRange): QuarterRange {
  const d = new Date(qr.start);
  d.setUTCMonth(d.getUTCMonth() - 3);
  return parseQuarter(`Q${Math.floor(d.getUTCMonth() / 3) + 1} ${d.getUTCFullYear()}`);
}

// ─── Billing status ───────────────────────────────────────────────────────────

export type BillingStatus = "Unbilled" | "Partial" | "Invoiced" | "Paid";

export function classifyBillingStatus(
  invoices: SalesOppInvoice[],
  oppRevenueCents: number,
): BillingStatus {
  if (invoices.length === 0) return "Unbilled";
  const totalInvoiced = invoices.reduce((s, i) => s + i.subtotalCents, 0);
  const totalPaid = invoices
    .filter((i) => i.paymentStatus === "Paid")
    .reduce((s, i) => s + i.subtotalCents, 0);

  const fullyInvoiced = totalInvoiced >= oppRevenueCents * 0.99;
  const fullyPaid = fullyInvoiced && totalPaid >= totalInvoiced * 0.99;

  if (fullyPaid) return "Paid";
  if (fullyInvoiced) return "Invoiced";
  return "Partial";
}

// ─── 0/50/100 payout rule ─────────────────────────────────────────────────────
// Returns the fraction (0 | 0.5 | 1.0) of commission earned as of asOfDate.

function billingFactorAsOf(
  invoices: SalesOppInvoice[],
  oppRevenueCents: number,
  asOfDate: Date,
): number {
  const eligible = invoices.filter((i) => new Date(i.invoiceDate) <= asOfDate);
  if (eligible.length === 0) return 0;

  const totalInvoiced = eligible.reduce((s, i) => s + i.subtotalCents, 0);
  const totalPaid = eligible
    .filter((i) => i.paymentStatus === "Paid" && i.paymentDate && new Date(i.paymentDate) <= asOfDate)
    .reduce((s, i) => s + i.subtotalCents, 0);

  const fullyInvoiced = totalInvoiced >= oppRevenueCents * 0.99;
  const fullyPaid = fullyInvoiced && totalPaid >= totalInvoiced * 0.99;

  if (fullyPaid) return 1.0;
  if (totalInvoiced > 0) return 0.5; // any invoicing unlocks 50%
  return 0;
}

export function earnedCentsAsOf(
  totalCommCents: number,
  invoices: SalesOppInvoice[],
  oppRevenueCents: number,
  asOfDate: Date,
): number {
  return Math.round(totalCommCents * billingFactorAsOf(invoices, oppRevenueCents, asOfDate));
}

// ─── Per-opp statement row ────────────────────────────────────────────────────

export interface StatementRow {
  opp: SalesOpportunity;
  member: CommissionTeamMember;
  // All amounts in cents
  contractValueCents: number;       // opp.value
  totalInvoicedCents: number;
  openBalanceCents: number;
  totalCommCents: number;           // contractValue * rateBps / 10000
  q1DueCents: number;
  q2PayableCents: number;
  futureCents: number;
  billingStatus: BillingStatus;
  invoices: SalesOppInvoice[];
  children: SalesOpportunity[];
}

// ─── Full statement ───────────────────────────────────────────────────────────

export interface CommissionStatement {
  personName: string;
  reportQuarter: string;
  generatedAt: string;
  rows: StatementRow[];
  // Totals
  totalContractCents: number;
  totalInvoicedCents: number;
  totalCommCents: number;
  q1TotalCents: number;
  q2TotalCents: number;
  futureTotalCents: number;
}

export function calcCommissionStatement(
  opps: (SalesOpportunity & { invoices: SalesOppInvoice[]; children: SalesOpportunity[] })[],
  personName: string,
  reportQuarter: string,
): CommissionStatement {
  const q2 = parseQuarter(reportQuarter);
  const q1 = prevQuarter(q2);

  const rows: StatementRow[] = [];

  for (const opp of opps) {
    const team = (opp.commissionTeam ?? []) as CommissionTeamMember[];
    const member = team.find(
      (m) => m.name.toLowerCase() === personName.toLowerCase()
    );
    if (!member) continue;

    // Merge parent + children invoices for billing status / earned calculation
    const allChildInvoices = opp.children.flatMap(
      (c) => (c.invoices ?? []) as SalesOppInvoice[]
    );
    const allInvoices = [...opp.invoices, ...allChildInvoices];

    // Contract value = parent + children combined
    const contractValueCents =
      opp.value +
      opp.children.reduce((s, c) => s + (c.value ?? 0), 0);

    const totalCommCents = Math.round((contractValueCents * member.rateBps) / 10000);

    const q1DueCents = earnedCentsAsOf(totalCommCents, allInvoices, contractValueCents, q1.end);
    const q2EarnedCents = earnedCentsAsOf(totalCommCents, allInvoices, contractValueCents, q2.end);
    const q2PayableCents = q2EarnedCents - q1DueCents;
    const futureCents = totalCommCents - q2EarnedCents;

    const totalInvoicedCents = allInvoices.reduce((s, i) => s + i.subtotalCents, 0);
    const openBalanceCents = allInvoices.reduce((s, i) => s + i.openBalanceCents, 0);
    const billingStatus = classifyBillingStatus(allInvoices, contractValueCents);

    rows.push({
      opp,
      member,
      contractValueCents,
      totalInvoicedCents,
      openBalanceCents,
      totalCommCents,
      q1DueCents,
      q2PayableCents,
      futureCents,
      billingStatus,
      invoices: allInvoices,
      children: opp.children,
    });
  }

  const totalContractCents = rows.reduce((s, r) => s + r.contractValueCents, 0);
  const totalInvoicedCents = rows.reduce((s, r) => s + r.totalInvoicedCents, 0);
  const totalCommCents = rows.reduce((s, r) => s + r.totalCommCents, 0);
  const q1TotalCents = rows.reduce((s, r) => s + r.q1DueCents, 0);
  const q2TotalCents = rows.reduce((s, r) => s + r.q2PayableCents, 0);
  const futureTotalCents = rows.reduce((s, r) => s + r.futureCents, 0);

  return {
    personName,
    reportQuarter,
    generatedAt: new Date().toISOString(),
    rows,
    totalContractCents,
    totalInvoicedCents,
    totalCommCents,
    q1TotalCents,
    q2TotalCents,
    futureTotalCents,
  };
}

// ─── Format helpers ───────────────────────────────────────────────────────────

export function fmtUSD(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

export function fmtBps(bps: number): string {
  return (bps / 100).toFixed(2) + "%";
}

export function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric", timeZone: "UTC",
  });
}
