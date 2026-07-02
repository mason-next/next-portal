"use server";

import { requireAdmin } from "@/lib/access-control";
import type { License, CreateLicenseInput, LicenseAttachment } from "@/types/license";

// The Prisma client doesn't know about the License model yet (not regenerated locally),
// so we cast through `db` using the any pattern established elsewhere in the codebase.
import { db } from "@/lib/db";

type PrismaLicense = {
  id: string;
  state: string;
  licenseType: string;
  licenseNumber: string;
  holderName: string;
  renewalDate: Date | null;
  renewalRequirements: string;
  status: string;
  notes: string;
  attachments: unknown;
  createdAt: Date;
  updatedAt: Date;
};

type LicenseDb = {
  findMany: (args?: unknown) => Promise<PrismaLicense[]>;
  create: (args: unknown) => Promise<PrismaLicense>;
  update: (args: unknown) => Promise<PrismaLicense>;
  delete: (args: unknown) => Promise<void>;
};

function licenseDb(): LicenseDb {
  return (db as unknown as { license: LicenseDb }).license;
}

function parseAttachments(raw: unknown): LicenseAttachment[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (a): a is LicenseAttachment =>
      a && typeof a === "object" && typeof a.storedName === "string"
  );
}

function toLicense(p: PrismaLicense): License {
  return {
    id: p.id,
    state: p.state,
    licenseType: p.licenseType,
    licenseNumber: p.licenseNumber,
    holderName: p.holderName,
    renewalDate: p.renewalDate?.toISOString() ?? null,
    renewalRequirements: p.renewalRequirements,
    status: p.status as License["status"],
    notes: p.notes,
    attachments: parseAttachments(p.attachments),
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}

export async function getLicenses(): Promise<License[]> {
  const rows = await licenseDb().findMany({ orderBy: { state: "asc" } });
  return rows.map(toLicense);
}

export async function createLicense(input: CreateLicenseInput): Promise<License> {
  await requireAdmin();
  const row = await licenseDb().create({
    data: {
      state: input.state,
      licenseType: input.licenseType,
      licenseNumber: input.licenseNumber,
      holderName: input.holderName,
      renewalDate: input.renewalDate ? new Date(input.renewalDate) : null,
      renewalRequirements: input.renewalRequirements,
      status: input.status,
      notes: input.notes,
    },
  });
  return toLicense(row);
}

export async function updateLicense(
  id: string,
  patch: Partial<CreateLicenseInput>
): Promise<License> {
  await requireAdmin();
  const data: Record<string, unknown> = {};
  if ("state" in patch)               data.state = patch.state;
  if ("licenseType" in patch)         data.licenseType = patch.licenseType;
  if ("licenseNumber" in patch)       data.licenseNumber = patch.licenseNumber;
  if ("holderName" in patch)          data.holderName = patch.holderName;
  if ("renewalDate" in patch)         data.renewalDate = patch.renewalDate ? new Date(patch.renewalDate!) : null;
  if ("renewalRequirements" in patch) data.renewalRequirements = patch.renewalRequirements;
  if ("status" in patch)              data.status = patch.status;
  if ("notes" in patch)               data.notes = patch.notes;

  const row = await licenseDb().update({ where: { id }, data });
  return toLicense(row);
}

export async function deleteLicense(id: string): Promise<void> {
  await requireAdmin();
  await licenseDb().delete({ where: { id } });
}
