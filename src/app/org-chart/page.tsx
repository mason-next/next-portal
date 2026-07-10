import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth/server";
import { ORG_CHART_ENABLED } from "@/lib/feature-flags";
import { canManageOrgChart } from "@/modules/org-chart/lib/permissions";
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
import { getOrgChartFormSections } from "@/modules/org-chart/lib/form-settings";
import { OrgChartDashboard } from "@/modules/org-chart/components/OrgChartDashboard";

export const metadata = { title: "Org Chart — Mason NEXT Portal" };

interface PageProps {
  searchParams: { v?: string };
}

export default async function OrgChartPage({ searchParams }: PageProps) {
  if (!ORG_CHART_ENABLED) notFound();

  const session = await requireSession();
  const isAdmin = canManageOrgChart(session.roleTypes);

  // Ensure at least the default "Current State" version exists, then fetch all.
  const defaultVersion = await getOrCreateDefaultVersion();
  const versions = await getOrgChartVersions();

  // Select which version to show — fall back to default if ?v= is missing or invalid.
  const requestedId = searchParams.v;
  const selectedVersion =
    requestedId ? (versions.find((v) => v.id === requestedId) ?? defaultVersion) : defaultVersion;

  const [positions, departments, locations, stats, certifications, userCertifications, formSections] =
    await Promise.all([
      getOrgPositions(selectedVersion.id, isAdmin),
      getOrgDepartments(),
      getOrgLocations(),
      getOrgChartStats(selectedVersion.id),
      isAdmin ? getOrgCertifications() : Promise.resolve([]),
      isAdmin ? getOrgUserCertifications() : Promise.resolve([]),
      getOrgChartFormSections(),
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
      isAdmin={isAdmin}
      formSections={formSections}
    />
  );
}
