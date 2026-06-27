import type { BomRow, BomStatus } from "@/types/bom";
import type { WorkflowStepStatus } from "@/types/workflow";

// Procurement progress stages in ascending order.
// "Do Not Order" rows are always excluded from progress — they are visible in the BOM
// but represent items that will not be purchased, so counting them would dilute the %.
//
// Stage weights: each status is worth one step in the procurement journey:
//   Released → Ordered → Received → Installed (each step = 25% of a row's contribution)
// Approved rows that haven't been released yet count as 0% procurement progress.
// "Released" alone means the PO hasn't been placed yet, so it starts at 25%.
//
// For the BOM Review workflow step (engineering gating), "Approved" + "Do Not Order" still
// count as reviewed — see bomReviewStepStatus().

const PROCUREMENT_PROGRESS: Partial<Record<BomStatus, number>> = {
  Released: 0.25,
  Ordered: 0.5,
  Received: 0.75,
  Installed: 1.0,
};

// Rows excluded from procurement progress entirely.
const EXCLUDED_STATUSES = new Set<BomStatus>(["Do Not Order"]);

// Rows that count as "engineering reviewed" for the BOM Review workflow step.
const ENGINEERING_REVIEWED = new Set<BomStatus>([
  "Approved",
  "Do Not Order",
  "Released",
  "Ordered",
  "Received",
  "Installed",
]);

// Procurement progress: what fraction of orderable items have been processed through
// the full procurement lifecycle (Released → Ordered → Received → Installed).
export function procurementProgressPercent(rows: BomRow[]): number {
  const orderable = rows.filter((r) => !EXCLUDED_STATUSES.has(r.status));
  if (orderable.length === 0) return 0;

  const totalPoints = orderable.reduce((sum, row) => {
    return sum + (PROCUREMENT_PROGRESS[row.status] ?? 0);
  }, 0);

  return Math.round((totalPoints / orderable.length) * 100);
}

// Engineering review progress: what fraction of items have been reviewed by engineering
// (approved, released, or marked do-not-order). Used for the BOM Review workflow step.
export function bomCompletionPercent(rows: BomRow[]): number {
  if (rows.length === 0) return 0;
  const reviewed = rows.filter((r) => ENGINEERING_REVIEWED.has(r.status)).length;
  return Math.round((reviewed / rows.length) * 100);
}

// Summary breakdown for display in the cost summary cards / progress panel.
export interface BomProgressSummary {
  total: number;
  doNotOrder: number;
  orderable: number; // total - doNotOrder
  approved: number;  // approved but not yet released
  released: number;
  ordered: number;
  received: number;
  installed: number;
  engineeringReviewPct: number;   // for BOM Review step
  procurementProgressPct: number; // for procurement tracking
}

export function getBomProgressSummary(rows: BomRow[]): BomProgressSummary {
  const total = rows.length;
  const doNotOrder = rows.filter((r) => r.status === "Do Not Order").length;
  const orderable = total - doNotOrder;
  const approved = rows.filter((r) => r.status === "Approved").length;
  const released = rows.filter((r) => r.status === "Released").length;
  const ordered = rows.filter((r) => r.status === "Ordered").length;
  const received = rows.filter((r) => r.status === "Received").length;
  const installed = rows.filter((r) => r.status === "Installed").length;

  return {
    total,
    doNotOrder,
    orderable,
    approved,
    released,
    ordered,
    received,
    installed,
    engineeringReviewPct: bomCompletionPercent(rows),
    procurementProgressPct: procurementProgressPercent(rows),
  };
}

export function bomReviewStepStatus(rows: BomRow[] | null): WorkflowStepStatus {
  if (!rows || rows.length === 0) return "Not Started";
  const percent = bomCompletionPercent(rows);
  if (percent === 0) return "Not Started";
  if (percent === 100) return "Complete";
  return "In Progress";
}
