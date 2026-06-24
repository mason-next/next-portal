"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import { UserAvatarImage } from "@/components/shared/AppShell/UserAvatarImage";
import { detectActiveTrigger, insertMentionToken } from "@/lib/mentions/mention-tokens";
import { cn } from "@/lib/utils";
import type { AppUser } from "@/types/user";

const MAX_RESULTS = 8;

interface MentionTextareaProps {
  value: string;
  onChange: (value: string) => void;
  users: AppUser[];
  placeholder?: string;
  rows?: number;
  className?: string;
  onKeyDown?: (e: KeyboardEvent<HTMLTextAreaElement>) => void;
}

// Drop-in replacement for a plain <textarea> that opens a searchable "@" mention dropdown.
// Anchored directly below the textarea (not tracking exact caret position) — this composer is
// a small 2-row box in a fixed-width drawer, where the visual difference from true
// caret-tracking is minimal; true caret-tracking would need a "mirror div" measurement
// technique that isn't worth the added complexity here.
export function MentionTextarea({
  value,
  onChange,
  users,
  placeholder,
  rows = 2,
  className,
  onKeyDown,
}: MentionTextareaProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [triggerStart, setTriggerStart] = useState<number | null>(null);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const filtered = users
    .filter((u) => u.name.toLowerCase().includes(query.toLowerCase()))
    .slice(0, MAX_RESULTS);

  function closeDropdown() {
    setDropdownOpen(false);
    setTriggerStart(null);
    setQuery("");
  }

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const newValue = e.target.value;
    onChange(newValue);

    const caretIndex = e.target.selectionStart ?? newValue.length;
    const trigger = detectActiveTrigger(newValue, caretIndex);
    if (trigger) {
      setDropdownOpen(true);
      setQuery(trigger.query);
      setTriggerStart(trigger.triggerStart);
      setHighlightedIndex(0);
    } else {
      closeDropdown();
    }
  }

  function selectUser(user: AppUser) {
    if (triggerStart === null) return;
    const caretEnd = triggerStart + 1 + query.length;
    const { text, caretIndex } = insertMentionToken(value, triggerStart, caretEnd, user.name, user.id);
    onChange(text);
    closeDropdown();

    const textarea = textareaRef.current;
    if (textarea) {
      textarea.focus();
      requestAnimationFrame(() => {
        textarea.selectionStart = textarea.selectionEnd = caretIndex;
      });
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (!dropdownOpen) {
      onKeyDown?.(e);
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((i) => Math.min(i + 1, Math.max(filtered.length - 1, 0)));
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((i) => Math.max(i - 1, 0));
      return;
    }
    if ((e.key === "Enter" || e.key === "Tab") && filtered.length > 0) {
      e.preventDefault();
      selectUser(filtered[highlightedIndex]);
      return;
    }
    if (e.key === "Escape") {
      e.preventDefault();
      setDropdownOpen(false);
      return;
    }
    onKeyDown?.(e);
  }

  return (
    <div className="relative">
      <textarea
        ref={textareaRef}
        className={className}
        rows={rows}
        placeholder={placeholder}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
      />

      {dropdownOpen && filtered.length > 0 ? (
        <div
          role="listbox"
          className="absolute left-0 top-full z-30 mt-1 w-64 overflow-auto rounded-md border bg-card py-1 shadow-lg"
        >
          {filtered.map((user, index) => (
            <button
              key={user.id}
              type="button"
              role="option"
              aria-selected={index === highlightedIndex}
              onMouseDown={(e) => {
                e.preventDefault();
                selectUser(user);
              }}
              className={cn(
                "flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-accent",
                index === highlightedIndex && "bg-accent"
              )}
            >
              <UserAvatarImage name={user.name} avatarUrl={user.avatarUrl} size={22} />
              <span className="min-w-0 flex-1 truncate font-medium">{user.name}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
