interface SelectableRowCheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  ariaLabel?: string;
}

export function SelectableRowCheckbox({ checked, onChange, ariaLabel }: SelectableRowCheckboxProps) {
  return (
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      aria-label={ariaLabel ?? "Select row"}
      className="size-4 rounded border-input accent-primary"
    />
  );
}
