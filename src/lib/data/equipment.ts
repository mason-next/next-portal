"use server";

import {
  EquipmentSource as PrismaEquipmentSource,
  type EquipmentRow as PrismaEquipmentRow,
  type EquipmentAuditLog as PrismaAuditLog,
  type EquipmentUpload as PrismaUpload,
} from "@prisma/client";
import { db } from "@/lib/db";
import { computeEquipmentStatus } from "@/modules/equipment-tracking/lib/status";
import type { AuditEntry } from "@/types/audit";
import type { EquipmentRow, EquipmentUploadRecord } from "@/types/equipment";

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

type PrismaRowWithAudit = PrismaEquipmentRow & { auditLog: PrismaAuditLog[] };

function toEquipmentRow(p: PrismaRowWithAudit): EquipmentRow {
  return {
    id: p.id,
    seq: p.seq,
    mfr: p.mfr,
    product: p.product,
    desc: p.desc,
    qty: p.qty,
    unitCost: p.unitCost,
    stockAllocation: p.stockAllocation,
    specialOrder: p.specialOrder,
    pickedQty: p.pickedQty,
    shippedQty: p.shippedQty,
    cancelled: p.cancelled,
    poInfo: p.poInfo,
    // status is always computed — never stored in the DB
    status: computeEquipmentStatus({
      qty: p.qty,
      stockAllocation: p.stockAllocation,
      specialOrder: p.specialOrder,
      pickedQty: p.pickedQty,
      shippedQty: p.shippedQty,
      cancelled: p.cancelled,
      poInfo: p.poInfo,
    }),
    rmaRequestedAt: p.rmaRequestedAt ? p.rmaRequestedAt.toISOString() : null,
    source: p.source as EquipmentRow["source"],
    // auditLog ordered newest-first to match the prepend pattern in useEquipmentRows
    audit: p.auditLog.map(toAuditEntry),
    updatedAt: p.updatedAt.toISOString(),
  };
}

function toUploadRecord(p: PrismaUpload): EquipmentUploadRecord {
  return {
    id: p.id,
    fileName: p.fileName,
    rowCount: p.rowCount,
    newCount: p.newCount,
    updatedCount: p.updatedCount,
    removedCount: p.removedCount,
    uploadedBy: p.uploadedBy,
    uploadedAt: p.uploadedAt.toISOString(),
    source: p.source as EquipmentUploadRecord["source"],
  };
}

// ─── Queries ──────────────────────────────────────────────────────────────────

export async function getEquipmentRows(projectId: string): Promise<EquipmentRow[]> {
  const rows = await db.equipmentRow.findMany({
    where: { projectId },
    orderBy: { sortOrder: "asc" },
    include: { auditLog: { orderBy: { createdAt: "desc" } } },
  });
  return rows.map(toEquipmentRow);
}

export async function getEquipmentUploadHistory(projectId: string): Promise<EquipmentUploadRecord[]> {
  const rows = await db.equipmentUpload.findMany({
    where: { projectId },
    orderBy: { uploadedAt: "desc" },
  });
  return rows.map(toUploadRecord);
}

// ─── Mutations ────────────────────────────────────────────────────────────────

// Bulk replace — used by the import modal (first import, merge, replace modes).
// Deletes all existing rows for the project (cascade removes their audit logs),
// then recreates the full list preserving IDs and embedded audit history.
export async function saveEquipmentRows(projectId: string, rows: EquipmentRow[]): Promise<void> {
  await db.$transaction(
    async (tx) => {
      await tx.equipmentRow.deleteMany({ where: { projectId } });

      for (const [index, row] of rows.entries()) {
        await tx.equipmentRow.create({
          data: {
            id: row.id,
            projectId,
            seq: row.seq,
            mfr: row.mfr,
            product: row.product,
            desc: row.desc,
            qty: row.qty,
            unitCost: row.unitCost,
            stockAllocation: row.stockAllocation,
            specialOrder: row.specialOrder,
            pickedQty: row.pickedQty,
            shippedQty: row.shippedQty,
            cancelled: row.cancelled,
            poInfo: row.poInfo,
            rmaRequestedAt: row.rmaRequestedAt ? new Date(row.rmaRequestedAt) : null,
            source: row.source as PrismaEquipmentSource,
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

// Updatable fields — a subset of EquipmentRow that maps 1-to-1 to DB columns.
// status is excluded (computed). audit is managed via auditEntry param. id/projectId are immutable.
export interface EquipmentRowPatch {
  seq?: string;
  mfr?: string;
  product?: string;
  desc?: string;
  qty?: number;
  unitCost?: number;
  stockAllocation?: string;
  specialOrder?: string;
  pickedQty?: number;
  shippedQty?: number;
  cancelled?: string;
  poInfo?: string;
  rmaRequestedAt?: string | null;
}

// Targeted single-row update — used by useEquipmentRows.updateField.
// More efficient than saveEquipmentRows for individual cell edits because it
// updates only the changed row and appends exactly one audit log entry.
export async function updateEquipmentRow(
  _projectId: string,
  rowId: string,
  patch: EquipmentRowPatch,
  auditEntry: AuditEntry
): Promise<void> {
  const data: Parameters<typeof db.equipmentRow.update>[0]["data"] = {};

  if ("seq" in patch)              data.seq = patch.seq;
  if ("mfr" in patch)              data.mfr = patch.mfr;
  if ("product" in patch)          data.product = patch.product;
  if ("desc" in patch)             data.desc = patch.desc;
  if ("qty" in patch)              data.qty = patch.qty;
  if ("unitCost" in patch)         data.unitCost = patch.unitCost;
  if ("stockAllocation" in patch)  data.stockAllocation = patch.stockAllocation;
  if ("specialOrder" in patch)     data.specialOrder = patch.specialOrder;
  if ("pickedQty" in patch)        data.pickedQty = patch.pickedQty;
  if ("shippedQty" in patch)       data.shippedQty = patch.shippedQty;
  if ("cancelled" in patch)        data.cancelled = patch.cancelled;
  if ("poInfo" in patch)           data.poInfo = patch.poInfo;
  if ("rmaRequestedAt" in patch) {
    data.rmaRequestedAt = patch.rmaRequestedAt ? new Date(patch.rmaRequestedAt) : null;
  }

  await db.equipmentRow.update({
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

export async function appendEquipmentUploadRecord(
  projectId: string,
  record: EquipmentUploadRecord
): Promise<void> {
  await db.equipmentUpload.create({
    data: {
      id: record.id,
      projectId,
      fileName: record.fileName,
      rowCount: record.rowCount,
      newCount: record.newCount,
      updatedCount: record.updatedCount,
      removedCount: record.removedCount,
      uploadedBy: record.uploadedBy,
      uploadedAt: new Date(record.uploadedAt),
      source: record.source as PrismaEquipmentSource,
    },
  });
}
