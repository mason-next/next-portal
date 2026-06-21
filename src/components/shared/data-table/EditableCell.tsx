"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

export type EditableCellType = "text" | "number" | "money" | "select";

interface EditableCellProps {
  value: string | number;
  type?: EditableCellType;
  options?: string[];
  isChanged?: boolean;
  placeholder?: string;
  /** Return an error message to reject the input, or null to accept it. */
  validate?: (rawValue: string) => string | null;
  onCommit: (value: string | number) => void;
}

export function EditableCell({
  value,
  type = "text",
  options,
  isChanged,
  placeholder,
  validate,
  onCommit,
}: EditableCellProps) {
  const [draft, setDraft] = useState(String(value ?? ""));
  const [error, setError] = useState<string | null>(null);

  // Resync local draft when the external value changes (e.g. another commit elsewhere
  // updates this field). Adjusting state during render instead of an effect avoids an
  // extra render pass — see https://react.dev/learn/you-might-not-need-an-effect.
  const [lastValue, setLastValue] = useState(value);
  if (value !== lastValue) {
    setLastValue(value);
    setDraft(String(value ?? ""));
    setError(null);
  }

  function commit(raw: string) {
    const validationError = validate?.(raw) ?? null;
    setError(validationError);
    if (validationError) return;

    onCommit(type === "number" || type === "money" ? parseNumeric(raw) : raw);
  }

  const fieldClassName = cn(
    "h-7 w-full rounded-md border border-transparent bg-transparent px-2 text-sm outline-none focus:border-input focus:bg-background",
    (type === "money" || type === "number") && "text-right",
    isChanged && "bg-amber-50",
    error && "border-destructive focus:border-destructive"
  );

  if (type === "select") {
    return (
      <div>
        <select
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            commit(e.target.value);
          }}
          className={fieldClassName}
        >
          {options?.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        {error ? <p className="mt-1 text-xs text-destructive">{error}</p> : null}
      </div>
    );
  }

  return (
    <div>
      <input
        type="text"
        value={draft}
        placeholder={placeholder}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => commit(draft)}
        className={fieldClassName}
      />
      {error ? <p className="mt-1 text-xs text-destructive">{error}</p> : null}
    </div>
  );
}

function parseNumeric(raw: string): number {
  const n = Number(String(raw ?? "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}
