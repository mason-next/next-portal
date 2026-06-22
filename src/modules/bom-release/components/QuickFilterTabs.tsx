"use client";

import { cn } from "@/lib/utils";
import { QUICK_FILTERS, QUICK_FILTER_LABELS, type QuickFilter } from "@/modules/bom-release/lib/view-filters";

interface QuickFilterTabsProps {
  value: QuickFilter;
  onChange: (filter: QuickFilter) => void;
}

export function QuickFilterTabs({ value, onChange }: QuickFilterTabsProps) {
  return (
    <div className="flex items-center gap-6 border-b">
      {QUICK_FILTERS.map((filter) => (
        <button
          key={filter}
          type="button"
          onClick={() => onChange(filter)}
          className={cn(
            "border-b-2 pb-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground",
            value === filter ? "border-primary font-semibold text-foreground" : "border-transparent"
          )}
        >
          {QUICK_FILTER_LABELS[filter]}
        </button>
      ))}
    </div>
  );
}
