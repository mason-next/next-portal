import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth/server";
import { ORG_CHART_ENABLED } from "@/lib/feature-flags";
import {
  getOrCreateDefaultVersion,
  getOrgChartVersions,
  getOrgPositions,
  getOrgDepartments,
  getOrgLocations,
  getOrgChartStats,
  getOrgCertifications,
  getOrgUserCertifications,
} from "@/modules/org-chart/lib/queries";
import { OrgChartDashboard } from "@/modules/org-chart/components/OrgChartDashboard";

export const metadata = { title: "Org Chart — Mason NEXT Portal" };

interface PageProps {
  searchParams: { v?: string };
}

export default async function OrgChartPage({ searchParams }: PageProps) {
  if (!ORG_CHART_ENABLED) notFound();

  await requireSession();

  // Ensure at least the default "Current State" version exists, then fetch all.
  const defaultVersion = await getOrCreateDefaultVersion();
  const versions = await getOrgChartVersions();

  // Select which version to show — fall back to default if ?v= is missing or invalid.
  const requestedId = searchParams.v;
  const selectedVersion =
    requestedId ? (versions.find((v) => v.id === requestedId) ?? defaultVersion) : defaultVersion;

  const [positions, departments, locations, stats, certifications, userCertifications] =
    await Promise.all([
      getOrgPositions(selectedVersion.id),
      getOrgDepartments(),
      getOrgLocations(),
      getOrgChartStats(selectedVersion.id),
      getOrgCertifications(),
      getOrgUserCertifications(),
    ]);

  return (
    <OrgChartDashboard
      currentVersion={selectedVersion}
      versions={versions}
      positions={positions}
      departments={departments}
      locations={locations}
      stats={stats}
      certifications={certifications}
      userCertifications={userCertifications}
    />
  );
}
