"use client";

import { use, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { getProject } from "@/lib/data/projects";
import { updateRelease } from "@/lib/data/releases";
import { useBomRows } from "@/modules/bom-release/hooks/useBomRows";
import { useBomImport } from "@/modules/bom-release/hooks/useBomImport";
import { useCostSummary } from "@/modules/bom-release/hooks/useCostSummary";
import { useReleases } from "@/modules/bom-release/hooks/useReleases";
import { useViewOptions } from "@/modules/bom-release/hooks/useViewOptions";
import { isDraftRelease } from "@/modules/bom-release/lib/release-numbering";
import { snapshotRow } from "@/modules/bom-release/lib/change-tracking";
import { applyRowFilters } from "@/modules/bom-release/lib/view-filters";
import { CURRENT_USER } from "@/lib/current-user";
import { CostSummaryCards } from "@/modules/bom-release/components/CostSummaryCards";
import { BomTable } from "@/modules/bom-release/components/BomTable";
import { BomBulkActionBar } from "@/modules/bom-release/components/BomBulkActionBar";
import { BomImportDropzone } from "@/modules/bom-release/components/BomImportDropzone";
import { ProjectImportModal } from "@/modules/bom-release/components/ProjectImportModal";
import { ReleaseModal, type ReleaseDetails } from "@/modules/bom-release/components/ReleaseModal";
import { EmailPreviewModal } from "@/modules/bom-release/components/EmailPreviewModal";
import { ViewOptionsModal } from "@/modules/bom-release/components/ViewOptionsModal";
import { buildEmailHtml, buildEmailPlainText, buildEmailSubject } from "@/modules/bom-release/lib/email-builder";
import type { Project } from "@/types/project";
import type { BomStatus } from "@/types/bom";

export default function BomReleasesPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = use(params);
  const router = useRouter();
  const { rows, snapshot, isLoading, updateField, bulkUpdateStatus, assignRelease, markRowsReleased, reorderRows, refetch } =
    useBomRows(projectId);
  const { releases, createDraftRelease, refetch: refetchReleases } = useReleases(projectId);
  const summary = useCostSummary(rows ?? []);
  const { pendingRows, isParsing, importFile, importSample, clearPending } = useBomImport();
  const { hiddenColumns, rowFilters, toggleColumn, setRowFilter, reset: resetViewOptions } = useViewOptions();
  const [project, setProject] = useState<Project | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showReleaseModal, setShowReleaseModal] = useState(false);
  const [showViewOptions, setShowViewOptions] = useState(false);
  const [emailPreview, setEmailPreview] = useState<{
    subject: string;
    recipients: string;
    html: string;
    plainText: string;
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
  const visibleRows = useMemo(() => applyRowFilters(rows ?? [], rowFilters), [rows, rowFilters]);

  useEffect(() => {
    getProject(projectId).then(setProject);
  }, [projectId]);

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

  function handleToggleAll(checked: boolean) {
    setSelected(checked ? new Set(rows?.map((row) => row.id)) : new Set());
  }

  // reorderRows() splices the full underlying row array by index, but DataTable reports
  // positions within whatever it's rendering — visibleRows, a filtered subset when row
  // filters are active. Map those positions back to real rows by id before reordering,
  // otherwise a drag while filtered would silently move the wrong rows.
  function handleRowsReorder(fromVisibleIndex: number, toVisibleIndex: number) {
    if (!rows) return;
    const fromId = visibleRows[fromVisibleIndex]?.id;
    const toId = visibleRows[toVisibleIndex]?.id;
    if (!fromId || !toId) return;
    const fromIndex = rows.findIndex((row) => row.id === fromId);
    const toIndex = rows.findIndex((row) => row.id === toId);
    if (fromIndex === -1 || toIndex === -1) return;
    reorderRows(fromIndex, toIndex);
  }

  function handleBulkSetStatus(status: BomStatus) {
    bulkUpdateStatus([...selected], status);
    setSelected(new Set());
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
      shippingType: details.shippingType,
      shipTo: details.shipTo,
      recipients: details.recipients,
      notes: details.notes,
      generatedAt: now,
      generatedBy: CURRENT_USER,
    };
    const emailSubject = buildEmailSubject(emailDetails);
    const emailPlainText = buildEmailPlainText(emailDetails, rowSnapshot);
    const emailHtml = buildEmailHtml(emailDetails, rowSnapshot);

    await updateRelease(projectId, releaseId, {
      ...details,
      rowIds: releasedRows.map((row) => row.id),
      rowSnapshot,
      generatedAt: now,
      generatedBy: CURRENT_USER,
      emailSubject,
      emailPlainText,
      emailHtml,
      updatedAt: now,
    });

    refetchReleases();
    setShowReleaseModal(false);
    setEmailPreview({ subject: emailSubject, recipients: details.recipients, html: emailHtml, plainText: emailPlainText });
  }

  if (isLoading) {
    return <div className="p-6 text-sm text-muted-foreground">Loading BOM…</div>;
  }

  const hasRows = !!rows && rows.length > 0;

  return (
    <div className="space-y-4">
      {hasRows ? (
        <>
          <div className="flex justify-end gap-2">
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
          <CostSummaryCards summary={summary} />
          <BomBulkActionBar
            selectedCount={selected.size}
            onClear={() => setSelected(new Set())}
            onSetStatus={handleBulkSetStatus}
          />
          <BomTable
            rows={visibleRows}
            snapshot={snapshot}
            draftReleases={draftReleases}
            selected={selected}
            hiddenColumns={hiddenColumns}
            onToggleRow={handleToggleRow}
            onToggleAll={handleToggleAll}
            onUpdateField={updateField}
            onAssignRelease={handleAssignRelease}
            onRowsReorder={handleRowsReorder}
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
          onClose={() => setEmailPreview(null)}
        />
      ) : null}

      {showViewOptions ? (
        <ViewOptionsModal
          hiddenColumns={hiddenColumns}
          rowFilters={rowFilters}
          onToggleColumn={toggleColumn}
          onSetRowFilter={setRowFilter}
          onReset={resetViewOptions}
          onClose={() => setShowViewOptions(false)}
        />
      ) : null}
    </div>
  );
}
