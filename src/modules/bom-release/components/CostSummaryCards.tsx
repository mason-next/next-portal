import type { CostSummary } from "@/types/bom";
import { cn, formatMoney } from "@/lib/utils";

interface CostSummaryCardsProps {
  summary: CostSummary;
  reviewedPercent?: number;
}

type CardTone = "good" | "warn";

export function CostSummaryCards({ summary, reviewedPercent }: CostSummaryCardsProps) {
  const moneyCards: { label: string; display: string; tone?: CardTone }[] = [
    { label: "Full BOM Cost", display: formatMoney(summary.fullBomCost) },
    { label: "Approved Cost", display: formatMoney(summary.approvedCost), tone: "good" },
    { label: "Released Cost", display: formatMoney(summary.releasedCost) },
    {
      label: "Budget Variance",
      display: formatMoney(summary.budgetVariance),
      tone: summary.budgetVariance < 0 ? "warn" : "good",
    },
  ];

  const cards =
    reviewedPercent !== undefined
      ? [...moneyCards, { label: "Reviewed", display: `${reviewedPercent}%` }]
      : moneyCards;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
      {cards.map((card) => (
        <div key={card.label} className="rounded-lg border bg-card p-5 shadow-sm">
          <div className="mb-1.5 text-xs text-muted-foreground">{card.label}</div>
          <div
            className={cn(
              "text-lg font-extrabold tracking-tight",
              card.tone === "good" && "text-emerald-600",
              card.tone === "warn" && "text-amber-600"
            )}
          >
            {card.display}
          </div>
        </div>
      ))}
    </div>
  );
}
