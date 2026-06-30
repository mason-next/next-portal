"use client";

import { use, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { updateRelease } from "@/lib/data/releases";
import { useBomRowsContext } from "@/modules/bom-release/hooks/BomRowsContext";
import { useProjectContext } from "@/modules/project-command-center/hooks/ProjectContext";
import { useBomImport } from "@/modules/bom-release/hooks/useBomImport";
import { useCostSummary } from "@/modules/bom-release/hooks/useCostSummary";
import { useReleases } from "@/modules/bom-release/hooks/useReleases";
import { useViewOptions } from "@/modules/bom-release/hooks/useViewOptions";
import { isDraftRelease, latestDraftRelease } from "@/modules/bom-release/lib/release-numbering";
import { snapshotRow } from "@/modules/bom-release/lib/change-tracking";
import {
  applyColumnFilters,
  applyQuickFilter,
  applyRowFilters,
  type QuickFilter,
} from "@/modules/bom-release/lib/view-filters";
import { useSession } from "@/lib/auth/client";
import { CostSummaryCards } from "@/modules/bom-release/components/CostSummaryCards";
import { bomCompletionPercent, procurementProgressPercent } from "@/modules/bom-release/lib/bom-progress";
import { QuickFilterTabs } from "@/modules/bom-release/components/QuickFilterTabs";
import { BomTable } from "@/modules/bom-release/components/BomTable";
import { BomBulkActionBar } from "@/modules/bom-release/components/BomBulkActionBar";
import { BomImportDropzone } from "@/modules/bom-release/components/BomImportDropzone";
import { ProjectImportModal } from "@/modules/bom-release/components/ProjectImportModal";
import { ReleaseModal, type ReleaseDetails } from "@/modules/bom-release/components/ReleaseModal";
import { EmailPreviewModal } from "@/modules/bom-release/components/EmailPreviewModal";
import { ViewOptionsModal } from "@/modules/bom-release/components/ViewOptionsModal";
import { buildEmailHtml, buildEmailPlainText, buildEmailSubject } from "@/modules/bom-release/lib/email-builder";
import { buildReleasePdf, releasePdfFilename } from "@/modules/bom-release/lib/release-pdf";
import type { BomStatus } from "@/types/bom";
import type { jsPDF } from "jspdf";

export default function BomReviewPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = use(params);
  const { name: currentUserName } = useSession();
  const router = useRouter();
  const {
    rows,
    snapshot,
    isLoading,
    updateField,
    bulkUpdateStatus,
    assignRelease,
    bulkAssignRelease,
    markRowsReleased,
    addRow,
    deleteRows,
    reorderRows,
    refetch,
  } = useBomRowsContext();
  const { releases, createDraftRelease, refetch: refetchReleases } = useReleases(projectId);
  const summary = useCostSummary(rows ?? []);
  const { pendingRows, isParsing, importFile, importSample, clearPending } = useBomImport();
  const {
    hiddenColumns,
    columnOrder,
    rowFilters,
    columnFilters,
    toggleColumn,
    moveColumn,
    setRowFilter,
    setColumnFilter,
    reset: resetViewOptions,
  } = useViewOptions();
  const { project } = useProjectContext();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [quickFilter, setQuickFilter] = useState<QuickFilter>("all");
  const [showReleaseModal, setShowReleaseModal] = useState(false);
  const [showViewOptions, setShowViewOptions] = useState(false);
  const [emailPreview, setEmailPreview] = useState<{
    subject: string;
    recipients: string;
    html: string;
    plainText: string;
    pdf: jsPDF;
    pdfFilename: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const draftReleases = useMemo(() => releases.filter(isDraftRelease), [releases]);
  const releasableDraftReleases = useMemo(() => {
    const approvedReleaseIds = new Set(
      (rows ?? []).filter((row) => row.status === "Approved" && row.releaseId).map((row) => row.releaseId)
    );
    return draftReleases.filter((release) => approvedReleaseIds.has(release.id));
  }, [draftReleases, rows]);

  // Display-only — cost summary always reflects the full row set, never the filtered view.
  const visibleRows = useMemo(
    () => applyColumnFilters(applyRowFilters(applyQuickFilter(rows ?? [], quickFilter), rowFilters), columnFilters),
    [rows, rowFilters, quickFilter, columnFilters]
  );

  function handleImported() {
    clearPending();
    refetch();
    router.refresh();
  }

  function handleToggleRow(rowId: string, checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(rowId);
      else next.delete(rowId);
      return next;
    });
  }

  function handleToggleRowRange(rowIds: string[], checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const rowId of rowIds) {
        if (checked) next.add(rowId);
        else next.delete(rowId);
      }
      return next;
    });
  }

  function handleToggleAll(checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) {
        for (const row of visibleRows) next.add(row.id);
      } else {
        for (const row of visibleRows) next.delete(row.id);
      }
      return next;
    });
  }

  // reorderRows() splices the full underlying row array by index, but DataTable only
  // knows row ids (it may be rendering a filtered and/or sorted view). Map ids back to
  // real indices in the canonical `rows` array before reordering.
  function handleRowsReorder(fromId: string, toId: string) {
    if (!rows) return;
    const fromIndex = rows.findIndex((row) => row.id === fromId);
    const toIndex = rows.findIndex((row) => row.id === toId);
    if (fromIndex === -1 || toIndex === -1) return;
    reorderRows(fromIndex, toIndex);
  }

  function handleBulkSetStatus(status: BomStatus) {
    bulkUpdateStatus([...selected], status);
  }

  async function handleBulkAddToLatestRelease() {
    const release = latestDraftRelease(releases) ?? (await createDraftRelease());
    bulkAssignRelease([...selected], release.id, release.releaseNumber);
    refetchReleases();
  }

  function handleDeleteRow(rowId: string) {
    deleteRows([rowId]);
    setSelected((prev) => {
      if (!prev.has(rowId)) return prev;
      const next = new Set(prev);
      next.delete(rowId);
      return next;
    });
  }

  function handleBulkDelete() {
    if (selected.size === 0) return;
    if (!window.confirm(`Delete ${selected.size} selected row${selected.size === 1 ? "" : "s"}? This cannot be undone.`)) {
      return;
    }
    const toDelete = [...selected];
    deleteRows(toDelete);
    setSelected((prev) => {
      const next = new Set(prev);
      for (const id of toDelete) next.delete(id);
      return next;
    });
  }

  async function handleAssignRelease(rowId: string, label: string) {
    if (label === "Unassigned") {
      assignRelease(rowId, null, null);
      return;
    }
    if (label === "+ New Release") {
      const release = await createDraftRelease();
      assignRelease(rowId, release.id, release.releaseNumber);
      return;
    }
    const release = draftReleases.find((r) => r.releaseNumber === label);
    if (release) assignRelease(rowId, release.id, release.releaseNumber);
  }

  async function handleGenerateRelease(releaseId: string, details: ReleaseDetails) {
    if (!rows || !project) return;
    const release = releases.find((r) => r.id === releaseId);
    if (!release) return;

    const approvedForRelease = rows.filter((row) => row.releaseId === releaseId && row.status === "Approved");
    if (approvedForRelease.length === 0) return;

    const updatedRows = markRowsReleased(approvedForRelease.map((row) => row.id), details.shippingType, details.shipTo);
    const releasedRows = updatedRows?.filter((row) => row.releaseId === releaseId && row.status === "Released") ?? [];
    const rowSnapshot = releasedRows.map(snapshotRow);

    const now = new Date().toISOString();
    const emailDetails = {
      releaseNumber: release.releaseNumber,
      projectName: project.name,
      projectNumber: project.projectNumber,
      siteAddress: project.siteAddress,
      shippingType: details.shippingType,
      shipTo: details.shipTo,
      recipients: details.recipients,
      notes: details.notes,
      generatedAt: now,
      generatedBy: currentUserName,
    };
    const emailSubject = buildEmailSubject(emailDetails);
    const emailPlainText = buildEmailPlainText(emailDetails, rowSnapshot);
    const emailHtml = buildEmailHtml(emailDetails, rowSnapshot);
    const pdf = buildReleasePdf(emailDetails, rowSnapshot);
    const pdfFilename = releasePdfFilename(emailDetails);

    await updateRelease(projectId, releaseId, {
      ...details,
      rowIds: releasedRows.map((row) => row.id),
      rowSnapshot,
      generatedAt: now,
      generatedBy: currentUserName,
      emailSubject,
      emailPlainText,
      emailHtml,
      updatedAt: now,
    });

    refetchReleases();
    setShowReleaseModal(false);
    setEmailPreview({
      subject: emailSubject,
      recipients: details.recipients,
      html: emailHtml,
      plainText: emailPlainText,
      pdf,
      pdfFilename,
    });
  }

  if (isLoading) {
    return <div className="p-6 text-sm text-muted-foreground">Loading BOM…</div>;
  }

  const hasRows = !!rows && rows.length > 0;

  return (
    <div className="space-y-4">
      <Link
        href={`/projects/${projectId}/engineering`}
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
      >
        ← Back to Engineering
      </Link>
      {hasRows ? (
        <>
          <div className="flex justify-between gap-2">
            <Button variant="outline" onClick={addRow}>
              + Add Row
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={isParsing}>
                {isParsing ? "Parsing…" : "Import / Merge CSV"}
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) importFile(file);
                  e.target.value = "";
                }}
              />
              <Button variant="outline" onClick={() => setShowViewOptions(true)}>
                View Options
              </Button>
              <Button onClick={() => setShowReleaseModal(true)}>Create Release</Button>
            </div>
          </div>
          <CostSummaryCards
            summary={summary}
            reviewedPercent={bomCompletionPercent(rows ?? [])}
            procurementPercent={procurementProgressPercent(rows ?? [])}
          />
          <QuickFilterTabs value={quickFilter} onChange={setQuickFilter} />
          <BomBulkActionBar
            selectedCount={selected.size}
            onClear={() => setSelected(new Set())}
            onSetStatus={handleBulkSetStatus}
            onAddToLatestRelease={handleBulkAddToLatestRelease}
            onDeleteSelected={handleBulkDelete}
          />
          <BomTable
            rows={visibleRows}
            snapshot={snapshot}
            draftReleases={draftReleases}
            selected={selected}
            hiddenColumns={hiddenColumns}
            columnOrder={columnOrder}
            columnFilters={columnFilters}
            onColumnFilterChange={setColumnFilter}
            onToggleRow={handleToggleRow}
            onToggleRowRange={handleToggleRowRange}
            onToggleAll={handleToggleAll}
            onUpdateField={updateField}
            onAssignRelease={handleAssignRelease}
            onRowsReorder={handleRowsReorder}
            onDeleteRow={handleDeleteRow}
          />
        </>
      ) : (
        <BomImportDropzone onFileSelected={importFile} onUseSample={importSample} isParsing={isParsing} />
      )}

      {pendingRows && project ? (
        <ProjectImportModal
          project={project}
          existingRows={rows ?? []}
          pendingRows={pendingRows}
          onClose={clearPending}
          onImported={handleImported}
        />
      ) : null}

      {showReleaseModal ? (
        <ReleaseModal
          releasableDraftReleases={releasableDraftReleases}
          onClose={() => setShowReleaseModal(false)}
          onGenerate={handleGenerateRelease}
        />
      ) : null}

      {emailPreview ? (
        <EmailPreviewModal
          subject={emailPreview.subject}
          recipients={emailPreview.recipients}
          html={emailPreview.html}
          plainText={emailPreview.plainText}
          pdf={emailPreview.pdf}
          pdfFilename={emailPreview.pdfFilename}
          onClose={() => setEmailPreview(null)}
        />
      ) : null}

      {showViewOptions ? (
        <ViewOptionsModal
          hiddenColumns={hiddenColumns}
          columnOrder={columnOrder}
          rowFilters={rowFilters}
          onToggleColumn={toggleColumn}
          onMoveColumn={moveColumn}
          onSetRowFilter={setRowFilter}
          onReset={resetViewOptions}
          onClose={() => setShowViewOptions(false)}
        />
      ) : null}
    </div>
  );
}
