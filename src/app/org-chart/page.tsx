import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth/server";
import { ORG_CHART_ENABLED } from "@/lib/feature-flags";
import { getRolePermissions } from "@/lib/data/role-permissions";
import { canViewOrgChart, canManageOrgChart } from "@/modules/org-chart/lib/permissions";
import {
  getOrCreateDefaultVersion,
  getOrgChartVersions,
  getOrgPositions,
  getOrgDepartments,
  getOrgLocations,
  getOrgChartStats,
  getOrgCertifications,
  getOrgUserCertifications,
  getOrgPositionLayouts,
  getOrgDeptLayouts,
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
  const permConfig = await getRolePermissions();
  if (!canViewOrgChart(session.roleTypes, permConfig)) notFound();
  const isAdmin = canManageOrgChart(session.roleTypes, permConfig);

  // Ensure at least the default "Current State" version exists, then fetch all.
  const defaultVersion = await getOrCreateDefaultVersion();
  const versions = await getOrgChartVersions();

  // Select which version to show — fall back to default if ?v= is missing or invalid.
  const requestedId = searchParams.v;
  const selectedVersion =
    requestedId ? (versions.find((v) => v.id === requestedId) ?? defaultVersion) : defaultVersion;

  const [positions, departments, locations, stats, certifications, userCertifications, formSections, layouts, deptLayouts] =
    await Promise.all([
      getOrgPositions(selectedVersion.id, isAdmin),
      getOrgDepartments(),
      getOrgLocations(),
      getOrgChartStats(selectedVersion.id),
      isAdmin ? getOrgCertifications() : Promise.resolve([]),
      isAdmin ? getOrgUserCertifications() : Promise.resolve([]),
      getOrgChartFormSections(),
      isAdmin ? getOrgPositionLayouts(selectedVersion.id) : Promise.resolve([]),
      isAdmin ? getOrgDeptLayouts(selectedVersion.id) : Promise.resolve([]),
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
      layouts={layouts}
      deptLayouts={deptLayouts}
    />
  );
}
