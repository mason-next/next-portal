"use client";

import { use, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { useEquipmentRowsContext } from "@/modules/equipment-tracking/hooks/EquipmentRowsContext";
import { useEquipmentImport } from "@/modules/equipment-tracking/hooks/useEquipmentImport";
import { useUploadHistory } from "@/modules/equipment-tracking/hooks/useUploadHistory";
import { useProjectContext } from "@/modules/project-command-center/hooks/ProjectContext";
import { computeEquipmentSummary } from "@/modules/equipment-tracking/lib/equipment-summary";
import {
  applyColumnFilters,
  applyQuickFilter,
  applySearch,
  type QuickFilter,
} from "@/modules/equipment-tracking/lib/view-filters";
import { EquipmentImportDropzone } from "@/modules/equipment-tracking/components/EquipmentImportDropzone";
import { EquipmentImportModal } from "@/modules/equipment-tracking/components/EquipmentImportModal";
import { UploadHistoryModal } from "@/modules/equipment-tracking/components/UploadHistoryModal";
import { EquipmentSearchBar } from "@/modules/equipment-tracking/components/EquipmentSearchBar";
import { EquipmentSummaryCards } from "@/modules/equipment-tracking/components/EquipmentSummaryCards";
import { EquipmentTable } from "@/modules/equipment-tracking/components/EquipmentTable";

export default function EquipmentTrackingPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = use(params);
  const router = useRouter();
  const { rows, snapshot, isLoading, updateField, refetch } = useEquipmentRowsContext();
  const { pendingRows, pendingFileName, isParsing, importFile, importSample, clearPending } = useEquipmentImport();
  const { history, recordUpload } = useUploadHistory(projectId);
  const { project } = useProjectContext();

  const [search, setSearch] = useState("");
  const [quickFilter, setQuickFilter] = useState<QuickFilter>("all");
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});
  const [showUploadHistory, setShowUploadHistory] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function setColumnFilter(key: string, value: string) {
    setColumnFilters((prev) => ({ ...prev, [key]: value }));
  }

  const summary = useMemo(() => computeEquipmentSummary(rows ?? []), [rows]);

  const visibleRows = useMemo(
    () => applyColumnFilters(applySearch(applyQuickFilter(rows ?? [], quickFilter), search), columnFilters),
    [rows, quickFilter, search, columnFilters]
  );

  function handleImported(result: { rowCount: number; newCount: number; updatedCount: number; removedCount: number }) {
    recordUpload({
      fileName: pendingFileName ?? "Equipment List.csv",
      rowCount: result.rowCount,
      newCount: result.newCount,
      updatedCount: result.updatedCount,
      removedCount: result.removedCount,
      source: "csv",
    });
    clearPending();
    refetch();
    router.refresh();
  }

  if (isLoading) {
    return <div className="p-6 text-sm text-muted-foreground">Loading equipment list…</div>;
  }

  const hasRows = !!rows && rows.length > 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <Link
          href={`/projects/${projectId}/procurement`}
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
        >
          ← Back to Procurement
        </Link>
        {hasRows ? (
          <StatusBadge
            label={`Ready for Installation: ${summary.readyForInstallationPercent}%`}
            tone={summary.readyForInstallationPercent === 100 ? "success" : "neutral"}
          />
        ) : null}
      </div>

      {hasRows ? (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <EquipmentSearchBar value={search} onChange={setSearch} />
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
              <Button variant="outline" onClick={() => setShowUploadHistory(true)}>
                Upload History
              </Button>
            </div>
          </div>

          <EquipmentSummaryCards summary={summary} activeFilter={quickFilter} onSelectFilter={setQuickFilter} />
          <EquipmentTable
            rows={visibleRows}
            snapshot={snapshot}
            columnFilters={columnFilters}
            onColumnFilterChange={setColumnFilter}
            onUpdateField={updateField}
          />
        </>
      ) : (
        <EquipmentImportDropzone onFileSelected={importFile} onUseSample={importSample} isParsing={isParsing} />
      )}

      {pendingRows && project ? (
        <EquipmentImportModal
          project={project}
          existingRows={rows ?? []}
          pendingRows={pendingRows}
          fileName={pendingFileName ?? "Equipment List.csv"}
          onClose={clearPending}
          onImported={handleImported}
        />
      ) : null}

      {showUploadHistory ? <UploadHistoryModal history={history} onClose={() => setShowUploadHistory(false)} /> : null}
    </div>
  );
}
