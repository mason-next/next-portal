"use client";

import { Button } from "@/components/ui/button";
import { Modal } from "@/components/shared/Modal";
import { formatDate } from "@/lib/utils";
import type { EquipmentUploadRecord } from "@/types/equipment";

interface UploadHistoryModalProps {
  history: EquipmentUploadRecord[];
  onClose: () => void;
}

export function UploadHistoryModal({ history, onClose }: UploadHistoryModalProps) {
  return (
    <Modal open onClose={onClose} className="max-w-xl">
      <h2 className="mb-1 text-lg font-semibold">Upload History</h2>
      <p className="mb-4 text-sm text-muted-foreground">Every CSV imported into this project&apos;s equipment tracker.</p>

      <div className="max-h-96 space-y-3 overflow-auto">
        {history.length === 0 ? (
          <p className="text-sm text-muted-foreground">No uploads yet.</p>
        ) : (
          history.map((record) => (
            <div key={record.id} className="border-b pb-3 last:border-0">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold">{record.fileName}</span>
                <span className="text-xs text-muted-foreground">{formatDate(record.uploadedAt)}</span>
              </div>
              <div className="text-sm text-muted-foreground">
                {record.rowCount} row{record.rowCount === 1 ? "" : "s"} · {record.newCount} new ·{" "}
                {record.updatedCount} updated
                {record.removedCount > 0 ? ` · ${record.removedCount} removed` : ""}
              </div>
              <div className="text-xs text-muted-foreground">
                {record.uploadedBy} · {record.source === "csv" ? "CSV upload" : "ConnectWise"}
              </div>
            </div>
          ))
        )}
      </div>

      <div className="mt-6 flex justify-end">
        <Button onClick={onClose}>Done</Button>
      </div>
    </Modal>
  );
}
