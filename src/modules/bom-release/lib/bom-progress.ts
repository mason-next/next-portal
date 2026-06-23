import type { BomRow } from "@/types/bom";
import type { WorkflowStepStatus } from "@/types/workflow";

const REVIEWED_STATUSES = new Set(["Approved", "Do Not Order", "Released"]);

export function bomCompletionPercent(rows: BomRow[]): number {
  if (rows.length === 0) return 0;
  const reviewed = rows.filter((row) => REVIEWED_STATUSES.has(row.status)).length;
  return Math.round((reviewed / rows.length) * 100);
}

export function bomReviewStepStatus(rows: BomRow[] | null): WorkflowStepStatus {
  if (!rows || rows.length === 0) return "Not Started";
  const percent = bomCompletionPercent(rows);
  if (percent === 0) return "Not Started";
  if (percent === 100) return "Complete";
  return "In Progress";
}
