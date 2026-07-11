"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";
import {
  Background,
  BackgroundVariant,
  Controls,
  Handle,
  NodeResizer,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useNodesState,
  useEdgesState,
  useReactFlow,
  type Edge,
  type Node,
  type NodeProps,
  type NodeMouseHandler,
  type OnNodeDrag,
  type OnResizeEnd,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { graphlib, layout as dagreLayout } from "@dagrejs/dagre";
import {
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Plus,
  Search,
  Network,
  GitBranch,
  Lock,
  Unlock,
  RotateCcw,
  AlignCenter,
  Layers,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  swapOrgPositionOrder,
  swapOrgDepartmentOrder,
  savePositionLayout,
  batchSavePositionLayouts,
  clearPositionLayouts,
  saveDeptLayout,
  clearDeptLayouts,
} from "../lib/actions";
import { cn } from "@/lib/utils";
import { UserAvatarImage } from "@/components/shared/AppShell/UserAvatarImage";
import type { OrgDepartment, OrgDeptLayout, OrgPosition, OrgPositionLayout } from "../lib/types";

// ─── Layout constants ─────────────────────────────────────────────────────────

const SNAP_GRID = 20;

const NODE_W = 215;
const NODE_H = 138;

// Department group overlay padding (auto mode)
const LABEL_H  = 60;
const PAD_H    = 44;
const PAD_B    = 44;
const GROUP_GAP = 32;

// Department group minimum dimensions (manual mode)
const DEPT_MIN_W = 200;
const DEPT_MIN_H = 120;

// Mind map layout gaps
const MM_X_GAP = 80;
const MM_Y_GAP = 24;

// ─── Dept layout state type ───────────────────────────────────────────────────

interface DeptLayoutState { x: number; y: number; w: number; h: number }

// ─── Dept group nudge pass (auto mode only) ───────────────────────────────────

function nudgeDeptGroups(groups: Node[]): Node[] {
  if (groups.length < 2) return groups;
  const result = groups.map((g) => ({ ...g, position: { ...g.position } }));

  for (let iter = 0; iter < 20; iter++) {
    result.sort((a, b) => a.position.x - b.position.x);
    let changed = false;
    for (let i = 0; i < result.length; i++) {
      for (let j = i + 1; j < result.length; j++) {
        const a = result[i];
        const b = result[j];
        const aw = (a.style?.width as number) ?? 0;
        const ah = (a.style?.height as number) ?? 0;
        const bh = (b.style?.height as number) ?? 0;
        const overlapX = a.position.x + aw + GROUP_GAP - b.position.x;
        const yOverlap = Math.min(a.position.y + ah, b.position.y + bh) - Math.max(a.position.y, b.position.y);
        if (overlapX > 0 && yOverlap > 0) {
          result[j] = { ...result[j], position: { ...result[j].position, x: result[j].position.x + overlapX } };
          changed = true;
        }
      }
    }
    if (!changed) break;
  }
  return result;
}

// ─── Department group builder ─────────────────────────────────────────────────

function buildDeptGroups(
  positionNodes: Node[],
  posById: Map<string, OrgPosition>,
  departments: OrgDepartment[],
  deptLayouts: Map<string, DeptLayoutState>,
  layoutMode: "auto" | "manual",
): Node[] {
  const buckets = new Map<string, Array<{ x: number; y: number }>>();
  for (const n of positionNodes) {
    const dept = posById.get(n.id)?.departmentId;
    if (!dept) continue;
    if (!buckets.has(dept)) buckets.set(dept, []);
    buckets.get(dept)!.push(n.position);
  }

  const rawGroups: Node[] = [];
  let groupIdx = 0;

  for (const dept of departments) {
    const pts = buckets.get(dept.id);
    if (!pts || pts.length === 0) continue;

    const saved = layoutMode === "manual" ? deptLayouts.get(dept.id) : undefined;

    let x: number, y: number, w: number, h: number;
    if (saved) {
      ({ x, y, w, h } = saved);
    } else {
      const minX = Math.min(...pts.map((p) => p.x));
      const minY = Math.min(...pts.map((p) => p.y));
      const maxX = Math.max(...pts.map((p) => p.x));
      const maxY = Math.max(...pts.map((p) => p.y));
      w = maxX - minX + NODE_W + PAD_H * 2;
      h = maxY - minY + NODE_H + LABEL_H + PAD_B;
      x = minX - PAD_H;
      y = minY - LABEL_H;
    }

    rawGroups.push({
      id:         `dg-${dept.id}`,
      type:       "deptGroup",
      position:   { x, y },
      style:      { width: w, height: h },
      data:       { label: dept.name, color: dept.color ?? "#6366f1", deptId: dept.id, deptIndex: groupIdx },
      zIndex:     -1,
      draggable:  layoutMode === "manual",
      selectable: layoutMode === "manual",
    });
    groupIdx++;
  }

  // Nudge overlapping groups only in auto mode (manual mode lets user position freely)
  const finalGroups = layoutMode === "auto" ? nudgeDeptGroups(rawGroups) : rawGroups;
  const total = finalGroups.length;
  return finalGroups.map((g) => ({
    ...g,
    data: { ...(g.data as Record<string, unknown>), deptTotal: total },
  }));
}

// ─── Top-down tree layout powered by dagre ───────────────────────────────────

function buildLayout(
  positions: OrgPosition[],
  collapsed: Set<string>,
): { positionNodes: Node[]; edges: Edge[] } {
  if (positions.length === 0) return { positionNodes: [], edges: [] };

  const posById     = new Map(positions.map((p) => [p.id, p]));
  const idSet       = new Set(positions.map((p) => p.id));
  const childrenOf  = new Map<string, string[]>(positions.map((p) => [p.id, []]));

  for (const p of positions) {
    if (p.reportsToPositionId && idSet.has(p.reportsToPositionId)) {
      childrenOf.get(p.reportsToPositionId)!.push(p.id);
    }
  }

  // Sort children by sortOrder so dagre respects the intended sibling order
  for (const kids of childrenOf.values()) {
    kids.sort((a, b) => {
      const pa = posById.get(a)!;
      const pb = posById.get(b)!;
      if (pa.sortOrder == null && pb.sortOrder == null) return pa.createdAt < pb.createdAt ? -1 : 1;
      if (pa.sortOrder == null) return 1;
      if (pb.sortOrder == null) return -1;
      return pa.sortOrder - pb.sortOrder;
    });
  }

  const roots = positions
    .filter((p) => !p.reportsToPositionId || !idSet.has(p.reportsToPositionId))
    .map((p) => p.id);

  // Mark which nodes are visible (not behind a collapsed ancestor)
  const visible = new Set<string>();
  function markVisible(id: string) {
    visible.add(id);
    if (!collapsed.has(id)) for (const k of childrenOf.get(id) ?? []) markVisible(k);
  }
  for (const r of roots) markVisible(r);

  // Build dagre graph — visible nodes only
  const g = new graphlib.Graph();
  g.setGraph({ rankdir: "TB", nodesep: 60, ranksep: 80, marginx: 20, marginy: 20 });
  g.setDefaultEdgeLabel(() => ({}));

  for (const id of visible) {
    g.setNode(id, { width: NODE_W, height: NODE_H });
  }

  // Add edges in sorted child order so dagre respects sibling ordering
  for (const [parentId, kids] of childrenOf) {
    if (!visible.has(parentId)) continue;
    for (const kid of kids) {
      if (visible.has(kid)) g.setEdge(parentId, kid);
    }
  }

  dagreLayout(g);

  const positionNodes: Node[] = [];
  const edges: Edge[] = [];

  for (const id of visible) {
    const { x, y } = g.node(id); // dagre gives center coords
    const pos  = posById.get(id)!;
    const kids = childrenOf.get(id) ?? [];

    positionNodes.push({
      id,
      type:       "orgPosition",
      position:   { x: x - NODE_W / 2, y: y - NODE_H / 2 }, // convert center → top-left
      data:       { positionId: id, childCount: kids.length, isCollapsed: collapsed.has(id) },
      style:      { overflow: "visible" },
      draggable:  false,
      selectable: false,
    });

    if (pos.reportsToPositionId && visible.has(pos.reportsToPositionId)) {
      edges.push({
        id:           `e:${pos.reportsToPositionId}→${id}`,
        source:       pos.reportsToPositionId,
        target:       id,
        sourceHandle: "src-bottom",
        targetHandle: "tgt-top",
        type:         "smoothstep",
        style:        { stroke: "#cbd5e1", strokeWidth: 1.5 },
      });
    }
  }

  return { positionNodes, edges };
}

// ─── Left-to-right mind map layout (custom DFS — dagre not ideal for horizontal trees) ──

function buildMindMapLayout(
  positions: OrgPosition[],
  collapsed: Set<string>,
): { positionNodes: Node[]; edges: Edge[] } {
  if (positions.length === 0) return { positionNodes: [], edges: [] };

  const idSet      = new Set(positions.map((p) => p.id));
  const childrenOf = new Map<string, string[]>(positions.map((p) => [p.id, []]));

  for (const p of positions) {
    if (p.reportsToPositionId && idSet.has(p.reportsToPositionId)) {
      childrenOf.get(p.reportsToPositionId)!.push(p.id);
    }
  }

  const roots = positions
    .filter((p) => !p.reportsToPositionId || !idSet.has(p.reportsToPositionId))
    .map((p) => p.id);

  const subtreeH = new Map<string, number>();
  function calcH(id: string): number {
    const kids = collapsed.has(id) ? [] : (childrenOf.get(id) ?? []);
    if (kids.length === 0) { subtreeH.set(id, NODE_H); return NODE_H; }
    const total = kids.reduce((s, k) => s + calcH(k) + MM_Y_GAP, -MM_Y_GAP);
    const h = Math.max(total, NODE_H);
    subtreeH.set(id, h);
    return h;
  }
  for (const r of roots) calcH(r);

  const xyMap = new Map<string, { x: number; y: number }>();
  function assign(id: string, x: number, centerY: number) {
    xyMap.set(id, { x, y: centerY - NODE_H / 2 });
    if (collapsed.has(id)) return;
    const kids = childrenOf.get(id) ?? [];
    if (kids.length === 0) return;
    const totalKidH = kids.reduce((s, k) => s + (subtreeH.get(k) ?? NODE_H) + MM_Y_GAP, -MM_Y_GAP);
    let curY = centerY - totalKidH / 2;
    for (const kid of kids) {
      const kh = subtreeH.get(kid) ?? NODE_H;
      assign(kid, x + NODE_W + MM_X_GAP, curY + kh / 2);
      curY += kh + MM_Y_GAP;
    }
  }
  let rootY = 0;
  for (const r of roots) {
    const rh = subtreeH.get(r) ?? NODE_H;
    assign(r, 0, rootY + rh / 2);
    rootY += rh + 60;
  }

  const visible = new Set<string>();
  function markVisible(id: string) {
    visible.add(id);
    if (!collapsed.has(id)) for (const k of childrenOf.get(id) ?? []) markVisible(k);
  }
  for (const r of roots) markVisible(r);

  const posById = new Map(positions.map((p) => [p.id, p]));
  const positionNodes: Node[] = [];
  const edges: Edge[] = [];

  for (const [id, xy] of xyMap) {
    if (!visible.has(id)) continue;
    const pos  = posById.get(id)!;
    const kids = childrenOf.get(id) ?? [];

    positionNodes.push({
      id,
      type:       "orgPosition",
      position:   xy,
      data:       { positionId: id, childCount: kids.length, isCollapsed: collapsed.has(id), mindmap: true },
      style:      { overflow: "visible" },
      draggable:  false,
      selectable: false,
    });

    if (pos.reportsToPositionId && visible.has(pos.reportsToPositionId)) {
      edges.push({
        id:           `e:${pos.reportsToPositionId}→${id}`,
        source:       pos.reportsToPositionId,
        target:       id,
        sourceHandle: "src-right",
        targetHandle: "tgt-left",
        type:         "smoothstep",
        style:        { stroke: "#cbd5e1", strokeWidth: 1.5 },
      });
    }
  }

  return { positionNodes, edges };
}

// ─── Context ──────────────────────────────────────────────────────────────────

const OrgCtx = createContext<{
  onEdit?:         (p: OrgPosition) => void;
  onAdd?:          (reportsToId: string) => void;
  onToggle:        (id: string) => void;
  onReorder?:      (id: string, dir: "left" | "right") => void;
  onDeptReorder?:  (deptId: string, dir: "left" | "right") => void;
  onDeptResize?:   (deptId: string, x: number, y: number, w: number, h: number) => void;
  positionsById:   Map<string, OrgPosition>;
  departmentsById: Map<string, OrgDepartment>;
  isAdmin:         boolean;
  viewMode:        "chart" | "mindmap";
  layoutMode:      "auto" | "manual";
}>({
  onToggle:        () => {},
  positionsById:   new Map(),
  departmentsById: new Map(),
  isAdmin:         false,
  viewMode:        "chart",
  layoutMode:      "auto",
});

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS: Record<string, { dot: string; label: string }> = {
  filled:   { dot: "bg-emerald-500", label: "Filled"   },
  open:     { dot: "bg-amber-400",   label: "Open"     },
  planned:  { dot: "bg-blue-400",    label: "Planned"  },
  inactive: { dot: "bg-slate-300",   label: "Inactive" },
};

// ─── Position card node ───────────────────────────────────────────────────────

type PositionNodeData = {
  positionId:  string;
  childCount:  number;
  isCollapsed: boolean;
  mindmap?:    boolean;
};

function PositionNode({ data, id }: NodeProps) {
  const { onEdit, onAdd, onToggle, onReorder, positionsById, departmentsById, isAdmin, viewMode, layoutMode } = useContext(OrgCtx);
  const d = data as unknown as PositionNodeData;
  const { positionId, childCount, isCollapsed } = d;

  const position = positionsById.get(positionId)!;
  if (!position) return null;

  const primary   = position.assignments.find((a) => a.isActive && a.assignmentType === "primary");
  const isVacant  = !primary?.user;
  const isPlanned = position.status === "planned";
  const st        = STATUS[position.status] ?? STATUS.inactive;

  const deptColor = position.departmentId
    ? (departmentsById.get(position.departmentId)?.color ?? "#6366f1")
    : "#e2e8f0";

  const displayName = primary?.user?.name
    ?? (isPlanned ? "— Planned —" : "— Vacant —");

  const isMindmap = viewMode === "mindmap";
  const isManual  = layoutMode === "manual";

  const siblings = useMemo(() => {
    if (!isAdmin || !onReorder || isManual) return [];
    const parentKey = position.reportsToPositionId ?? "__root__";
    return [...positionsById.values()]
      .filter((p) => (p.reportsToPositionId ?? "__root__") === parentKey)
      .sort((a, b) => {
        if (a.sortOrder == null && b.sortOrder == null) return a.createdAt < b.createdAt ? -1 : 1;
        if (a.sortOrder == null) return 1;
        if (b.sortOrder == null) return -1;
        return a.sortOrder - b.sortOrder;
      });
  }, [isAdmin, onReorder, isManual, position, positionsById]);

  const siblingIdx   = siblings.findIndex((p) => p.id === position.id);
  const canMoveLeft  = isAdmin && siblingIdx > 0;
  const canMoveRight = isAdmin && siblingIdx >= 0 && siblingIdx < siblings.length - 1;
  const showReorder  = isAdmin && !isManual && (canMoveLeft || canMoveRight);

  const isDraggable = isAdmin && isManual;

  return (
    <div
      className={cn(
        "relative",
        onEdit ? "cursor-pointer" : "cursor-default",
        isDraggable && "cursor-grab active:cursor-grabbing",
      )}
      style={{ width: NODE_W }}
      onClick={() => onEdit?.(position)}
    >
      {/* Sibling reorder arrows — hidden in manual mode (drag does the job) */}
      {showReorder && (
        <div className={cn(
          "absolute z-30 flex gap-1",
          isMindmap
            ? "-left-7 top-1/2 -translate-y-1/2 flex-col"
            : "-top-7 left-0 right-0 justify-center",
        )}>
          <button
            type="button"
            disabled={!canMoveLeft}
            onClick={(e) => { e.stopPropagation(); onReorder?.(position.id, "left"); }}
            className="flex h-5 w-5 items-center justify-center rounded border border-slate-200 bg-white shadow-sm text-slate-400 hover:text-slate-700 hover:border-slate-300 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
            title={isMindmap ? "Move up" : "Move left"}
          >
            {isMindmap ? <ChevronUp className="size-3" /> : <ChevronLeft className="size-3" />}
          </button>
          <button
            type="button"
            disabled={!canMoveRight}
            onClick={(e) => { e.stopPropagation(); onReorder?.(position.id, "right"); }}
            className="flex h-5 w-5 items-center justify-center rounded border border-slate-200 bg-white shadow-sm text-slate-400 hover:text-slate-700 hover:border-slate-300 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
            title={isMindmap ? "Move down" : "Move right"}
          >
            {isMindmap ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}
          </button>
        </div>
      )}

      {/* Card */}
      <div className={cn(
        "rounded-xl border shadow-sm transition-all hover:shadow-md",
        isVacant || isPlanned ? "bg-slate-50/90" : "bg-white",
        "border-slate-200",
        isDraggable && "hover:border-slate-300 hover:ring-1 hover:ring-primary/20",
      )}>
        {/* Department color accent bar */}
        <div
          className="h-1.5 w-full rounded-t-xl"
          style={{ backgroundColor: deptColor }}
        />

        {/* Avatar */}
        <div className="relative z-10 -mt-5 flex justify-center">
          <div className={cn("rounded-full ring-2 ring-white shadow-sm", (isVacant || isPlanned) && "opacity-50")}>
            <UserAvatarImage
              name={isVacant || isPlanned ? "?" : (primary?.user?.name ?? "?")}
              avatarUrl={isVacant ? null : (primary?.user?.avatarUrl ?? null)}
              size={40}
            />
          </div>
        </div>

        {/* Card body */}
        <div className="px-3 pb-3 pt-1 text-center">
          <p className={cn(
            "text-[13px] font-semibold leading-snug",
            isVacant || isPlanned ? "italic text-slate-400" : "text-slate-800",
          )}>
            {displayName}
          </p>

          <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-slate-500">
            {position.title}
          </p>

          {position.department && (
            <span
              className="mt-1.5 inline-block max-w-full truncate rounded-full px-2 py-0.5 text-[10px]"
              style={{ backgroundColor: `${deptColor}18`, color: deptColor }}
            >
              {position.department.name}
            </span>
          )}

          <div className="mt-2 flex items-center justify-center gap-1.5">
            <span className={cn("size-1.5 flex-none rounded-full", st.dot)} />
            <span className="text-[10px] text-slate-400">{st.label}</span>
            {isPlanned && position.targetHireDate && (
              <span className="ml-0.5 text-[10px] text-blue-400">
                ·&nbsp;{new Date(position.targetHireDate).toLocaleDateString("en-US", {
                  month: "short",
                  year:  "numeric",
                })}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Expand / collapse badge */}
      {childCount > 0 && (
        <button
          type="button"
          className={cn(
            "absolute z-20 flex items-center gap-0.5 rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-500 shadow-sm hover:bg-slate-50",
            isMindmap
              ? "right-0 top-1/2 translate-x-1/2 -translate-y-1/2"
              : "bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2",
          )}
          onClick={(e) => { e.stopPropagation(); onToggle(id); }}
        >
          {childCount}
          {isCollapsed
            ? (isMindmap ? <ChevronRight className="size-2.5" /> : <ChevronDown className="size-2.5" />)
            : (isMindmap ? <ChevronLeft  className="size-2.5" /> : <ChevronUp   className="size-2.5" />)
          }
        </button>
      )}

      {/* Admin: "+" add direct report */}
      {isAdmin && onAdd && (
        <button
          type="button"
          title="Add direct report"
          onClick={(e) => { e.stopPropagation(); onAdd(position.id); }}
          className={cn(
            "absolute z-30 flex size-6 items-center justify-center rounded-full border-2 border-white bg-emerald-500 shadow-md text-white hover:bg-emerald-600 transition-colors",
            isMindmap ? "-right-2 bottom-0" : "-bottom-2 -right-2",
          )}
        >
          <Plus className="size-3.5" />
        </button>
      )}

      {/* Connection handles */}
      <Handle id="tgt-top"    type="target" position={Position.Top}    style={{ opacity: 0, pointerEvents: "none" }} />
      <Handle id="src-bottom" type="source" position={Position.Bottom} style={{ opacity: 0, pointerEvents: "none" }} />
      <Handle id="tgt-left"  type="target" position={Position.Left}  style={{ opacity: 0, pointerEvents: "none" }} />
      <Handle id="src-right" type="source" position={Position.Right} style={{ opacity: 0, pointerEvents: "none" }} />
    </div>
  );
}

// ─── Department group container node ─────────────────────────────────────────

function DeptGroupNode({ data, selected }: NodeProps) {
  const { label, color, deptId, deptIndex, deptTotal } = data as {
    label: string; color: string; deptId: string; deptIndex: number; deptTotal: number;
  };
  const { onDeptReorder, onDeptResize, isAdmin, layoutMode } = useContext(OrgCtx);
  const c = color ?? "#6366f1";
  const isManual = layoutMode === "manual";
  const canMoveLeft  = isAdmin && deptIndex > 0;
  const canMoveRight = isAdmin && deptIndex < (deptTotal - 1);
  const showReorderControls = isAdmin && !isManual && (canMoveLeft || canMoveRight) && onDeptReorder;

  const handleResizeEnd: OnResizeEnd = useCallback(
    (_, { x, y, width, height }) => {
      onDeptResize?.(deptId, x, y, width, height);
    },
    [deptId, onDeptResize],
  );

  return (
    <div className="relative h-full w-full">
      {/* Resize handles — only visible when selected in manual mode */}
      {isAdmin && isManual && (
        <NodeResizer
          isVisible={selected === true}
          minWidth={DEPT_MIN_W}
          minHeight={DEPT_MIN_H}
          onResizeEnd={handleResizeEnd}
          lineStyle={{ borderColor: c, borderWidth: 1.5 }}
          handleStyle={{ backgroundColor: c, borderColor: "#fff", borderWidth: 1.5, width: 10, height: 10, borderRadius: 3 }}
        />
      )}

      <div
        className="h-full w-full rounded-2xl pointer-events-none"
        style={{ border: `1.5px solid ${c}35`, background: `${c}08` }}
      >
        <div
          className="m-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold"
          style={{ background: `${c}18`, color: c, border: `1px solid ${c}30` }}
        >
          <span className="size-2 flex-none rounded-full" style={{ background: c }} />
          {label}
          {isAdmin && isManual && (
            <span className="ml-1 text-[9px] opacity-50">drag · resize</span>
          )}
        </div>
      </div>

      {showReorderControls && (
        <div className="absolute top-2 right-2 z-10 flex gap-1">
          <button
            type="button"
            disabled={!canMoveLeft}
            onClick={() => onDeptReorder!(deptId, "left")}
            className="flex h-5 w-5 items-center justify-center rounded border border-slate-200 bg-white/90 shadow-sm text-slate-400 hover:text-slate-700 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
            title="Move department left"
            style={{ pointerEvents: "all" }}
          >
            <ChevronLeft className="size-3" />
          </button>
          <button
            type="button"
            disabled={!canMoveRight}
            onClick={() => onDeptReorder!(deptId, "right")}
            className="flex h-5 w-5 items-center justify-center rounded border border-slate-200 bg-white/90 shadow-sm text-slate-400 hover:text-slate-700 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
            title="Move department right"
            style={{ pointerEvents: "all" }}
          >
            <ChevronRight className="size-3" />
          </button>
        </div>
      )}
    </div>
  );
}

const NODE_TYPES = { orgPosition: PositionNode, deptGroup: DeptGroupNode };

// ─── Inner canvas ─────────────────────────────────────────────────────────────

function OrgChartInner({
  positions,
  departments,
  layouts,
  deptLayouts,
  versionId,
  onEdit,
  onAdd,
  isAdmin,
}: {
  positions:   OrgPosition[];
  departments: OrgDepartment[];
  layouts:     OrgPositionLayout[];
  deptLayouts: OrgDeptLayout[];
  versionId:   string;
  onEdit?:     (p: OrgPosition) => void;
  onAdd?:      (reportsToId: string) => void;
  isAdmin:     boolean;
}) {
  const { fitView } = useReactFlow();
  const router = useRouter();
  const [, startTransition] = useTransition();

  const [collapsed,          setCollapsed]          = useState<Set<string>>(new Set());
  const [search,             setSearch]             = useState("");
  const [deptFilter,         setDeptFilter]         = useState("");
  const [statusFilter,       setStatusFilter]       = useState("");
  const [viewMode,           setViewMode]           = useState<"chart" | "mindmap">("chart");
  const [layoutMode,         setLayoutMode]         = useState<"auto" | "manual">("auto");
  const [showDeptGroups,     setShowDeptGroups]     = useState(true);

  // In-session dragged positions — override saved DB positions
  const [sessionPositions,    setSessionPositions]    = useState<Map<string, { x: number; y: number }>>(new Map());
  // In-session dept box positions/sizes — override saved DB layouts
  const [sessionDeptLayouts,  setSessionDeptLayouts]  = useState<Map<string, DeptLayoutState>>(new Map());

  // Clear session state when switching back to auto
  useEffect(() => {
    if (layoutMode === "auto") {
      setSessionPositions(new Map());
      setSessionDeptLayouts(new Map());
    }
  }, [layoutMode]);

  const viewType = viewMode === "mindmap" ? "mind_map" : "org_chart";

  // Saved DB position layouts for current view type, keyed by positionId
  const layoutsById = useMemo(
    () => new Map(
      layouts
        .filter((l) => l.viewType === viewType)
        .map((l) => [l.positionId, l]),
    ),
    [layouts, viewType],
  );

  // Saved DB dept layouts merged with session overrides
  const combinedDeptLayouts = useMemo<Map<string, DeptLayoutState>>(() => {
    const map = new Map<string, DeptLayoutState>();
    for (const dl of deptLayouts.filter((l) => l.viewType === viewType)) {
      map.set(dl.deptId, { x: dl.layoutX, y: dl.layoutY, w: dl.layoutW, h: dl.layoutH });
    }
    for (const [deptId, state] of sessionDeptLayouts) map.set(deptId, state);
    return map;
  }, [deptLayouts, viewType, sessionDeptLayouts]);

  const hasManualLayouts = layoutsById.size > 0;

  const onToggle = useCallback((id: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const positionsById = useMemo(
    () => new Map(positions.map((p) => [p.id, p])),
    [positions],
  );

  const departmentsById = useMemo(
    () => new Map(departments.map((d) => [d.id, d])),
    [departments],
  );

  // Position sibling reorder (auto layout only)
  const onReorder = useCallback((id: string, dir: "left" | "right") => {
    if (layoutMode !== "auto") return;
    const pos = positionsById.get(id);
    if (!pos) return;
    const parentKey = pos.reportsToPositionId ?? "__root__";
    const sorted = [...positionsById.values()]
      .filter((p) => (p.reportsToPositionId ?? "__root__") === parentKey)
      .sort((a, b) => {
        if (a.sortOrder == null && b.sortOrder == null) return a.createdAt < b.createdAt ? -1 : 1;
        if (a.sortOrder == null) return 1;
        if (b.sortOrder == null) return -1;
        return a.sortOrder - b.sortOrder;
      });
    const idx = sorted.findIndex((p) => p.id === id);
    const targetIdx = dir === "left" ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= sorted.length) return;
    const other = sorted[targetIdx];
    const myOrder    = pos.sortOrder    ?? idx * 10;
    const otherOrder = other.sortOrder  ?? targetIdx * 10;
    startTransition(async () => {
      await swapOrgPositionOrder(id, myOrder, other.id, otherOrder);
      router.refresh();
    });
  }, [positionsById, router, startTransition, layoutMode]);

  // Department order reorder (auto layout only)
  const onDeptReorder = useCallback((deptId: string, dir: "left" | "right") => {
    if (layoutMode !== "auto") return;
    const sorted = [...departments].sort((a, b) => {
      if (a.sortOrder == null && b.sortOrder == null) return a.name.localeCompare(b.name);
      if (a.sortOrder == null) return 1;
      if (b.sortOrder == null) return -1;
      return a.sortOrder - b.sortOrder;
    });
    const idx = sorted.findIndex((d) => d.id === deptId);
    const targetIdx = dir === "left" ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= sorted.length) return;
    const other = sorted[targetIdx];
    const myOrder    = departments.find((d) => d.id === deptId)?.sortOrder ?? idx * 10;
    const otherOrder = other.sortOrder ?? targetIdx * 10;
    startTransition(async () => {
      await swapOrgDepartmentOrder(deptId, myOrder, other.id, otherOrder);
      router.refresh();
    });
  }, [departments, router, startTransition, layoutMode]);

  // Dept box resize end (manual mode only) — saves new position and size
  const onDeptResize = useCallback((deptId: string, x: number, y: number, w: number, h: number) => {
    if (!isAdmin || !versionId) return;
    setSessionDeptLayouts((prev) => new Map(prev).set(deptId, { x, y, w, h }));
    startTransition(async () => {
      await saveDeptLayout(deptId, versionId, viewType, x, y, w, h);
    });
  }, [isAdmin, versionId, viewType, startTransition]);

  // Compute auto layout (position nodes only, no dept groups)
  const { positionNodes: autoPositionNodes, edges } = useMemo(
    () => viewMode === "mindmap"
      ? buildMindMapLayout(positions, collapsed)
      : buildLayout(positions, collapsed),
    [positions, collapsed, viewMode],
  );

  // In manual mode: apply saved DB positions, then override with session drags
  const positionNodes = useMemo(() => {
    if (layoutMode === "auto") return autoPositionNodes;
    return autoPositionNodes.map((n) => {
      const session = sessionPositions.get(n.id);
      if (session) return { ...n, position: session, draggable: isAdmin };
      const saved = layoutsById.get(n.id);
      if (saved) return { ...n, position: { x: saved.layoutX, y: saved.layoutY }, draggable: isAdmin };
      return { ...n, draggable: isAdmin };
    });
  }, [autoPositionNodes, layoutMode, sessionPositions, layoutsById, isAdmin]);

  // Dept group bounding boxes — recomputed from current position nodes + saved layouts
  const deptGroupNodes = useMemo(
    () => buildDeptGroups(positionNodes, positionsById, departments, combinedDeptLayouts, layoutMode),
    [positionNodes, positionsById, departments, combinedDeptLayouts, layoutMode],
  );

  const ctx = useMemo(
    () => ({
      onEdit,
      onAdd,
      onToggle,
      onReorder:     isAdmin ? onReorder     : undefined,
      onDeptReorder: isAdmin ? onDeptReorder : undefined,
      onDeptResize:  isAdmin ? onDeptResize  : undefined,
      positionsById,
      departmentsById,
      isAdmin,
      viewMode,
      layoutMode,
    }),
    [onEdit, onAdd, onToggle, onReorder, onDeptReorder, onDeptResize, positionsById, departmentsById, isAdmin, viewMode, layoutMode],
  );

  const dimmedIds = useMemo<Set<string>>(() => {
    if (!search && !deptFilter && !statusFilter) return new Set();
    const q = search.toLowerCase();
    const matched = new Set(
      positions
        .filter((p) => {
          const ms = !q || p.title.toLowerCase().includes(q) || p.assignments.some((a) => a.user?.name.toLowerCase().includes(q));
          const md = !deptFilter   || p.departmentId === deptFilter;
          const mv = !statusFilter || p.status       === statusFilter;
          return ms && md && mv;
        })
        .map((p) => p.id),
    );
    const allNodeIds = new Set([...positionNodes.map((n) => n.id), ...deptGroupNodes.map((n) => n.id)]);
    return new Set([...allNodeIds].filter((id) => !id.startsWith("dg-") && !matched.has(id)));
  }, [positions, positionNodes, deptGroupNodes, search, deptFilter, statusFilter]);

  // All nodes with opacity applied; dept groups conditionally included
  const allNodes = useMemo(() => {
    const combined = [
      ...(showDeptGroups ? deptGroupNodes : []),
      ...positionNodes,
    ];
    if (dimmedIds.size === 0) return combined;
    return combined.map((n) => ({
      ...n,
      style: {
        ...n.style,
        opacity:    dimmedIds.has(n.id) ? 0.18 : 1,
        transition: "opacity 0.15s",
      },
    }));
  }, [deptGroupNodes, positionNodes, dimmedIds, showDeptGroups]);

  const [nodes, setNodes, onNodesChange] = useNodesState(allNodes);
  const [rfEdges, setEdges, onEdgesChange] = useEdgesState(edges);

  // Sync nodes from computed state.
  // In manual mode: preserve current React Flow positions and styles for all existing nodes.
  useEffect(() => {
    if (layoutMode === "manual") {
      setNodes((curr) => {
        const currPosMap  = new Map(curr.filter((n) => !n.id.startsWith("dg-")).map((n) => [n.id, n.position]));
        const currDeptMap = new Map(curr.filter((n) =>  n.id.startsWith("dg-")).map((n) => [n.id, { position: n.position, style: n.style }]));
        return allNodes.map((n) => {
          if (!n.id.startsWith("dg-")) {
            if (currPosMap.has(n.id)) return { ...n, position: currPosMap.get(n.id)! };
            return n;
          } else {
            if (currDeptMap.has(n.id)) {
              const saved = currDeptMap.get(n.id)!;
              return { ...n, position: saved.position, style: saved.style };
            }
            return n;
          }
        });
      });
    } else {
      setNodes(allNodes);
    }
  }, [allNodes, setNodes, layoutMode]);

  useEffect(() => { setEdges(edges); }, [edges, setEdges]);

  useEffect(() => {
    const t = setTimeout(() => fitView({ duration: 350, padding: 0.12 }), 60);
    return () => clearTimeout(t);
  }, [edges, fitView]);

  const parentIds = useMemo(
    () => new Set(positions.filter((p) => positions.some((q) => q.reportsToPositionId === p.id)).map((p) => p.id)),
    [positions],
  );

  function expandAll()   { setCollapsed(new Set()); }
  function collapseAll() { setCollapsed(new Set(parentIds)); }

  const onNodeClick: NodeMouseHandler = useCallback((_event, node) => {
    if (node.id.startsWith("dg-") || !onEdit || !isAdmin) return;
    const pos = positionsById.get(node.id);
    if (pos) onEdit(pos);
  }, [onEdit, isAdmin, positionsById]);

  // Drag stop: handles both position cards AND dept group boxes
  const onNodeDragStop: OnNodeDrag = useCallback((_: MouseEvent | TouchEvent, node: Node, _nodes: Node[]) => {
    if (!isAdmin || !versionId) return;

    if (node.id.startsWith("dg-")) {
      // Dept box drag — save position; size unchanged
      const deptId = node.id.slice(3);
      const w = (node.style?.width as number) ?? DEPT_MIN_W;
      const h = (node.style?.height as number) ?? DEPT_MIN_H;
      const newState: DeptLayoutState = { x: node.position.x, y: node.position.y, w, h };
      setSessionDeptLayouts((prev) => new Map(prev).set(deptId, newState));
      startTransition(async () => {
        await saveDeptLayout(deptId, versionId, viewType, node.position.x, node.position.y, w, h);
      });
      return;
    }

    // Position card drag
    const newPos = { x: node.position.x, y: node.position.y };
    setSessionPositions((prev) => {
      const next = new Map(prev);
      next.set(node.id, newPos);
      return next;
    });

    // Immediately recompute dept groups from current React Flow state
    setNodes((curr) => {
      const currPositionNodes = curr.filter((n) => !n.id.startsWith("dg-"));
      const newDeptGroups = buildDeptGroups(currPositionNodes, positionsById, departments, combinedDeptLayouts, layoutMode);
      return [...newDeptGroups, ...currPositionNodes];
    });

    startTransition(async () => {
      await savePositionLayout(node.id, versionId, viewType, newPos.x, newPos.y);
    });
  }, [isAdmin, versionId, viewType, positionsById, departments, combinedDeptLayouts, layoutMode, setNodes, startTransition]);

  // Snap all manual positions to the nearest SNAP_GRID pixel boundary
  const handleSnapToGrid = useCallback(() => {
    if (layoutMode !== "manual") return;

    let snappedPositions: Array<{ positionId: string; x: number; y: number }> = [];

    setNodes((curr) => {
      const posNodes = curr
        .filter((n) => !n.id.startsWith("dg-"))
        .map((n) => ({
          ...n,
          position: {
            x: Math.round(n.position.x / SNAP_GRID) * SNAP_GRID,
            y: Math.round(n.position.y / SNAP_GRID) * SNAP_GRID,
          },
        }));
      snappedPositions = posNodes.map((n) => ({ positionId: n.id, x: n.position.x, y: n.position.y }));

      // Also snap dept groups
      const deptNodes = curr
        .filter((n) => n.id.startsWith("dg-"))
        .map((n) => ({
          ...n,
          position: {
            x: Math.round(n.position.x / SNAP_GRID) * SNAP_GRID,
            y: Math.round(n.position.y / SNAP_GRID) * SNAP_GRID,
          },
        }));

      return [...deptNodes, ...posNodes];
    });

    setSessionPositions(() => new Map(snappedPositions.map((s) => [s.positionId, { x: s.x, y: s.y }])));

    if (versionId && snappedPositions.length > 0) {
      startTransition(async () => {
        await batchSavePositionLayouts(snappedPositions, versionId, viewType);
      });
    }
  }, [layoutMode, versionId, viewType, startTransition]);

  // Reset manual layout: clear DB records, clear session state, switch to auto
  const handleResetLayout = useCallback(() => {
    if (!versionId) return;
    startTransition(async () => {
      await Promise.all([
        clearPositionLayouts(versionId, viewType),
        clearDeptLayouts(versionId, viewType),
      ]);
      setSessionPositions(new Map());
      setSessionDeptLayouts(new Map());
      setLayoutMode("auto");
      router.refresh();
    });
  }, [versionId, viewType, startTransition, router]);

  return (
    <OrgCtx.Provider value={ctx}>
      <div className="flex h-full flex-col gap-3">
        {/* ── Toolbar ── */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-48 flex-1">
            <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search positions or people…"
              className="w-full rounded-md border bg-background py-1.5 pl-8 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>

          <select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            className="rounded-md border bg-background px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
          >
            <option value="">All Departments</option>
            {departments
              .filter((d) => d.status === "active")
              .map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-md border bg-background px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
          >
            <option value="">All Statuses</option>
            <option value="filled">Filled</option>
            <option value="open">Open</option>
            <option value="planned">Planned</option>
            <option value="inactive">Inactive</option>
          </select>

          <button
            type="button"
            onClick={expandAll}
            className="flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm transition-colors hover:bg-muted/40"
          >
            <ChevronDown className="size-3.5" /> Expand all
          </button>
          <button
            type="button"
            onClick={collapseAll}
            className="flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm transition-colors hover:bg-muted/40"
          >
            <ChevronUp className="size-3.5" /> Collapse all
          </button>
          <button
            type="button"
            onClick={() => fitView({ duration: 400, padding: 0.12 })}
            className="flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm transition-colors hover:bg-muted/40"
          >
            <Maximize2 className="size-3.5" /> Fit view
          </button>

          {/* View mode toggle */}
          <div className="flex rounded-md border overflow-hidden">
            <button
              type="button"
              onClick={() => setViewMode("chart")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 text-sm transition-colors",
                viewMode === "chart"
                  ? "bg-primary text-primary-foreground"
                  : "bg-background hover:bg-muted/40",
              )}
            >
              <Network className="size-3.5" /> Chart
            </button>
            <button
              type="button"
              onClick={() => setViewMode("mindmap")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 text-sm transition-colors border-l",
                viewMode === "mindmap"
                  ? "bg-primary text-primary-foreground"
                  : "bg-background hover:bg-muted/40",
              )}
            >
              <GitBranch className="size-3.5" /> Mind Map
            </button>
          </div>

          {/* Dept group visibility toggle */}
          <button
            type="button"
            onClick={() => setShowDeptGroups((v) => !v)}
            className={cn(
              "flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm transition-colors",
              showDeptGroups
                ? "bg-muted/40 text-foreground"
                : "bg-background text-muted-foreground hover:bg-muted/40 hover:text-foreground",
            )}
            title={showDeptGroups ? "Hide department groups" : "Show department groups"}
          >
            <Layers className="size-3.5" />
            Depts
          </button>

          {/* Layout mode toggle — admin only */}
          {isAdmin && (
            <div className="flex items-center gap-1.5">
              <div className="flex rounded-md border overflow-hidden">
                <button
                  type="button"
                  onClick={() => setLayoutMode("auto")}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 text-sm transition-colors",
                    layoutMode === "auto"
                      ? "bg-primary text-primary-foreground"
                      : "bg-background hover:bg-muted/40",
                  )}
                  title="Auto layout — dagre tree computed from reporting relationships"
                >
                  <Lock className="size-3.5" /> Auto
                </button>
                <button
                  type="button"
                  onClick={() => setLayoutMode("manual")}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 text-sm transition-colors border-l",
                    layoutMode === "manual"
                      ? "bg-primary text-primary-foreground"
                      : "bg-background hover:bg-muted/40",
                  )}
                  title="Manual layout — drag cards and department boxes to reposition"
                >
                  <Unlock className="size-3.5" /> Manual
                </button>
              </div>
              {layoutMode === "manual" && (
                <>
                  <button
                    type="button"
                    onClick={handleSnapToGrid}
                    className="flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground"
                    title={`Snap all cards to the nearest ${SNAP_GRID}px grid`}
                  >
                    <AlignCenter className="size-3.5" /> Align
                  </button>
                  {hasManualLayouts && (
                    <button
                      type="button"
                      onClick={handleResetLayout}
                      className="flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground"
                      title="Reset manual positions back to auto layout"
                    >
                      <RotateCcw className="size-3.5" /> Reset
                    </button>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* Admin hint */}
        {isAdmin && positions.length > 1 && (
          <p className="text-[11px] text-muted-foreground/70 px-0.5">
            {layoutMode === "manual"
              ? "Manual layout — drag cards and department boxes to reposition; click a dept box to select it then drag its edges to resize. Reporting relationships unchanged."
              : "Auto layout — use ← → arrows to reorder siblings. Click any card to edit. Use + to add a direct report."}
          </p>
        )}

        {/* ── Canvas ── */}
        <div className="flex-1 overflow-hidden rounded-xl border bg-slate-50/60">
          {positions.length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              No positions yet. Add a position to build your org chart.
            </div>
          ) : (
            <ReactFlow
              nodes={nodes}
              edges={rfEdges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              nodeTypes={NODE_TYPES}
              fitView
              fitViewOptions={{ padding: 0.12 }}
              minZoom={0.05}
              maxZoom={2}
              proOptions={{ hideAttribution: true }}
              nodesDraggable={false}
              nodesConnectable={false}
              elementsSelectable={layoutMode === "manual"}
              snapToGrid={layoutMode === "manual"}
              snapGrid={[SNAP_GRID, SNAP_GRID]}
              onNodeClick={onNodeClick}
              onNodeDragStop={onNodeDragStop}
            >
              <Background variant={BackgroundVariant.Dots} gap={22} size={1} color="#e2e8f0" />
              <Controls position="bottom-right" showInteractive={false} />
            </ReactFlow>
          )}
        </div>
      </div>
    </OrgCtx.Provider>
  );
}

// ─── Public export ────────────────────────────────────────────────────────────

export function OrgChartCanvas({
  positions,
  departments,
  layouts = [],
  deptLayouts = [],
  versionId,
  onEdit,
  onAdd,
  isAdmin = false,
}: {
  positions:    OrgPosition[];
  departments:  OrgDepartment[];
  layouts?:     OrgPositionLayout[];
  deptLayouts?: OrgDeptLayout[];
  versionId:    string;
  onEdit?:      (p: OrgPosition) => void;
  onAdd?:       (reportsToId: string) => void;
  isAdmin?:     boolean;
}) {
  return (
    <ReactFlowProvider>
      <OrgChartInner
        positions={positions}
        departments={departments}
        layouts={layouts}
        deptLayouts={deptLayouts}
        versionId={versionId}
        onEdit={onEdit}
        onAdd={onAdd}
        isAdmin={isAdmin}
      />
    </ReactFlowProvider>
  );
}
