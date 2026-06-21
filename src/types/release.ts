import type { BomRowSnapshot } from "./bom";

export interface Release {
  id: string;
  projectId: string;
  releaseNumber: string; // e.g. "Release 1"
  shippingType: string;
  shipTo: string;
  recipients: string;
  notes: string;
  generatedAt: string;
  generatedBy: string;
  rowIds: string[]; // BomRow.id values included in this release
  // Frozen copy of the included rows at generation time. Past-release views render from
  // this snapshot (and emailHtml), never from a live join against current BomRows, so
  // later edits to those rows don't retroactively change what a past release shows.
  rowSnapshot: BomRowSnapshot[];
  emailPlainText: string;
  emailHtml: string;
  emailSubject: string;
  updatedAt: string; // ISO 8601
}
