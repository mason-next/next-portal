"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import { buildReleasePdf, releasePdfFilename, releaseToPdfDetails } from "@/modules/bom-release/lib/release-pdf";
import type { Release } from "@/types/release";

interface ReleaseHistoryProps {
  // Only finalized (generated) releases should be passed in.
  releases: Release[];
  project: { name: string; projectNumber: string; siteAddress: string };
}

// Lists past (finalized) releases and lets anyone re-download the Release PDF. Re-export
// rebuilds the PDF from the release's frozen rowSnapshot — it never touches live BOM data
// and never creates a new release, so the document always reflects what was released then.
export function ReleaseHistory({ releases, project }: ReleaseHistoryProps) {
  const [busyId, setBusyId] = useState<string | null>(null);

  if (releases.length === 0) return null;

  // Newest first for the history list.
  const ordered = [...releases].sort((a, b) => (a.generatedAt < b.generatedAt ? 1 : -1));

  async function downloadPdf(release: Release) {
    setBusyId(release.id);
    try {
      const details = releaseToPdfDetails(release, project);
      const pdf = await buildReleasePdf(details, release.rowSnapshot);
      pdf.save(releasePdfFilename(details));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="rounded-lg border">
      <header className="border-b px-4 py-3">
        <h2 className="text-sm font-semibold">Release History</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Re-download the PDF for any past release. Each PDF is rebuilt from the snapshot
          frozen when the release was generated, so it always reflects what was released at
          that time — later BOM edits never change it.
        </p>
      </header>
      <ul className="divide-y">
        {ordered.map((release) => {
          const itemCount = release.rowSnapshot.length;
          return (
            <li key={release.id} className="flex items-center justify-between gap-4 px-4 py-3">
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">{release.releaseNumber}</div>
                <div className="truncate text-xs text-muted-foreground">
                  {itemCount} item{itemCount === 1 ? "" : "s"}
                  {" · Generated "}
                  {formatDate(release.generatedAt)}
                  {release.generatedBy ? ` by ${release.generatedBy}` : ""}
                </div>
              </div>
              <Button
                variant="outline"
                onClick={() => downloadPdf(release)}
                disabled={busyId === release.id}
              >
                {busyId === release.id ? "Preparing…" : "Download PDF"}
              </Button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
