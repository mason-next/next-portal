"use client";

// Runs a ConnectWise CSV import (one-way, CW → portal) row by row with progress.
// Shared by every page that offers "Import from ConnectWise".

import { syncCwOpportunity } from "@/lib/data/cw-sync";
import type { SalesCompany } from "@/types/sales";
import type {
  CWImportPayload, ImportProgressCallback, CWImportResult,
} from "@/modules/sales-activity/components/CWImportModal";

export async function runCwImport(
  { companyMappings, selectedOpps }: CWImportPayload,
  onProgress: ImportProgressCallback,
  opts: {
    isManager: boolean;
    userName: string;
    saveCompany: (c: Omit<SalesCompany, "id" | "createdAt" | "updatedAt" | "opportunities">) => Promise<SalesCompany>;
  },
): Promise<CWImportResult> {
  const result: CWImportResult = { created: 0, updated: 0, linked: 0, unchanged: 0, skipped: 0 };

  // Reps only bring in their own deals; rows the CSV assigns to another rep are skipped.
  const rows = opts.isManager
    ? selectedOpps
    : selectedOpps.filter((o) => !o.resolvedOwnerName || o.resolvedOwnerName === opts.userName || !o.resolvedOwnerId);
  result.skipped += selectedOpps.length - rows.length;
  const needed = new Set(rows.map((o) => o.resolvedCsvName));
  const total = rows.length;

  const companyIdMap = new Map<string, string>();
  for (const m of companyMappings) {
    if (!needed.has(m.csvName)) continue;
    if (m.matchedId) {
      companyIdMap.set(m.csvName, m.matchedId);
    } else {
      onProgress(0, total, `Creating company: ${m.csvName}`);
      const c = await opts.saveCompany({ name: m.csvName, domain: "", notes: "", dealDeskId: null });
      companyIdMap.set(m.csvName, c.id);
    }
  }

  let done = 0;
  for (const o of rows) {
    onProgress(done, total, `Syncing: ${o.name}`);
    const companyId = companyIdMap.get(o.resolvedCsvName);
    if (!companyId) { result.skipped++; done++; continue; }
    try {
      const res = await syncCwOpportunity({
        cwNumber: o.cwNumber,
        companyId,
        name: o.name,
        stage: o.stage,
        ownerName: o.resolvedOwnerName,
        ownerId: o.resolvedOwnerId,
        value: Math.round(o.value * 100),
        closeDate: o.closeDate ?? null,
        proposalCreatedAt: o.proposalCreatedAt ?? null,
        rating: o.rating ?? null,
        linkToId: o.linkToId ?? null,
      });
      result[res.outcome]++;
    } catch {
      result.skipped++;
    }
    done++;
    onProgress(done, total, `Synced: ${o.name}`);
  }
  return result;
}
