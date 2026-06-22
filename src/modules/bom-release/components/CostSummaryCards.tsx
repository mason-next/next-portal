import type { CostSummary } from "@/types/bom";
import { cn, formatMoney } from "@/lib/utils";

interface CostSummaryCardsProps {
  summary: CostSummary;
}

export function CostSummaryCards({ summary }: CostSummaryCardsProps) {
  const cards = [
    { label: "Full BOM Cost", value: summary.fullBomCost },
    { label: "Approved Cost", value: summary.approvedCost, tone: "good" as const },
    { label: "Released Cost", value: summary.releasedCost },
    {
      label: "Budget Variance",
      value: summary.budgetVariance,
      tone: summary.budgetVariance < 0 ? "warn" : ("good" as const),
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
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
            {formatMoney(card.value)}
          </div>
        </div>
      ))}
    </div>
  );
}
