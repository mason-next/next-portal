"use server";

// One-way ConnectWise → portal sync for opportunities.
//
// ConnectWise is never written to. Each import row is matched to a portal deal by
// CW opportunity # (or explicitly linked to a local, not-yet-in-CW deal) and the
// CW-owned fields are brought across. The CW values from the previous import are kept
// in `cwSnapshot`, so a field is only overwritten when it actually changed in
// ConnectWise — edits made in the portal (stage moved forward, owner fixed, name
// cleaned up) survive re-imports until CW itself changes that field.

import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { resolveSalesWriteScope, resolveSalesScope } from "@/lib/access-control";
import { stageToDb, toStage, sanitizeRating } from "@/lib/data/sales-mappers";
import { isMine, recordAudit, runStageAutomation } from "@/lib/data/crm-internal";
import type { OppStage, ProposalRating } from "@/types/sales";

export interface CwImportRow {
  cwNumber: string;
  companyId: string;
  name: string;
  stage: OppStage;
  ownerName: string;
  ownerId: string | null;
  value: number;               // cents
  closeDate: string | null;    // yyyy-mm-dd
  proposalCreatedAt: string | null;
  rating: ProposalRating | null;
  /** Link this CW row to an existing local deal that has no CW # yet. */
  linkToId?: string | null;
}

export type CwSyncOutcome = "created" | "updated" | "linked" | "unchanged" | "skipped";

interface Snapshot {
  name: string;
  stage: OppStage;
  ownerName: string;
  value: number;
  closeDate: string;
  proposalCreatedAt: string;
  rating: string;
}

const STAGE_RANK: Record<OppStage, number> = {
  Prospecting: 0, Qualifying: 1, Proposal: 2, "Closed Won": 3, "Closed Lost": 3,
};

const day = (v: Date | string | null | undefined) =>
  !v ? "" : (typeof v === "string" ? v : v.toISOString()).slice(0, 10);
const toDate = (v: string | null) => (v ? new Date(`${v.slice(0, 10)}T12:00:00.000Z`) : null);

function snapshotOf(r: CwImportRow): Snapshot {
  return {
    name: r.name.trim(),
    stage: r.stage,
    ownerName: r.ownerName.trim(),
    value: Math.round(r.value),
    closeDate: day(r.closeDate),
    proposalCreatedAt: day(r.proposalCreatedAt),
    rating: r.rating ?? "",
  };
}

/**
 * Imports one ConnectWise opportunity. Never throws for expected cases (someone
 * else's deal, bad link) — returns "skipped" with a reason so a bulk import continues.
 */
export async function syncCwOpportunity(row: CwImportRow): Promise<{ outcome: CwSyncOutcome; id?: string; reason?: string }> {
  const scope = await resolveSalesWriteScope("salesActivity");
  const cwNumber = row.cwNumber.trim();
  const incoming = snapshotOf(row);

  // Reps import only their own deals: skip CW rows assigned to a different portal user.
  // (An unmatched CW username is treated as the importing rep's own row.)
  if (!scope.canSeeAll && incoming.ownerName && incoming.ownerName !== scope.userName) {
    const other = await db.user.findFirst({ where: { name: incoming.ownerName, id: { not: scope.userId } }, select: { id: true } });
    if (other) return { outcome: "skipped", reason: "Assigned to another rep in ConnectWise" };
  }
  const company = await db.salesCompany.findUnique({ where: { id: row.companyId }, select: { id: true } });
  if (!company) return { outcome: "skipped", reason: "Company not found" };

  let existing = cwNumber ? await db.salesOpportunity.findFirst({ where: { cwNumber } }) : null;
  let linking = false;
  if (!existing && row.linkToId) {
    const local = await db.salesOpportunity.findUnique({ where: { id: row.linkToId } });
    if (local && !local.cwNumber && isMine(scope, local.ownerId, local.ownerName)) {
      existing = local;
      linking = true;
    }
  }

  // ── New deal from ConnectWise ────────────────────────────────────────────
  if (!existing) {
    const ownerName = scope.canSeeAll ? incoming.ownerName : scope.userName;
    const ownerId = scope.canSeeAll ? row.ownerId : scope.userId;
    const created = await db.salesOpportunity.create({
      data: {
        companyId: row.companyId,
        name: incoming.name,
        stage: stageToDb(incoming.stage),
        ownerId,
        ownerName,
        value: incoming.value,
        closeDate: toDate(row.closeDate),
        proposalCreatedAt: toDate(row.proposalCreatedAt),
        rating: sanitizeRating(row.rating),
        cwNumber: cwNumber || null,
        cwSnapshot: cwNumber ? (incoming as unknown as Prisma.InputJsonValue) : undefined,
        cwSyncedAt: cwNumber ? new Date() : null,
        stageChangedAt: new Date(),
      },
    });
    await recordAudit(scope, [{
      entityType: "opportunity", entityId: created.id, companyId: created.companyId, opportunityId: created.id,
      action: "created", newValue: `${created.name} (imported from ConnectWise${cwNumber ? ` #${cwNumber}` : ""})`,
    }]);
    await runStageAutomation(scope, created, "Prospecting", incoming.stage);
    return { outcome: "created", id: created.id };
  }

  if (!isMine(scope, existing.ownerId, existing.ownerName)) {
    return { outcome: "skipped", reason: "Deal belongs to another rep" };
  }

  // ── Update an existing / newly linked deal ───────────────────────────────
  const prev = (existing.cwSnapshot && typeof existing.cwSnapshot === "object"
    ? (existing.cwSnapshot as unknown as Partial<Snapshot>)
    : null);
  // A field is taken from CW when CW changed it since the last import. With no previous
  // import to compare against (first sync / new link), CW is the reference for its own
  // fields, except the stage, which only moves forward (or to closed) so a deal the rep
  // already advanced in the portal isn't pulled back.
  const cwChanged = <K extends keyof Snapshot>(k: K) =>
    prev ? String(prev[k] ?? "") !== String(incoming[k]) : true;

  const localStage = toStage(existing.stage);
  const current: Snapshot = {
    name: existing.name,
    stage: localStage,
    ownerName: existing.ownerName,
    value: existing.value,
    closeDate: day(existing.closeDate),
    proposalCreatedAt: day(existing.proposalCreatedAt),
    rating: existing.rating ?? "",
  };

  const data: Prisma.SalesOpportunityUpdateInput = {};
  const changes: { field: keyof Snapshot; from: string; to: string }[] = [];
  const take = <K extends keyof Snapshot>(k: K, apply: () => void) => {
    if (String(current[k]) === String(incoming[k])) return;
    apply();
    changes.push({ field: k, from: String(current[k]), to: String(incoming[k]) });
  };

  if (cwChanged("name") && incoming.name) take("name", () => { data.name = incoming.name; });
  if (cwChanged("value")) take("value", () => { data.value = incoming.value; });
  if (cwChanged("closeDate")) take("closeDate", () => { data.closeDate = toDate(row.closeDate); });
  if (cwChanged("proposalCreatedAt")) take("proposalCreatedAt", () => { data.proposalCreatedAt = toDate(row.proposalCreatedAt); });
  if (cwChanged("rating")) take("rating", () => { data.rating = sanitizeRating(row.rating); });

  const stageShouldMove = prev
    ? cwChanged("stage")
    : STAGE_RANK[incoming.stage] > STAGE_RANK[localStage] || (STAGE_RANK[incoming.stage] === 3 && incoming.stage !== localStage);
  if (stageShouldMove) {
    take("stage", () => { data.stage = stageToDb(incoming.stage); data.stageChangedAt = new Date(); });
  }

  // Ownership follows CW only on a manager's import (reps can't reassign deals).
  if (scope.canSeeAll && incoming.ownerName && (prev ? cwChanged("ownerName") : !existing.ownerName)) {
    take("ownerName", () => { data.ownerName = incoming.ownerName; data.ownerId = row.ownerId; });
  }

  if (linking) data.cwNumber = cwNumber;
  data.cwSnapshot = incoming as unknown as Prisma.InputJsonValue;
  data.cwSyncedAt = new Date();

  const updated = await db.salesOpportunity.update({ where: { id: existing.id }, data });

  await recordAudit(scope, [
    ...(linking ? [{
      entityType: "opportunity" as const, entityId: updated.id, companyId: updated.companyId, opportunityId: updated.id,
      action: "cw_linked", field: "cwNumber", newValue: cwNumber,
    }] : []),
    ...changes.map((c) => ({
      entityType: "opportunity" as const, entityId: updated.id, companyId: updated.companyId, opportunityId: updated.id,
      action: c.field === "stage" ? "stage_changed" : "cw_sync", field: c.field,
      oldValue: c.from, newValue: c.to,
    })),
  ]);
  if (changes.some((c) => c.field === "stage")) {
    await runStageAutomation(scope, updated, localStage, incoming.stage);
  }

  return { outcome: linking ? "linked" : changes.length ? "updated" : "unchanged", id: updated.id };
}

/**
 * Whether a CW opportunity # is free to be linked to the given deal. Used by the deal
 * editor before saving a manually entered CW # (returns no details about other deals).
 */
export async function checkCwNumberAvailable(cwNumber: string, excludeId?: string): Promise<boolean> {
  await resolveSalesScope("salesActivity");
  const n = cwNumber.trim();
  if (!n) return true;
  const hit = await db.salesOpportunity.findFirst({
    where: { cwNumber: n, ...(excludeId ? { id: { not: excludeId } } : {}) },
    select: { id: true },
  });
  return !hit;
}
