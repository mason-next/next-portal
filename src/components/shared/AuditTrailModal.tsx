import type { AuditEntry } from "@/types/audit";
import { Button } from "@/components/ui/button";

interface AuditTrailModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  entries: AuditEntry[];
}

export function AuditTrailModal({ open, onClose, title, entries }: AuditTrailModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/40 p-6">
      <div className="w-full max-w-lg rounded-xl border bg-card p-6 shadow-lg">
        <h2 className="mb-1 text-lg font-semibold">Row Audit Trail</h2>
        <p className="mb-4 text-sm text-muted-foreground">{title}</p>

        <div className="max-h-96 space-y-3 overflow-auto">
          {entries.length === 0 ? (
            <p className="text-sm text-muted-foreground">No changes have been made to this row.</p>
          ) : (
            entries.map((entry, index) => (
              <div key={index} className="border-b pb-3 last:border-0">
                <div className="text-sm font-semibold">{entry.field}</div>
                <div className="text-sm text-muted-foreground">
                  {entry.oldValue || "—"} → {entry.newValue || "—"}
                </div>
                <div className="text-xs text-muted-foreground">
                  {entry.user} · {new Date(entry.time).toLocaleString()}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="mt-6 flex justify-end">
          <Button onClick={onClose}>Done</Button>
        </div>
      </div>
    </div>
  );
}
