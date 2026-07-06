import type { AuditEntry } from "./audit";

export const BOM_STATUSES = [
  "Not Reviewed",
  "Approved",
  "Pending Verification",
  "Swap/Replace",
  "Do Not Order",
  "On Hold",
  "Released",
  "Ordered",
  "Received",
  "Installed",
] as const;

export type BomStatus = (typeof BOM_STATUSES)[number];

export interface BomRow {
  id: string; // stable client uuid — distinct from seq, never the array index
  seq: string;
  mfr: string;
  part: string;
  desc: string;
  qty: number;
  unitCost: number;
  status: BomStatus;
  releaseId: string | null; // FK to Release.id — canonical assignment
  release: string | null; // e.g. "Release 1" — display label derived from releaseId, never parsed for logic
  releasedAt: string | null; // ISO timestamp once status === "Released"
  shippingType?: string | null;
  shipTo?: string | null;
  notes: string;
  // Embedded for Phase 1 simplicity. A future database phase should migrate this to a
  // separate audit_log table (keyed by row id, with a real userId FK) instead of an
  // unbounded array serialized with every row write.
  audit: AuditEntry[];
  updatedAt: string; // ISO 8601
}

// Subset of BomRow used for change-tracking diffs against the snapshot taken at load time.
export interface BomRowSnapshot {
  seq: string;
  mfr: string;
  part: string;
  desc: string;
  qty: string;
  unitCost: string;
  status: string;
  release: string;
  notes: string;
}

export interface CostSummary {
  fullBomCost: number;
  approvedCost: number;
  releasedCost: number;
  budgetVariance: number;
}

export interface ViewOptionsState {
  hiddenColumns: Set<string>;
  rowFilters: {
    hideReleased: boolean;
    hideDoNotOrder: boolean;
    hideZeroQty: boolean;
    hideBlankMfr: boolean;
  };
}
