import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth/server";
import { ORG_CHART_ENABLED } from "@/lib/feature-flags";
import {
  getOrCreateDefaultVersion,
  getOrgPositions,
  getOrgDepartments,
  getOrgLocations,
  getOrgChartStats,
} from "@/modules/org-chart/lib/queries";
import { OrgChartDashboard } from "@/modules/org-chart/components/OrgChartDashboard";

export const metadata = { title: "Org Chart — Mason NEXT Portal" };

export default async function OrgChartPage() {
  if (!ORG_CHART_ENABLED) notFound();

  await requireSession();

  const version = await getOrCreateDefaultVersion();

  const [positions, departments, locations, stats] = await Promise.all([
    getOrgPositions(version.id),
    getOrgDepartments(),
    getOrgLocations(),
    getOrgChartStats(version.id),
  ]);

  return (
    <OrgChartDashboard
      currentVersion={version}
      positions={positions}
      departments={departments}
      locations={locations}
      stats={stats}
    />
  );
}
