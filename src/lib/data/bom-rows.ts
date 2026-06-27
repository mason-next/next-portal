"use server";

import {
  BomStatus as PrismaBomStatus,
  type BomRow as PrismaBomRow,
  type BomAuditLog as PrismaAuditLog,
} from "@prisma/client";
import { db } from "@/lib/db";
import type { AuditEntry } from "@/types/audit";
import type { BomRow } from "@/types/bom";

// ─── Status mapping ───────────────────────────────────────────────────────────

const PRISMA_TO_APP: Record<PrismaBomStatus, BomRow["status"]> = {
  PendingReview: "Pending Review",
  Approved: "Approved",
  UpdateNeeded: "Update Needed",
  DoNotOrder: "Do Not Order",
  OnHold: "On Hold",
  Released: "Released",
  Ordered: "Ordered",
  Received: "Received",
  Installed: "Installed",
};

const APP_TO_PRISMA: Record<BomRow["status"], PrismaBomStatus> = {
  "Pending Review": "PendingReview",
  Approved: "Approved",
  "Update Needed": "UpdateNeeded",
  "Do Not Order": "DoNotOrder",
  "On Hold": "OnHold",
  Released: "Released",
  Ordered: "Ordered",
  Received: "Received",
  Installed: "Installed",
};

// ─── Type mappers ─────────────────────────────────────────────────────────────

function toAuditEntry(p: PrismaAuditLog): AuditEntry {
  return {
    field: p.field,
    oldValue: p.oldValue,
    newValue: p.newValue,
    user: p.userName,
    time: p.createdAt.toISOString(),
  };
}

type PrismaRowWithAudit = PrismaBomRow & { auditLog: PrismaAuditLog[] };

function toBomRow(p: PrismaRowWithAudit): BomRow {
  return {
    id: p.id,
    seq: p.seq,
    mfr: p.mfr,
    part: p.part,
    desc: p.desc,
    qty: p.qty,
    unitCost: p.unitCost,
    status: PRISMA_TO_APP[p.status],
    // releaseId stores the localStorage Release UUID as a plain string (no FK until Release migration).
    // releaseLabel holds the display label "Release 1" etc.
    releaseId: p.releaseId,
    release: p.releaseLabel,
    releasedAt: p.releasedAt ? p.releasedAt.toISOString() : null,
    shippingType: p.shippingType,
    shipTo: p.shipTo,
    notes: p.notes,
    // auditLog ordered newest-first to match the prepend pattern in useBomRows
    audit: p.auditLog.map(toAuditEntry),
    updatedAt: p.updatedAt.toISOString(),
  };
}

// ─── Queries ──────────────────────────────────────────────────────────────────

export async function getBomRows(projectId: string): Promise<BomRow[]> {
  const rows = await db.bomRow.findMany({
    where: { projectId },
    orderBy: { sortOrder: "asc" },
    include: { auditLog: { orderBy: { createdAt: "desc" } } },
  });
  return rows.map(toBomRow);
}

// ─── Mutations ────────────────────────────────────────────────────────────────

// Bulk replace — used by CSV import, delete rows, add row, reorder, and any
// operation that changes multiple rows at once. Deletes all existing rows for
// the project (cascade removes their audit logs), then recreates the full list.
export async function saveBomRows(projectId: string, rows: BomRow[]): Promise<void> {
  await db.$transaction(
    async (tx) => {
      await tx.bomRow.deleteMany({ where: { projectId } });

      for (const [index, row] of rows.entries()) {
        await tx.bomRow.create({
          data: {
            id: row.id,
            projectId,
            seq: row.seq,
            mfr: row.mfr,
            part: row.part,
            desc: row.desc,
            qty: row.qty,
            unitCost: row.unitCost,
            status: APP_TO_PRISMA[row.status],
            releaseId: row.releaseId,
            releaseLabel: row.release,
            releasedAt: row.releasedAt ? new Date(row.releasedAt) : null,
            shippingType: row.shippingType,
            shipTo: row.shipTo,
            notes: row.notes,
            sortOrder: index,
            auditLog: {
              create: row.audit.map((entry) => ({
                field: entry.field,
                oldValue: entry.oldValue,
                newValue: entry.newValue,
                userName: entry.user,
                createdAt: new Date(entry.time),
              })),
            },
          },
        });
      }
    },
    { maxWait: 10000, timeout: 30000 }
  );
}

// Updatable fields for targeted single-row writes.
// status is the app string union; releaseId/releaseLabel move together.
export interface BomRowPatch {
  seq?: string;
  mfr?: string;
  part?: string;
  desc?: string;
  qty?: number;
  unitCost?: number;
  status?: BomRow["status"];
  releaseId?: string | null;
  releaseLabel?: string | null;
  releasedAt?: string | null;
  shippingType?: string | null;
  shipTo?: string | null;
  notes?: string;
}

// Targeted single-row update — used by useBomRows.updateField and assignRelease.
// More efficient than saveBomRows for individual cell edits.
export async function updateBomRow(
  _projectId: string,
  rowId: string,
  patch: BomRowPatch,
  auditEntry: AuditEntry
): Promise<void> {
  const data: Parameters<typeof db.bomRow.update>[0]["data"] = {};

  if ("seq" in patch)          data.seq = patch.seq;
  if ("mfr" in patch)          data.mfr = patch.mfr;
  if ("part" in patch)         data.part = patch.part;
  if ("desc" in patch)         data.desc = patch.desc;
  if ("qty" in patch)          data.qty = patch.qty;
  if ("unitCost" in patch)     data.unitCost = patch.unitCost;
  if ("status" in patch && patch.status) data.status = APP_TO_PRISMA[patch.status];
  if ("releaseId" in patch)    data.releaseId = patch.releaseId;
  if ("releaseLabel" in patch) data.releaseLabel = patch.releaseLabel;
  if ("releasedAt" in patch)   data.releasedAt = patch.releasedAt ? new Date(patch.releasedAt) : null;
  if ("shippingType" in patch) data.shippingType = patch.shippingType;
  if ("shipTo" in patch)       data.shipTo = patch.shipTo;
  if ("notes" in patch)        data.notes = patch.notes;

  await db.bomRow.update({
    where: { id: rowId },
    data: {
      ...data,
      auditLog: {
        create: {
          field: auditEntry.field,
          oldValue: auditEntry.oldValue,
          newValue: auditEntry.newValue,
          userName: auditEntry.user,
          createdAt: new Date(auditEntry.time),
        },
      },
    },
  });
}
