"use client";

import { useState } from "react";
import { Plus, Network, List, Building2, MapPin } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { DashboardCards } from "./DashboardCards";
import { OrgChartTree } from "./OrgChartTree";
import { PositionList } from "./PositionList";
import { PositionForm } from "./PositionForm";
import { DepartmentManager } from "./DepartmentManager";
import { LocationManager } from "./LocationManager";
import { VersionSelector } from "./VersionSelector";
import type {
  OrgChartVersion,
  OrgPosition,
  OrgDepartment,
  OrgLocation,
  OrgChartStats,
} from "../lib/types";

type Tab = "chart" | "positions" | "departments" | "locations";

const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
  { key: "chart",       label: "Org Chart",   icon: <Network   className="size-4" /> },
  { key: "positions",   label: "Positions",   icon: <List      className="size-4" /> },
  { key: "departments", label: "Departments", icon: <Building2 className="size-4" /> },
  { key: "locations",   label: "Locations",   icon: <MapPin    className="size-4" /> },
];

interface OrgChartDashboardProps {
  currentVersion: OrgChartVersion;
  versions: OrgChartVersion[];
  positions: OrgPosition[];
  departments: OrgDepartment[];
  locations: OrgLocation[];
  stats: OrgChartStats;
}

export function OrgChartDashboard({
  currentVersion,
  versions,
  positions,
  departments,
  locations,
  stats,
}: OrgChartDashboardProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("chart");
  const [positionFormOpen, setPositionFormOpen] = useState(false);
  const [editingPosition, setEditingPosition] = useState<OrgPosition | null>(null);

  function openAddPosition() {
    setEditingPosition(null);
    setPositionFormOpen(true);
  }

  function openEditPosition(p: OrgPosition) {
    setEditingPosition(p);
    setPositionFormOpen(true);
  }

  function closePositionForm() {
    setPositionFormOpen(false);
    setEditingPosition(null);
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
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
      <div className="mb-4 flex gap-1 border-b">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors",
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
          <OrgChartTree positions={positions} onEdit={openEditPosition} />
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
      </div>

      {/* Position create/edit modal */}
      <PositionForm
        open={positionFormOpen}
        onClose={closePositionForm}
        versionId={currentVersion.id}
        departments={departments}
        locations={locations}
        positions={positions}
        editing={editingPosition}
      />
    </div>
  );
}
