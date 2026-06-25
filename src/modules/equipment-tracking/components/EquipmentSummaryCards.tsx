import type { EquipmentSummary } from "@/modules/equipment-tracking/lib/equipment-summary";
import type { QuickFilter } from "@/modules/equipment-tracking/lib/view-filters";
import { cn } from "@/lib/utils";

interface EquipmentSummaryCardsProps {
  summary: EquipmentSummary;
  activeFilter: QuickFilter;
  onSelectFilter: (filter: QuickFilter) => void;
}

interface CardDef {
  label: string;
  display: string;
  tone?: "good" | "warn";
  filter: QuickFilter;
}

// Ready for Installation % lives in a badge near the page header instead of here — it's a
// ratio, not a set of rows the table could show, so it doesn't fit the click-to-filter model.
export function EquipmentSummaryCards({ summary, activeFilter, onSelectFilter }: EquipmentSummaryCardsProps) {
  const cards: CardDef[] = [
    { label: "Total Items", display: String(summary.total), filter: "all" },
    { label: "Not Ordered", display: String(summary.byStatus["Not Ordered"]), filter: "Not Ordered" },
    { label: "Allocated", display: String(summary.byStatus.Allocated), filter: "Allocated" },
    { label: "Ordered", display: String(summary.byStatus.Ordered), filter: "Ordered" },
    { label: "Received", display: String(summary.byStatus.Received), filter: "Received" },
    { label: "Shipped", display: String(summary.byStatus.Shipped), tone: "good", filter: "Shipped" },
    { label: "Delivered", display: String(summary.byStatus.Delivered), tone: "good", filter: "Delivered" },
    {
      label: "Cancelled",
      display: String(summary.byStatus.Cancelled),
      tone: summary.byStatus.Cancelled > 0 ? "warn" : undefined,
      filter: "Cancelled",
    },
    { label: "Outstanding", display: String(summary.outstanding), filter: "outstanding" },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-9">
      {cards.map((card) => {
        const isActive = card.filter === activeFilter;
        return (
          <button
            key={card.label}
            type="button"
            onClick={() => onSelectFilter(card.filter)}
            aria-pressed={isActive}
            className={cn(
              "rounded-lg border bg-card p-5 text-left shadow-sm transition-colors hover:border-primary/50 hover:bg-primary/5",
              isActive && "border-primary bg-primary/5 ring-1 ring-primary/30"
            )}
          >
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
          </button>
        );
      })}
    </div>
  );
}
