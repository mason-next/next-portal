import { calcFinancials, fmtUSD, fmtPct } from "@/modules/deal-desk/lib/financial-calc";
import { memberPayoutCents } from "@/modules/deal-desk/lib/commission-engine";
import type { DealDeskQuote } from "@/types/deal-desk";

interface KpiCardsProps {
  quotes: DealDeskQuote[];
}

export function KpiCards({ quotes }: KpiCardsProps) {
  let totalRevCents = 0;
  let totalCostCents = 0;
  let totalGPCents = 0;
  let totalCommCents = 0;

  for (const q of quotes) {
    const f = calcFinancials(q.categories);
    totalRevCents += f.revenueCents;
    totalCostCents += f.costCents;
    totalGPCents += f.grossProfitCents;
    totalCommCents += f.commissionPoolCents;
  }

  const avgMargin = totalRevCents > 0 ? (totalGPCents / totalRevCents) * 100 : 0;

  const cards = [
    { label: "Total Revenue",       value: fmtUSD(totalRevCents),  accent: false },
    { label: "Total Cost",          value: fmtUSD(totalCostCents), accent: false },
    { label: "Gross Profit",        value: fmtUSD(totalGPCents),   accent: true  },
    { label: "Average Margin",      value: fmtPct(avgMargin, 1),   accent: totalGPCents > 0 },
    { label: "Commission Pool",     value: fmtUSD(totalCommCents), accent: false },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
      {cards.map((card) => (
        <div key={card.label} className="rounded-lg border bg-card p-5 shadow-sm">
          <div className="mb-1.5 text-xs text-muted-foreground">{card.label}</div>
          <div className={`text-lg font-extrabold tracking-tight ${card.accent ? "text-emerald-600" : ""}`}>
            {card.value}
          </div>
        </div>
      ))}
    </div>
  );
}
