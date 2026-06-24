import type { EquipmentRow, EquipmentStatus } from "@/types/equipment";
import { EQUIPMENT_STATUSES } from "@/types/equipment";
import type { WorkflowStepStatus } from "@/types/workflow";

export interface EquipmentSummary {
  total: number;
  byStatus: Record<EquipmentStatus, number>;
  activeCount: number; // total minus Cancelled
  outstanding: number; // active minus Shipped
  readyForInstallationPercent: number; // Shipped / active
  procurementProgressPercent: number; // (Received + Shipped) / active
}

export function computeEquipmentSummary(rows: EquipmentRow[]): EquipmentSummary {
  const byStatus = Object.fromEntries(EQUIPMENT_STATUSES.map((status) => [status, 0])) as Record<
    EquipmentStatus,
    number
  >;
  for (const row of rows) byStatus[row.status]++;

  const activeCount = rows.length - byStatus.Cancelled;
  const outstanding = activeCount - byStatus.Shipped;
  const readyForInstallationPercent = activeCount > 0 ? Math.round((byStatus.Shipped / activeCount) * 100) : 0;
  const procurementProgressPercent =
    activeCount > 0 ? Math.round(((byStatus.Received + byStatus.Shipped) / activeCount) * 100) : 0;

  return {
    total: rows.length,
    byStatus,
    activeCount,
    outstanding,
    readyForInstallationPercent,
    procurementProgressPercent,
  };
}

// Mirrors bomReviewStepStatus — the Equipment Tracking workflow step's status/percent are
// always derived from this, never hand-set (see module-progress.ts).
export function equipmentTrackingStepStatus(rows: EquipmentRow[] | null): WorkflowStepStatus {
  if (!rows || rows.length === 0) return "Not Started";
  const percent = computeEquipmentSummary(rows).procurementProgressPercent;
  if (percent === 0) return "Not Started";
  if (percent === 100) return "Complete";
  return "In Progress";
}
