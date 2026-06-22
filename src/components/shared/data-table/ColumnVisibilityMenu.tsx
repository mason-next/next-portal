export interface ColumnOption {
  key: string;
  label: string;
}

interface ColumnVisibilityMenuProps {
  /** Already in display order. */
  columns: ColumnOption[];
  hiddenColumns: Set<string>;
  onToggle: (key: string, visible: boolean) => void;
  /** Omit to render without reorder controls. */
  onMove?: (key: string, direction: "up" | "down") => void;
}

export function ColumnVisibilityMenu({ columns, hiddenColumns, onToggle, onMove }: ColumnVisibilityMenuProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {columns.map((col, index) => (
        <div key={col.key} className="flex items-center justify-between gap-2">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={!hiddenColumns.has(col.key)}
              onChange={(e) => onToggle(col.key, e.target.checked)}
              className="size-4 rounded border-input accent-primary"
            />
            {col.label}
          </label>
          {onMove ? (
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={index === 0}
                onClick={() => onMove(col.key, "up")}
                aria-label={`Move ${col.label} up`}
                className="flex size-5 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
              >
                ↑
              </button>
              <button
                type="button"
                disabled={index === columns.length - 1}
                onClick={() => onMove(col.key, "down")}
                aria-label={`Move ${col.label} down`}
                className="flex size-5 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
              >
                ↓
              </button>
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}
