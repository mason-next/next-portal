"use client";

import { forwardRef, useEffect, useImperativeHandle, useState } from "react";
import { BarChart2, CheckSquare } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SlashCommandItem {
  id: "status" | "task";
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const SLASH_COMMANDS: SlashCommandItem[] = [
  {
    id: "status",
    label: "Status Update",
    description: "Tag this comment as a project status update",
    icon: BarChart2,
  },
  {
    id: "task",
    label: "Project Task",
    description: "Attach this comment to a specific task",
    icon: CheckSquare,
  },
];

export interface SlashCommandListProps {
  items: SlashCommandItem[];
  command: (item: { id: string }) => void;
}

export interface SlashCommandListHandle {
  onKeyDown: (props: { event: KeyboardEvent }) => boolean;
}

export const SlashCommandList = forwardRef<SlashCommandListHandle, SlashCommandListProps>(
  function SlashCommandList({ items, command }, ref) {
    const [selectedIndex, setSelectedIndex] = useState(0);

    useEffect(() => setSelectedIndex(0), [items]);

    function selectItem(index: number) {
      const item = items[index];
      if (item) command({ id: item.id });
    }

    useImperativeHandle(ref, () => ({
      onKeyDown({ event }) {
        if (items.length === 0) return false;
        if (event.key === "ArrowDown") {
          setSelectedIndex((i) => (i + 1) % items.length);
          return true;
        }
        if (event.key === "ArrowUp") {
          setSelectedIndex((i) => (i - 1 + items.length) % items.length);
          return true;
        }
        if ((event.key === "Enter" || event.key === "Tab") && !event.ctrlKey && !event.metaKey) {
          selectItem(selectedIndex);
          return true;
        }
        return false;
      },
    }));

    if (items.length === 0) return null;

    return (
      <div role="listbox" className="w-72 overflow-auto rounded-md border bg-card py-1 shadow-lg">
        <p className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          Comment type
        </p>
        {items.map((item, index) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              role="option"
              aria-selected={index === selectedIndex}
              onMouseDown={(e) => {
                e.preventDefault();
                selectItem(index);
              }}
              className={cn(
                "flex w-full items-start gap-3 px-3 py-2 text-left text-sm hover:bg-accent",
                index === selectedIndex && "bg-accent"
              )}
            >
              <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0">
                <div className="font-medium">{item.label}</div>
                <div className="text-xs text-muted-foreground">{item.description}</div>
              </div>
            </button>
          );
        })}
      </div>
    );
  }
);
