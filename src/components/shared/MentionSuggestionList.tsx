"use client";

import { forwardRef, useEffect, useImperativeHandle, useState } from "react";
import { UserAvatarImage } from "@/components/shared/AppShell/UserAvatarImage";
import { cn } from "@/lib/utils";

export interface MentionSuggestionItem {
  id: string;
  name: string;
  avatarUrl: string | null;
  /** When set, items are grouped in the dropdown. "team" shows above "all". */
  group?: "team" | "all";
}

export interface MentionSuggestionListProps {
  items: MentionSuggestionItem[];
  command: (item: { id: string; label: string }) => void;
}

export interface MentionSuggestionListHandle {
  onKeyDown: (props: { event: KeyboardEvent }) => boolean;
}

// The "@" suggestion popup, rendered by RichCommentEditor's Mention extension via Tiptap's
// Suggestion `render()` lifecycle (mounted with ReactRenderer, positioned manually next to the
// caret — see RichCommentEditor). Same look as the old MentionTextarea dropdown, just driven by
// Tiptap's keydown/selection plugin instead of our own.
export const MentionSuggestionList = forwardRef<MentionSuggestionListHandle, MentionSuggestionListProps>(
  function MentionSuggestionList({ items, command }, ref) {
    const [selectedIndex, setSelectedIndex] = useState(0);

    useEffect(() => setSelectedIndex(0), [items]);

    function selectItem(index: number) {
      const item = items[index];
      if (item) command({ id: item.id, label: item.name });
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

    const hasGroups = items.some((i) => i.group !== undefined);

    return (
      <div role="listbox" className="w-64 overflow-auto rounded-md border bg-card py-1 shadow-lg">
        {hasGroups ? (
          <>
            {renderGroup("team", "Project Team", items, selectedIndex, selectItem)}
            {renderGroup("all", "All Users", items, selectedIndex, selectItem)}
          </>
        ) : (
          items.map((item, index) => (
            <MentionRow
              key={item.id}
              item={item}
              index={index}
              selected={index === selectedIndex}
              onSelect={selectItem}
            />
          ))
        )}
      </div>
    );
  }
);

function MentionRow({
  item,
  index,
  selected,
  onSelect,
}: {
  item: MentionSuggestionItem;
  index: number;
  selected: boolean;
  onSelect: (i: number) => void;
}) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={selected}
      onMouseDown={(e) => {
        e.preventDefault();
        onSelect(index);
      }}
      className={cn(
        "flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-accent",
        selected && "bg-accent"
      )}
    >
      <UserAvatarImage name={item.name} avatarUrl={item.avatarUrl} size={22} />
      <span className="min-w-0 flex-1 truncate font-medium">{item.name}</span>
    </button>
  );
}

function renderGroup(
  group: "team" | "all",
  label: string,
  items: MentionSuggestionItem[],
  selectedIndex: number,
  onSelect: (i: number) => void
) {
  const groupItems = items.filter((i) => i.group === group);
  if (groupItems.length === 0) return null;
  return (
    <div key={group}>
      <div className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      {groupItems.map((item) => {
        const index = items.indexOf(item);
        return (
          <MentionRow
            key={item.id}
            item={item}
            index={index}
            selected={index === selectedIndex}
            onSelect={onSelect}
          />
        );
      })}
    </div>
  );
}
