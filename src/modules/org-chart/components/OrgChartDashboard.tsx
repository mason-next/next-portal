"use client";

import { useCallback, useState } from "react";
import { Plus, Network, List, Building2, MapPin, BarChart3, Award } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { DashboardCards } from "./DashboardCards";
import { OrgChartCanvas } from "./OrgChartCanvas";
import { PositionList } from "./PositionList";
import { PositionForm } from "./PositionForm";
import { DepartmentManager } from "./DepartmentManager";
import { LocationManager } from "./LocationManager";
import { VersionSelector } from "./VersionSelector";
import { ReportsPanel } from "./ReportsPanel";
import { CertificationManager } from "./CertificationManager";
import type {
  OrgChartVersion,
  OrgPosition,
  OrgDepartment,
  OrgLocation,
  OrgChartStats,
  OrgCertification,
  OrgUserCertification,
} from "../lib/types";

type Tab = "chart" | "positions" | "departments" | "locations" | "reports" | "certifications";

// Admin-only tabs are fully hidden from Members/Viewers — not just disabled.
const ADMIN_TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
  { key: "departments",    label: "Departments",    icon: <Building2 className="size-4" /> },
  { key: "locations",      label: "Locations",      icon: <MapPin    className="size-4" /> },
  { key: "certifications", label: "Certifications", icon: <Award     className="size-4" /> },
];

const ALL_TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
  { key: "chart",     label: "Org Chart",  icon: <Network   className="size-4" /> },
  { key: "positions", label: "Positions",  icon: <List      className="size-4" /> },
  { key: "reports",   label: "Reports",    icon: <BarChart3 className="size-4" /> },
  ...ADMIN_TABS,
];

interface OrgChartDashboardProps {
  currentVersion: OrgChartVersion;
  versions: OrgChartVersion[];
  positions: OrgPosition[];
  departments: OrgDepartment[];
  locations: OrgLocation[];
  stats: OrgChartStats;
  certifications: OrgCertification[];
  userCertifications: OrgUserCertification[];
  isAdmin: boolean;
}

export function OrgChartDashboard({
  currentVersion,
  versions,
  positions,
  departments,
  locations,
  stats,
  certifications,
  userCertifications,
  isAdmin,
}: OrgChartDashboardProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("chart");
  const [positionFormOpen, setPositionFormOpen] = useState(false);
  const [editingPosition, setEditingPosition] = useState<OrgPosition | null>(null);
  const [defaultReportsTo, setDefaultReportsTo] = useState<string | undefined>(undefined);

  const openAddPosition = useCallback((reportsToPositionId?: string) => {
    setDefaultReportsTo(reportsToPositionId);
    setEditingPosition(null);
    setPositionFormOpen(true);
  }, []);

  const openEditPosition = useCallback((p: OrgPosition) => {
    setDefaultReportsTo(undefined);
    setEditingPosition(p);
    setPositionFormOpen(true);
  }, []);

  function closePositionForm() {
    setPositionFormOpen(false);
    setEditingPosition(null);
    setDefaultReportsTo(undefined);
    router.refresh();
  }

  // Only show tabs the current user is allowed to see
  const visibleTabs = ALL_TABS.filter(
    (t) => !ADMIN_TABS.some((a) => a.key === t.key) || isAdmin,
  );

  // If current tab was hidden (user lost admin), fall back to chart
  const safeTab = visibleTabs.some((t) => t.key === activeTab) ? activeTab : "chart";

  return (
    <div className={cn(
      "px-4 py-8 sm:px-6 lg:px-8",
      safeTab === "chart" ? "mx-auto max-w-[1600px]" : "mx-auto max-w-7xl",
    )}>
      {/* Page header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Org Chart</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Position-based organizational structure
          </p>
        </div>
        <div className="flex items-center gap-2 flex-none">
          <VersionSelector currentVersion={currentVersion} versions={versions} />
          {isAdmin && (
            <Button onClick={() => openAddPosition()}>
              <Plus className="mr-1.5 size-4" />
              Add Position
            </Button>
          )}
        </div>
      </div>

      {/* Summary cards */}
      <div className="mb-6">
        <DashboardCards stats={stats} />
      </div>

      {/* Tab bar — admin-only tabs hidden for non-admins */}
      <div className="mb-4 flex gap-1 border-b overflow-x-auto">
        {visibleTabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap",
              safeTab === tab.key
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div>
        {safeTab === "chart" && (
          <div className="h-[calc(100vh-260px)] min-h-[520px]">
            <OrgChartCanvas
              positions={positions}
              departments={departments}
              onEdit={isAdmin ? openEditPosition : undefined}
              onAdd={isAdmin ? openAddPosition : undefined}
              isAdmin={isAdmin}
            />
          </div>
        )}

        {safeTab === "positions" && (
          <PositionList
            positions={positions}
            onAdd={isAdmin ? openAddPosition : undefined}
            onEdit={isAdmin ? openEditPosition : undefined}
            isAdmin={isAdmin}
          />
        )}

        {isAdmin && safeTab === "departments" && (
          <DepartmentManager departments={departments} />
        )}

        {isAdmin && safeTab === "locations" && (
          <LocationManager locations={locations} />
        )}

        {safeTab === "reports" && (
          <ReportsPanel
            positions={positions}
            departments={departments}
            locations={locations}
            isAdmin={isAdmin}
          />
        )}

        {isAdmin && safeTab === "certifications" && (
          <CertificationManager
            certifications={certifications}
            userCertifications={userCertifications}
            positions={positions}
          />
        )}
      </div>

      {/* Position create/edit modal — admin only */}
      {isAdmin && (
        <PositionForm
          key={editingPosition?.id ?? "new-position"}
          open={positionFormOpen}
          onClose={closePositionForm}
          versionId={currentVersion.id}
          departments={departments}
          locations={locations}
          positions={positions}
          certifications={certifications}
          editing={editingPosition}
          defaultReportsToPositionId={defaultReportsTo}
        />
      )}
    </div>
  );
}
