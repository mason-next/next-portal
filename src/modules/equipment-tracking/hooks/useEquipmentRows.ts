"use client";

import { useEffect, useState } from "react";
import { getEquipmentRows, updateEquipmentRow, type EquipmentRowPatch } from "@/lib/data/equipment";
import { useSession } from "@/lib/auth/client";
import type { AuditEntry } from "@/types/audit";
import type { EquipmentRow, EquipmentRowSnapshot } from "@/types/equipment";
import { computeEquipmentStatus } from "@/modules/equipment-tracking/lib/status";
import { snapshotRows } from "@/modules/equipment-tracking/lib/change-tracking";

// Fields that feed computeEquipmentStatus — editing any of these recomputes the row's
// status as part of the same write, so the badge never goes stale relative to the cell
// that drove it.
const STATUS_DRIVING_FIELDS = new Set<keyof EquipmentRow>([
  "qty",
  "stockAllocation",
  "specialOrder",
  "pickedQty",
  "shippedQty",
  "cancelled",
  "poInfo",
  "notNeeded",
]);

export function useEquipmentRows(projectId: string) {
  const { name: currentUserName } = useSession();
  const [loaded, setLoaded] = useState<{
    projectId: string;
    rows: EquipmentRow[];
    snapshot: Record<string, EquipmentRowSnapshot>;
  } | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let active = true;
    getEquipmentRows(projectId).then((rows) => {
      if (active) setLoaded({ projectId, rows, snapshot: snapshotRows(rows) });
    });
    return () => {
      active = false;
    };
  }, [projectId, reloadToken]);

  const isLoading = loaded === null || loaded.projectId !== projectId;

  function updateField<K extends keyof EquipmentRow>(rowId: string, field: K, value: EquipmentRow[K]) {
    if (!loaded) return;
    const row = loaded.rows.find((r) => r.id === rowId);
    if (!row) return;

    const oldValue = String(row[field] ?? "");
    const newValue = String(value ?? "");
    if (oldValue === newValue) return;

    const now = new Date().toISOString();
    const auditEntry: AuditEntry = { field: String(field), oldValue, newValue, user: currentUserName, time: now };
    const patched: EquipmentRow = { ...row, [field]: value };
    const status = STATUS_DRIVING_FIELDS.has(field) ? computeEquipmentStatus(patched) : row.status;
    const updatedRow: EquipmentRow = { ...patched, status, updatedAt: now, audit: [auditEntry, ...row.audit] };
    const nextRows = loaded.rows.map((r) => (r.id === rowId ? updatedRow : r));

    // Optimistic update — UI reflects the change immediately
    setLoaded({ ...loaded, rows: nextRows });
    // Targeted DB write — only updates the changed row and appends one audit entry
    updateEquipmentRow(projectId, rowId, { [field]: value } as EquipmentRowPatch, auditEntry);
  }

  return {
    rows: isLoading ? null : loaded.rows,
    snapshot: isLoading ? {} : loaded.snapshot,
    isLoading,
    updateField,
    refetch: () => setReloadToken((token) => token + 1),
  };
}
