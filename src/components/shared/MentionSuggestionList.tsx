"use client";

import { forwardRef, useEffect, useImperativeHandle, useState } from "react";
import { UserAvatarImage } from "@/components/shared/AppShell/UserAvatarImage";
import { cn } from "@/lib/utils";

export interface MentionSuggestionItem {
  id: string;
  name: string;
  avatarUrl: string | null;
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

    return (
      <div role="listbox" className="w-64 overflow-auto rounded-md border bg-card py-1 shadow-lg">
        {items.map((item, index) => (
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
              "flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-accent",
              index === selectedIndex && "bg-accent"
            )}
          >
            <UserAvatarImage name={item.name} avatarUrl={item.avatarUrl} size={22} />
            <span className="min-w-0 flex-1 truncate font-medium">{item.name}</span>
          </button>
        ))}
      </div>
    );
  }
);
