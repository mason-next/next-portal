export interface ColumnOption {
  key: string;
  label: string;
}

interface ColumnVisibilityMenuProps {
  columns: ColumnOption[];
  hiddenColumns: Set<string>;
  onToggle: (key: string, visible: boolean) => void;
}

export function ColumnVisibilityMenu({ columns, hiddenColumns, onToggle }: ColumnVisibilityMenuProps) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {columns.map((col) => (
        <label key={col.key} className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={!hiddenColumns.has(col.key)}
            onChange={(e) => onToggle(col.key, e.target.checked)}
            className="size-4 rounded border-input accent-primary"
          />
          {col.label}
        </label>
      ))}
    </div>
  );
}
