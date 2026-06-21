"use client";

import { useEffect, useState } from "react";
import { createRelease, getReleases } from "@/lib/data/releases";
import { nextReleaseNumber } from "@/modules/bom-release/lib/release-numbering";
import type { Release } from "@/types/release";

export function useReleases(projectId: string) {
  const [loaded, setLoaded] = useState<{ projectId: string; releases: Release[] } | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let active = true;
    getReleases(projectId).then((releases) => {
      if (active) setLoaded({ projectId, releases });
    });
    return () => {
      active = false;
    };
  }, [projectId, reloadToken]);

  const isLoading = loaded === null || loaded.projectId !== projectId;
  const releases = isLoading ? [] : loaded.releases;

  async function createDraftRelease(): Promise<Release> {
    const now = new Date().toISOString();
    const release: Release = {
      id: crypto.randomUUID(),
      projectId,
      releaseNumber: nextReleaseNumber(releases),
      shippingType: "",
      shipTo: "",
      recipients: "",
      notes: "",
      generatedAt: "",
      generatedBy: "",
      rowIds: [],
      rowSnapshot: [],
      emailPlainText: "",
      emailHtml: "",
      emailSubject: "",
      updatedAt: now,
    };
    await createRelease(projectId, release);
    setReloadToken((token) => token + 1);
    return release;
  }

  return {
    releases,
    isLoading,
    createDraftRelease,
    refetch: () => setReloadToken((token) => token + 1),
  };
}
