"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, MapPin, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { UserAvatarImage } from "@/components/shared/AppShell/UserAvatarImage";
import type { OrgPosition } from "../lib/types";

const REL_BADGE: Record<string, { label: string; className: string }> = {
  dotted_line: { label: "Dotted",    className: "border-dashed border-violet-300 bg-violet-50 text-violet-700" },
  project:     { label: "Project",   className: "border-dashed border-amber-300 bg-amber-50 text-amber-700"   },
  mentorship:  { label: "Mentorship",className: "border-dashed border-teal-300 bg-teal-50 text-teal-700"     },
};

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
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <UserAvatarImage
                  name={primaryAssignment.user.name}
                  avatarUrl={primaryAssignment.user.avatarUrl ?? null}
                  size={20}
                />
                {primaryAssignment.user.name}
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground/60 italic">
                <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground/40">
                  <svg className="size-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
                </span>
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

          {position.relationships.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {position.relationships.map((rel) => {
                const badge = REL_BADGE[rel.relationshipType];
                return (
                  <span
                    key={rel.id}
                    title={rel.notes ?? undefined}
                    className={cn(
                      "inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-medium",
                      badge?.className ?? "border-dashed border-muted-foreground/40 text-muted-foreground"
                    )}
                  >
                    {badge?.label ?? rel.relationshipType} → {rel.toPositionTitle}
                  </span>
                );
              })}
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
