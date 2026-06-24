"use client";

import { Search } from "lucide-react";

interface EquipmentSearchBarProps {
  value: string;
  onChange: (value: string) => void;
}

export function EquipmentSearchBar({ value, onChange }: EquipmentSearchBarProps) {
  return (
    <div className="relative max-w-sm">
      <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search manufacturer, product, description…"
        className="h-9 w-full rounded-md border border-input bg-background pl-8 pr-3 text-sm outline-none focus:border-primary"
      />
    </div>
  );
}
