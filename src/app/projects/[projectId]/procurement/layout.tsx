"use client";

import { use } from "react";
import { EquipmentRowsProvider } from "@/modules/equipment-tracking/hooks/EquipmentRowsContext";

export default function ProcurementLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = use(params);
  return <EquipmentRowsProvider projectId={projectId}>{children}</EquipmentRowsProvider>;
}
