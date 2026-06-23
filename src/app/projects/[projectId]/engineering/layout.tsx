"use client";

import { use } from "react";
import { BomRowsProvider } from "@/modules/bom-release/hooks/BomRowsContext";

export default function EngineeringLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = use(params);
  return <BomRowsProvider projectId={projectId}>{children}</BomRowsProvider>;
}
