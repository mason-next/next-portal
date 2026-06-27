"use client";

import { useEffect, useState } from "react";
import { appendEquipmentUploadRecord, getEquipmentUploadHistory } from "@/lib/data/equipment";
import { useSession } from "@/lib/auth/client";
import type { EquipmentSource, EquipmentUploadRecord } from "@/types/equipment";

export function useUploadHistory(projectId: string) {
  const { name: currentUserName } = useSession();
  const [history, setHistory] = useState<EquipmentUploadRecord[] | null>(null);

  useEffect(() => {
    let active = true;
    getEquipmentUploadHistory(projectId).then((records) => {
      if (active) setHistory(records);
    });
    return () => {
      active = false;
    };
  }, [projectId]);

  async function recordUpload(input: {
    fileName: string;
    rowCount: number;
    newCount: number;
    updatedCount: number;
    removedCount: number;
    source: EquipmentSource;
  }) {
    const record: EquipmentUploadRecord = {
      id: crypto.randomUUID(),
      uploadedBy: currentUserName,
      uploadedAt: new Date().toISOString(),
      ...input,
    };
    await appendEquipmentUploadRecord(projectId, record);
    setHistory((prev) => [record, ...(prev ?? [])]);
  }

  return { history: history ?? [], recordUpload };
}
