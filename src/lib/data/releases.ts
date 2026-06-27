"use server";

import { Prisma, type Release as PrismaRelease } from "@prisma/client";
import { db } from "@/lib/db";
import type { Release } from "@/types/release";
import type { BomRowSnapshot } from "@/types/bom";

function toRelease(p: PrismaRelease): Release {
  return {
    id: p.id,
    projectId: p.projectId,
    releaseNumber: p.releaseNumber,
    shippingType: p.shippingType,
    shipTo: p.shipTo,
    recipients: p.recipients,
    notes: p.notes,
    generatedAt: p.generatedAt ? p.generatedAt.toISOString() : "",
    generatedBy: p.generatedBy,
    rowIds: p.rowIds,
    rowSnapshot: p.rowSnapshot as unknown as BomRowSnapshot[],
    emailPlainText: p.emailPlainText,
    emailHtml: p.emailHtml,
    emailSubject: p.emailSubject,
    updatedAt: p.updatedAt.toISOString(),
  };
}

export async function getReleases(projectId: string): Promise<Release[]> {
  const rows = await db.release.findMany({
    where: { projectId },
    orderBy: { createdAt: "asc" },
  });
  return rows.map(toRelease);
}

export async function createRelease(projectId: string, release: Release): Promise<Release> {
  const row = await db.release.create({
    data: {
      id: release.id,
      projectId,
      releaseNumber: release.releaseNumber,
      shippingType: release.shippingType,
      shipTo: release.shipTo,
      recipients: release.recipients,
      notes: release.notes,
      generatedAt: release.generatedAt ? new Date(release.generatedAt) : null,
      generatedBy: release.generatedBy,
      rowIds: release.rowIds,
      rowSnapshot: release.rowSnapshot as unknown as Prisma.InputJsonValue,
      emailPlainText: release.emailPlainText,
      emailHtml: release.emailHtml,
      emailSubject: release.emailSubject,
    },
  });
  return toRelease(row);
}

export async function updateRelease(
  projectId: string,
  releaseId: string,
  patch: Partial<Release>
): Promise<Release> {
  const data: Parameters<typeof db.release.update>[0]["data"] = {};
  if ("shippingType" in patch)   data.shippingType   = patch.shippingType;
  if ("shipTo" in patch)         data.shipTo         = patch.shipTo;
  if ("recipients" in patch)     data.recipients     = patch.recipients;
  if ("notes" in patch)          data.notes          = patch.notes;
  if ("generatedAt" in patch)    data.generatedAt    = patch.generatedAt ? new Date(patch.generatedAt) : null;
  if ("generatedBy" in patch)    data.generatedBy    = patch.generatedBy;
  if ("rowIds" in patch)         data.rowIds         = patch.rowIds ?? [];
  if ("rowSnapshot" in patch)    data.rowSnapshot    = (patch.rowSnapshot ?? []) as unknown as Prisma.InputJsonValue;
  if ("emailPlainText" in patch) data.emailPlainText = patch.emailPlainText;
  if ("emailHtml" in patch)      data.emailHtml      = patch.emailHtml;
  if ("emailSubject" in patch)   data.emailSubject   = patch.emailSubject;
  // updatedAt is managed by Prisma @updatedAt — never set manually

  const updated = await db.release.update({
    where: { id: releaseId, projectId },
    data,
  });
  return toRelease(updated);
}
