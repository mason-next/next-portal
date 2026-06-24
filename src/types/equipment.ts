import type { AuditEntry } from "./audit";

export const EQUIPMENT_STATUSES = ["Not Ordered", "Allocated", "Ordered", "Received", "Shipped", "Cancelled"] as const;

export type EquipmentStatus = (typeof EQUIPMENT_STATUSES)[number];

// Today every row comes from a CSV upload. Once a ConnectWise integration lands, rows
// produced by that poll get source "connectwise" instead — same EquipmentRow shape, same
// merge functions, just a different producer of ParsedEquipmentRow[]. See equipment-merge.ts.
export const EQUIPMENT_SOURCES = ["csv", "connectwise"] as const;

export type EquipmentSource = (typeof EQUIPMENT_SOURCES)[number];

export interface EquipmentRow {
  id: string;
  seq: string;
  mfr: string;
  product: string;
  desc: string;
  qty: number;
  // Stock Allocation / Special Order / Cancelled are kept as raw strings rather than
  // booleans — the CSV's "populated or true" rule treats any non-empty, non-falsy cell
  // (a date, a warehouse code, "Yes", etc.) as true. See lib/status.ts isPopulated().
  stockAllocation: string;
  specialOrder: string;
  pickedQty: number;
  shippedQty: number;
  cancelled: string;
  // Always derived via computeEquipmentStatus — never hand-picked, unlike BomRow.status.
  status: EquipmentStatus;
  source: EquipmentSource;
  audit: AuditEntry[];
  updatedAt: string; // ISO 8601
}

// Subset of EquipmentRow used for change-tracking diffs against the snapshot taken at load time.
export interface EquipmentRowSnapshot {
  seq: string;
  mfr: string;
  product: string;
  desc: string;
  qty: string;
  stockAllocation: string;
  specialOrder: string;
  pickedQty: string;
  shippedQty: string;
  cancelled: string;
}

export interface EquipmentUploadRecord {
  id: string;
  fileName: string;
  rowCount: number;
  newCount: number;
  updatedCount: number;
  // Non-zero only for an "override" import, where the existing list is discarded
  // wholesale rather than merged — see equipment-merge.ts replaceAllRows().
  removedCount: number;
  uploadedBy: string;
  uploadedAt: string; // ISO 8601
  source: EquipmentSource;
}
