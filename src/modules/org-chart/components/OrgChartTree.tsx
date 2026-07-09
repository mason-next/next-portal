"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, User, MapPin, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { StatusBadge } from "@/components/shared/StatusBadge";
import type { OrgPosition } from "../lib/types";

function positionStatusBadge(status: string) {
  switch (status) {
    case "filled":   return <StatusBadge label="Filled"   tone="success" />;
    case "open":     return <StatusBadge label="Open"     tone="warning" />;
    case "planned":  return <StatusBadge label="Planned"  tone="info"    />;
    case "inactive": return <StatusBadge label="Inactive" tone="neutral" />;
    default:         return <StatusBadge label={status}   tone="neutral" />;
  }
}

// ─── Single tree node ─────────────────────────────────────────────────────────

function OrgTreeNode({
  position,
  allPositions,
  depth,
  onEdit,
}: {
  position: OrgPosition;
  allPositions: OrgPosition[];
  depth: number;
  onEdit?: (p: OrgPosition) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const children = allPositions.filter((p) => p.reportsToPositionId === position.id);
  const primaryAssignment = position.assignments.find(
    (a) => a.isActive && a.assignmentType === "primary"
  );

  return (
    <div>
      <div
        className={cn(
          "group relative flex items-start gap-3 rounded-lg border bg-card p-3 shadow-sm cursor-pointer hover:border-primary/40 transition-colors",
          depth === 0 && "border-primary/20 bg-primary/[0.02]"
        )}
        onClick={() => onEdit?.(position)}
      >
        {/* Expand/collapse toggle — only visible when there are children */}
        {children.length > 0 ? (
          <button
            type="button"
            className="mt-0.5 flex-none text-muted-foreground hover:text-foreground"
            onClick={(e) => {
              e.stopPropagation();
              setExpanded((v) => !v);
            }}
          >
            {expanded ? (
              <ChevronDown className="size-4" />
            ) : (
              <ChevronRight className="size-4" />
            )}
          </button>
        ) : (
          <div className="mt-0.5 size-4 flex-none" />
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-semibold truncate">{position.title}</span>
            {positionStatusBadge(position.status)}
          </div>

          <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1">
            {primaryAssignment?.user ? (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <User className="size-3 flex-none" />
                {primaryAssignment.user.name}
              </span>
            ) : (
              <span className="flex items-center gap-1 text-xs text-muted-foreground/60 italic">
                <User className="size-3 flex-none" />
                Vacant
              </span>
            )}

            {position.department && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Building2 className="size-3 flex-none" />
                {position.department.name}
              </span>
            )}

            {position.location && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="size-3 flex-none" />
                {position.location.name}
              </span>
            )}
          </div>

          {children.length > 0 && (
            <div className="mt-1 text-xs text-muted-foreground">
              {children.length} direct report{children.length !== 1 ? "s" : ""}
            </div>
          )}
        </div>
      </div>

      {/* Children with left-border indentation */}
      {expanded && children.length > 0 && (
        <div className="ml-5 mt-1 space-y-1 border-l-2 border-border pl-4">
          {children.map((child) => (
            <OrgTreeNode
              key={child.id}
              position={child}
              allPositions={allPositions}
              depth={depth + 1}
              onEdit={onEdit}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Full tree ────────────────────────────────────────────────────────────────

export function OrgChartTree({
  positions,
  onEdit,
}: {
  positions: OrgPosition[];
  onEdit?: (p: OrgPosition) => void;
}) {
  const roots = positions.filter((p) => !p.reportsToPositionId);

  if (positions.length === 0) {
    return (
      <div className="flex min-h-[200px] items-center justify-center rounded-xl border bg-card text-sm text-muted-foreground">
        No positions yet. Add a position to build your org chart.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {roots.map((root) => (
        <OrgTreeNode
          key={root.id}
          position={root}
          allPositions={positions}
          depth={0}
          onEdit={onEdit}
        />
      ))}
      {/* Orphans: positions whose parent no longer exists */}
      {positions
        .filter(
          (p) =>
            p.reportsToPositionId &&
            !positions.find((q) => q.id === p.reportsToPositionId)
        )
        .map((p) => (
          <OrgTreeNode
            key={p.id}
            position={p}
            allPositions={positions}
            depth={0}
            onEdit={onEdit}
          />
        ))}
    </div>
  );
}
