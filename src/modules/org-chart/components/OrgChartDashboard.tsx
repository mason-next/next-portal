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

const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
  { key: "chart",           label: "Org Chart",       icon: <Network   className="size-4" /> },
  { key: "positions",       label: "Positions",       icon: <List      className="size-4" /> },
  { key: "departments",     label: "Departments",     icon: <Building2 className="size-4" /> },
  { key: "locations",       label: "Locations",       icon: <MapPin    className="size-4" /> },
  { key: "reports",         label: "Reports",         icon: <BarChart3 className="size-4" /> },
  { key: "certifications",  label: "Certifications",  icon: <Award     className="size-4" /> },
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
}: OrgChartDashboardProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("chart");
  const [positionFormOpen, setPositionFormOpen] = useState(false);
  const [editingPosition, setEditingPosition] = useState<OrgPosition | null>(null);

  const openAddPosition = useCallback(() => {
    setEditingPosition(null);
    setPositionFormOpen(true);
  }, []);

  const openEditPosition = useCallback((p: OrgPosition) => {
    setEditingPosition(p);
    setPositionFormOpen(true);
  }, []);

  function closePositionForm() {
    setPositionFormOpen(false);
    setEditingPosition(null);
    router.refresh();
  }

  return (
    <div className={cn(
      "px-4 py-8 sm:px-6 lg:px-8",
      activeTab === "chart" ? "mx-auto max-w-[1600px]" : "mx-auto max-w-7xl",
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
          <Button onClick={openAddPosition}>
            <Plus className="mr-1.5 size-4" />
            Add Position
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="mb-6">
        <DashboardCards stats={stats} />
      </div>

      {/* Tab bar */}
      <div className="mb-4 flex gap-1 border-b overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap",
              activeTab === tab.key
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div>
        {activeTab === "chart" && (
          <div className="h-[calc(100vh-260px)] min-h-[520px]">
            <OrgChartCanvas
              positions={positions}
              departments={departments}
              onEdit={openEditPosition}
            />
          </div>
        )}

        {activeTab === "positions" && (
          <PositionList
            positions={positions}
            onAdd={openAddPosition}
            onEdit={openEditPosition}
          />
        )}

        {activeTab === "departments" && (
          <DepartmentManager departments={departments} />
        )}

        {activeTab === "locations" && (
          <LocationManager locations={locations} />
        )}

        {activeTab === "reports" && (
          <ReportsPanel
            positions={positions}
            departments={departments}
            locations={locations}
          />
        )}

        {activeTab === "certifications" && (
          <CertificationManager
            certifications={certifications}
            userCertifications={userCertifications}
            positions={positions}
          />
        )}
      </div>

      {/* Position create/edit modal */}
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
      />
    </div>
  );
}
