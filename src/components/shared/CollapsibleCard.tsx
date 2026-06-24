"use client";

import { useEffect, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { readGlobal, writeGlobal } from "@/lib/storage/local-store";
import { cn } from "@/lib/utils";

interface CollapsibleCardProps {
  title: string;
  // Unique per widget so each user's collapse choice is remembered independently
  // (e.g. "phase-progress", "project-overview").
  storageKey: string;
  // Stays visible in the header even while collapsed — e.g. an Edit button or status badge
  // the user still needs at a glance.
  headerExtra?: ReactNode;
  children: ReactNode;
}

export function CollapsibleCard({ title, storageKey, headerExtra, children }: CollapsibleCardProps) {
  const key = `widget-collapsed:${storageKey}`;
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    queueMicrotask(() => setCollapsed(readGlobal<boolean>(key) ?? false));
  }, [key]);

  function toggle() {
    setCollapsed((prev) => {
      const next = !prev;
      writeGlobal(key, next);
      return next;
    });
  }

  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm">
      <div className={cn("flex items-center justify-between", !collapsed && "mb-4")}>
        <button
          type="button"
          onClick={toggle}
          aria-expanded={!collapsed}
          className="flex items-center gap-1.5 text-sm font-semibold hover:text-primary"
        >
          <ChevronDown className={cn("h-4 w-4 transition-transform", collapsed && "-rotate-90")} />
          {title}
        </button>
        {headerExtra}
      </div>
      {!collapsed ? children : null}
    </div>
  );
}
