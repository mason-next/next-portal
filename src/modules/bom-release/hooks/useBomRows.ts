"use client";

import { useEffect, useState } from "react";
import { getBomRows, saveBomRows, updateBomRow, type BomRowPatch } from "@/lib/data/bom-rows";
import { useSession } from "@/lib/auth/client";
import type { AuditEntry } from "@/types/audit";
import type { BomRow, BomRowSnapshot, BomStatus } from "@/types/bom";
import { snapshotRows } from "@/modules/bom-release/lib/change-tracking";

export function useBomRows(projectId: string) {
  const { name: currentUserName } = useSession();
  // Keyed by the projectId it was fetched for, so a project switch is "loading" until
  // the new fetch resolves, without an explicit reset call inside the effect body
  // (https://react.dev/learn/you-might-not-need-an-effect).
  const [loaded, setLoaded] = useState<{
    projectId: string;
    rows: BomRow[];
    snapshot: Record<string, BomRowSnapshot>;
  } | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let active = true;
    getBomRows(projectId).then((rows) => {
      if (active) setLoaded({ projectId, rows, snapshot: snapshotRows(rows) });
    });
    return () => {
      active = false;
    };
  }, [projectId, reloadToken]);

  const isLoading = loaded === null || loaded.projectId !== projectId;

  function updateField<K extends keyof BomRow>(rowId: string, field: K, value: BomRow[K]) {
    if (!loaded) return;
    const row = loaded.rows.find((r) => r.id === rowId);
    if (!row) return;

    const oldValue = String(row[field] ?? "");
    const newValue = String(value ?? "");
    if (oldValue === newValue) return;

    const now = new Date().toISOString();
    const auditEntry: AuditEntry = { field: String(field), oldValue, newValue, user: currentUserName, time: now };
    const updatedRow: BomRow = { ...row, [field]: value, updatedAt: now, audit: [auditEntry, ...row.audit] };
    const nextRows = loaded.rows.map((r) => (r.id === rowId ? updatedRow : r));

    setLoaded({ ...loaded, rows: nextRows });
    // Targeted DB write — only updates the changed row and appends one audit entry
    updateBomRow(projectId, rowId, { [field]: value } as BomRowPatch, auditEntry);
  }

  // Applies the same status to many rows in one pass. Cannot be expressed as a loop of
  // updateField() calls: each call would read the same stale `loaded.rows` closure, so
  // only the last call's change would actually persist.
  function bulkUpdateStatus(rowIds: string[], status: BomStatus) {
    if (!loaded) return;
    const idSet = new Set(rowIds);
    const now = new Date().toISOString();
    let changed = false;

    const nextRows = loaded.rows.map((row) => {
      if (!idSet.has(row.id) || row.status === status) return row;
      changed = true;
      const auditEntry: AuditEntry = {
        field: "status",
        oldValue: row.status,
        newValue: status,
        user: currentUserName,
        time: now,
      };
      return { ...row, status, updatedAt: now, audit: [auditEntry, ...row.audit] };
    });

    if (!changed) return;
    setLoaded({ ...loaded, rows: nextRows });
    saveBomRows(projectId, nextRows);
  }

  // Assigns a row to a release (or clears it) — releaseId and releaseLabel always
  // move together. Uses a targeted update since only one row changes.
  function assignRelease(rowId: string, releaseId: string | null, releaseLabel: string | null) {
    if (!loaded) return;
    const row = loaded.rows.find((r) => r.id === rowId);
    if (!row) return;

    const oldLabel = row.release ?? "";
    const newLabel = releaseLabel ?? "";
    if (oldLabel === newLabel) return;

    const now = new Date().toISOString();
    const auditEntry: AuditEntry = {
      field: "release",
      oldValue: oldLabel,
      newValue: newLabel,
      user: currentUserName,
      time: now,
    };
    const updatedRow: BomRow = {
      ...row,
      releaseId,
      release: releaseLabel,
      updatedAt: now,
      audit: [auditEntry, ...row.audit],
    };
    const nextRows = loaded.rows.map((r) => (r.id === rowId ? updatedRow : r));

    setLoaded({ ...loaded, rows: nextRows });
    updateBomRow(projectId, rowId, { releaseId, releaseLabel }, auditEntry);
  }

  // Assigns many rows to the same release in one pass — same stale-closure reason as
  // bulkUpdateStatus above.
  function bulkAssignRelease(rowIds: string[], releaseId: string | null, releaseLabel: string | null) {
    if (!loaded) return;
    const idSet = new Set(rowIds);
    const now = new Date().toISOString();
    const newLabel = releaseLabel ?? "";
    let changed = false;

    const nextRows = loaded.rows.map((row) => {
      if (!idSet.has(row.id) || (row.release ?? "") === newLabel) return row;
      changed = true;
      const auditEntry: AuditEntry = {
        field: "release",
        oldValue: row.release ?? "",
        newValue: newLabel,
        user: currentUserName,
        time: now,
      };
      return { ...row, releaseId, release: releaseLabel, updatedAt: now, audit: [auditEntry, ...row.audit] };
    });

    if (!changed) return;
    setLoaded({ ...loaded, rows: nextRows });
    saveBomRows(projectId, nextRows);
  }

  // Transitions the given rows to Released + stamps releasedAt/shipping, in one pass.
  // Returns the updated rows so the caller can build a release snapshot from them.
  function markRowsReleased(rowIds: string[], shippingType: string, shipTo: string): BomRow[] | null {
    if (!loaded) return null;
    const idSet = new Set(rowIds);
    const now = new Date().toISOString();
    let changed = false;

    const nextRows = loaded.rows.map((row) => {
      if (!idSet.has(row.id)) return row;
      changed = true;
      const statusEntry: AuditEntry = {
        field: "release generated",
        oldValue: row.status,
        newValue: "Released",
        user: currentUserName,
        time: now,
      };
      const shippingEntry: AuditEntry = {
        field: "shipping",
        oldValue: "",
        newValue: `${shippingType} to ${shipTo}`,
        user: currentUserName,
        time: now,
      };
      return {
        ...row,
        status: "Released" as const,
        releasedAt: now,
        shippingType,
        shipTo,
        updatedAt: now,
        audit: [shippingEntry, statusEntry, ...row.audit],
      };
    });

    if (!changed) return null;
    setLoaded({ ...loaded, rows: nextRows });
    saveBomRows(projectId, nextRows);
    return nextRows;
  }

  function deleteRows(rowIds: string[]) {
    if (!loaded) return;
    const idSet = new Set(rowIds);
    const nextRows = loaded.rows.filter((row) => !idSet.has(row.id));
    if (nextRows.length === loaded.rows.length) return;

    setLoaded({ ...loaded, rows: nextRows });
    saveBomRows(projectId, nextRows);
  }

  function addRow() {
    if (!loaded) return;
    const now = new Date().toISOString();

    const newRow: BomRow = {
      id: crypto.randomUUID(),
      seq: "",
      mfr: "",
      part: "",
      desc: "",
      qty: 1,
      unitCost: 0,
      status: "Pending Review",
      releaseId: null,
      release: null,
      releasedAt: null,
      notes: "",
      audit: [],
      updatedAt: now,
    };

    const nextRows = [...loaded.rows, newRow];
    setLoaded({ ...loaded, rows: nextRows });
    saveBomRows(projectId, nextRows);
  }

  function reorderRows(fromIndex: number, toIndex: number) {
    if (!loaded || fromIndex === toIndex) return;
    const rows = [...loaded.rows];
    const [moved] = rows.splice(fromIndex, 1);
    if (!moved) return;

    const now = new Date().toISOString();
    const auditEntry: AuditEntry = {
      field: "row order",
      oldValue: `Position ${fromIndex + 1}`,
      newValue: `Position ${toIndex + 1}`,
      user: currentUserName,
      time: now,
    };
    rows.splice(toIndex, 0, { ...moved, updatedAt: now, audit: [auditEntry, ...moved.audit] });

    setLoaded({ ...loaded, rows });
    saveBomRows(projectId, rows);
  }

  return {
    rows: isLoading ? null : loaded.rows,
    snapshot: isLoading ? {} : loaded.snapshot,
    isLoading,
    updateField,
    bulkUpdateStatus,
    assignRelease,
    bulkAssignRelease,
    markRowsReleased,
    addRow,
    deleteRows,
    reorderRows,
    refetch: () => setReloadToken((token) => token + 1),
  };
}
