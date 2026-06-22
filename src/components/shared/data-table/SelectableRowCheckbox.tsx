"use client";

import { useRef } from "react";

interface SelectableRowCheckboxProps {
  checked: boolean;
  /** shiftKey reflects whether the user held Shift for this click — lets callers do range-select. */
  onChange: (checked: boolean, shiftKey: boolean) => void;
  ariaLabel?: string;
}

export function SelectableRowCheckbox({ checked, onChange, ariaLabel }: SelectableRowCheckboxProps) {
  // click fires before change for checkbox inputs, so this captures the modifier key
  // in time for the change handler to read it.
  const shiftKeyRef = useRef(false);

  return (
    <input
      type="checkbox"
      checked={checked}
      onClick={(e) => {
        shiftKeyRef.current = e.shiftKey;
      }}
      onChange={(e) => onChange(e.target.checked, shiftKeyRef.current)}
      aria-label={ariaLabel ?? "Select row"}
      className="size-4 rounded border-input accent-primary"
    />
  );
}
