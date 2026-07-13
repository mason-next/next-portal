"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
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
  SelectionMode,
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
  AlignCenterHorizontal,
  AlignCenterVertical,
  AlignEndHorizontal,
  AlignEndVertical,
  AlignHorizontalSpaceBetween,
  AlignStartHorizontal,
  AlignStartVertical,
  AlignVerticalSpaceBetween,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Download,
  Hand,
  Maximize2,
  MousePointer2,
  Plus,
  Search,
  Network,
  GitBranch,
  RotateCcw,
  Upload,
  Wand2,
  Undo2,
  Grid3x3,
  Layers,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  createOrgPosition,
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

// ─── Constants ────────────────────────────────────────────────────────────────

const SNAP_GRID  = 20;
const NODE_W     = 215;
const NODE_H     = 138;
const LABEL_H    = 64;   // dept group label bar height
const PAD        = 60;   // padding inside dept group box
const GROUP_GAP  = 48;   // minimum gap between dept group bounding boxes
const DEPT_MIN_W = 200;
const DEPT_MIN_H = 120;
const MM_X_GAP   = 80;
const MM_Y_GAP   = 24;
const UNDO_LIMIT = 10;

// ─── Types ────────────────────────────────────────────────────────────────────

interface DeptLayoutState { x: number; y: number; w: number; h: number }
interface PosXY           { x: number; y: number }

type LayoutSnapshot = {
  positions: Map<string, PosXY>;
  depts:     Map<string, DeptLayoutState>;
};

type AlignOp    = "top" | "bottom" | "left" | "right" | "centerH" | "centerV" | "distH" | "distV";
type CanvasMode = "pan" | "select";

// Quote-aware CSV line splitter
function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "", inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') { inQ = !inQ; }
    else if (ch === "," && !inQ) { out.push(cur.trim()); cur = ""; }
    else { cur += ch; }
  }
  out.push(cur.trim());
  return out;
}

// ─── Dept group nudge: push overlapping boxes apart (used after auto-align) ──

function nudgeDeptGroups(groups: Node[]): Node[] {
  if (groups.length < 2) return groups;
  const result = groups.map((g) => ({ ...g, position: { ...g.position } }));
  for (let iter = 0; iter < 30; iter++) {
    result.sort((a, b) => a.position.x - b.position.x);
    let changed = false;
    for (let i = 0; i < result.length; i++) {
      for (let j = i + 1; j < result.length; j++) {
        const a = result[i], b = result[j];
        const aw = (a.style?.width  as number) ?? 0;
        const ah = (a.style?.height as number) ?? 0;
        const bh = (b.style?.height as number) ?? 0;
        const overlapX = a.position.x + aw + GROUP_GAP - b.position.x;
        const yOverlap =
          Math.min(a.position.y + ah, b.position.y + bh) -
          Math.max(a.position.y, b.position.y);
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
// savedDeptLayouts: when populated (manual drags/resizes), use saved x/y/w/h.
// Pass an empty Map to force AABB recomputation (used by Auto Align).

function buildDeptGroups(
  positionNodes: Node[],
  posById:       Map<string, OrgPosition>,
  departments:   OrgDepartment[],
  savedDeptLayouts: Map<string, DeptLayoutState>,
  isAdmin:       boolean,
): Node[] {
  const buckets = new Map<string, PosXY[]>();
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

    const saved = savedDeptLayouts.get(dept.id);
    let x: number, y: number, w: number, h: number;

    if (saved) {
      ({ x, y, w, h } = saved);
    } else {
      const minX = Math.min(...pts.map((p) => p.x));
      const minY = Math.min(...pts.map((p) => p.y));
      const maxX = Math.max(...pts.map((p) => p.x));
      const maxY = Math.max(...pts.map((p) => p.y));
      w = maxX - minX + NODE_W + PAD * 2;
      h = maxY - minY + NODE_H + LABEL_H + PAD;
      x = minX - PAD;
      y = minY - LABEL_H;
    }

    rawGroups.push({
      id:         `dg-${dept.id}`,
      type:       "deptGroup",
      position:   { x, y },
      style:      { width: w, height: h },
      data:       {
        label:        dept.name,
        color:        dept.color ?? "#6366f1",
        deptId:       dept.id,
        deptIndex:    groupIdx,
        divisionName: dept.division?.name ?? null,
        divisionColor: dept.division?.color ?? null,
      },
      zIndex:     -1,
      draggable:  isAdmin,
      selectable: isAdmin,
    });
    groupIdx++;
  }

  // Nudge only when AABB-computed (not manually placed)
  const finalGroups = savedDeptLayouts.size === 0 ? nudgeDeptGroups(rawGroups) : rawGroups;
  const total = finalGroups.length;
  return finalGroups.map((g) => ({
    ...g,
    data: { ...(g.data as Record<string, unknown>), deptTotal: total },
  }));
}

// ─── Dagre top-down tree layout ───────────────────────────────────────────────

function buildLayout(
  positions: OrgPosition[],
  collapsed: Set<string>,
): { positionNodes: Node[]; edges: Edge[] } {
  if (positions.length === 0) return { positionNodes: [], edges: [] };

  const posById    = new Map(positions.map((p) => [p.id, p]));
  const idSet      = new Set(positions.map((p) => p.id));
  const childrenOf = new Map<string, string[]>(positions.map((p) => [p.id, []]));

  for (const p of positions) {
    if (p.reportsToPositionId && idSet.has(p.reportsToPositionId)) {
      childrenOf.get(p.reportsToPositionId)!.push(p.id);
    }
  }

  // Sort children by sortOrder so Auto Align respects canonical sibling order
  for (const kids of childrenOf.values()) {
    kids.sort((a, b) => {
      const pa = posById.get(a)!, pb = posById.get(b)!;
      if (pa.sortOrder == null && pb.sortOrder == null) return pa.createdAt < pb.createdAt ? -1 : 1;
      if (pa.sortOrder == null) return 1;
      if (pb.sortOrder == null) return -1;
      return pa.sortOrder - pb.sortOrder;
    });
  }

  const roots = positions
    .filter((p) => !p.reportsToPositionId || !idSet.has(p.reportsToPositionId))
    .map((p) => p.id);

  const visible = new Set<string>();
  function markVisible(id: string) {
    visible.add(id);
    if (!collapsed.has(id)) for (const k of childrenOf.get(id) ?? []) markVisible(k);
  }
  for (const r of roots) markVisible(r);

  const g = new graphlib.Graph();
  g.setGraph({ rankdir: "TB", nodesep: 80, ranksep: 120, marginx: 100, marginy: 80 });
  g.setDefaultEdgeLabel(() => ({}));

  for (const id of visible) g.setNode(id, { width: NODE_W, height: NODE_H });
  for (const [parentId, kids] of childrenOf) {
    if (!visible.has(parentId)) continue;
    for (const kid of kids) if (visible.has(kid)) g.setEdge(parentId, kid);
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
      position:   { x: x - NODE_W / 2, y: y - NODE_H / 2 },
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

// ─── Mind map (left-to-right custom DFS) ─────────────────────────────────────

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

  const xyMap = new Map<string, PosXY>();
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
  function markVis(id: string) {
    visible.add(id);
    if (!collapsed.has(id)) for (const k of childrenOf.get(id) ?? []) markVis(k);
  }
  for (const r of roots) markVis(r);

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
  onDeptReorder?:  (deptId: string, dir: "left" | "right") => void;
  onDeptResize?:   (deptId: string, x: number, y: number, w: number, h: number) => void;
  positionsById:   Map<string, OrgPosition>;
  departmentsById: Map<string, OrgDepartment>;
  isAdmin:         boolean;
  viewMode:        "chart" | "mindmap";
}>({
  onToggle:        () => {},
  positionsById:   new Map(),
  departmentsById: new Map(),
  isAdmin:         false,
  viewMode:        "chart",
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

function PositionNode({ data, id, selected }: NodeProps) {
  const { onEdit, onAdd, onToggle, positionsById, departmentsById, isAdmin, viewMode } =
    useContext(OrgCtx);
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

  const displayName = primary?.user?.name ?? (isPlanned ? "— Planned —" : "— Vacant —");
  const isMindmap   = viewMode === "mindmap";

  return (
    <div
      className={cn(
        "relative",
        isAdmin ? "cursor-grab active:cursor-grabbing" : "cursor-default",
      )}
      style={{ width: NODE_W }}
    >
      {/* Card */}
      <div className={cn(
        "rounded-xl border shadow-sm transition-all hover:shadow-md",
        isVacant || isPlanned ? "bg-slate-50/90" : "bg-white",
        selected
          ? "border-primary ring-2 ring-primary/40"
          : "border-slate-200",
        isAdmin && !selected && "hover:border-slate-300 hover:ring-1 hover:ring-primary/20",
      )}>
        <div className="h-1.5 w-full rounded-t-xl" style={{ backgroundColor: deptColor }} />

        <div className="relative z-10 -mt-5 flex justify-center">
          <div className={cn("rounded-full ring-2 ring-white shadow-sm", (isVacant || isPlanned) && "opacity-50")}>
            <UserAvatarImage
              name={isVacant || isPlanned ? "?" : (primary?.user?.name ?? "?")}
              avatarUrl={isVacant ? null : (primary?.user?.avatarUrl ?? null)}
              size={40}
            />
          </div>
        </div>

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
                ·&nbsp;{new Date(position.targetHireDate).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Expand/collapse badge */}
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

      {/* Add direct report */}
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

      <Handle id="tgt-top"    type="target" position={Position.Top}    style={{ opacity: 0, pointerEvents: "none" }} />
      <Handle id="src-bottom" type="source" position={Position.Bottom} style={{ opacity: 0, pointerEvents: "none" }} />
      <Handle id="tgt-left"   type="target" position={Position.Left}   style={{ opacity: 0, pointerEvents: "none" }} />
      <Handle id="src-right"  type="source" position={Position.Right}  style={{ opacity: 0, pointerEvents: "none" }} />
    </div>
  );
}

// ─── Department group node ─────────────────────────────────────────────────────

function DeptGroupNode({ data, selected }: NodeProps) {
  const { label, color, deptId, deptIndex, deptTotal, divisionName, divisionColor } = data as {
    label: string; color: string; deptId: string; deptIndex: number; deptTotal: number;
    divisionName: string | null; divisionColor: string | null;
  };
  const { onDeptReorder, onDeptResize, isAdmin } = useContext(OrgCtx);
  const c = color ?? "#6366f1";

  const canMoveLeft  = isAdmin && deptIndex > 0;
  const canMoveRight = isAdmin && deptIndex < (deptTotal - 1);
  const showReorderControls = isAdmin && (canMoveLeft || canMoveRight) && onDeptReorder;

  const handleResizeEnd: OnResizeEnd = useCallback(
    (_, { x, y, width, height }) => {
      onDeptResize?.(deptId, x, y, width, height);
    },
    [deptId, onDeptResize],
  );

  return (
    <div className="relative h-full w-full" data-testid="dept-group-node">
      {/* NodeResizer — visible when admin selects the dept box */}
      {isAdmin && (
        <NodeResizer
          isVisible={selected === true}
          minWidth={DEPT_MIN_W}
          minHeight={DEPT_MIN_H}
          onResizeEnd={handleResizeEnd}
          lineStyle={{ borderColor: c, borderWidth: 2, borderStyle: "dashed" }}
          handleStyle={{ backgroundColor: "#fff", borderColor: c, borderWidth: 2, width: 10, height: 10, borderRadius: 3 }}
        />
      )}

      <div
        className="h-full w-full rounded-2xl pointer-events-none"
        style={{ border: `1.5px solid ${c}35`, background: `${c}08` }}
      >
        <div className="m-3 flex flex-wrap items-center gap-1">
          {divisionName && (
            <span
              className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium"
              style={{
                background: `${divisionColor ?? c}15`,
                color: divisionColor ?? c,
                border: `1px solid ${divisionColor ?? c}25`,
              }}
            >
              <span className="size-1.5 flex-none rounded-full" style={{ background: divisionColor ?? c }} />
              {divisionName}
            </span>
          )}
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold"
            style={{ background: `${c}18`, color: c, border: `1px solid ${c}30` }}
          >
            <span className="size-2 flex-none rounded-full" style={{ background: c }} />
            {label}
            {isAdmin && (
              <span className="ml-1 text-[9px] opacity-40">drag · click to resize</span>
            )}
          </span>
        </div>
      </div>

      {showReorderControls && (
        <div className="absolute top-2 right-2 z-10 flex gap-1">
          <button
            type="button"
            disabled={!canMoveLeft}
            onClick={() => onDeptReorder!(deptId, "left")}
            className="flex h-5 w-5 items-center justify-center rounded border border-slate-200 bg-white/90 shadow-sm text-slate-400 hover:text-slate-700 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
            title="Move department left (sets Auto Align order)"
            style={{ pointerEvents: "all" }}
          >
            <ChevronLeft className="size-3" />
          </button>
          <button
            type="button"
            disabled={!canMoveRight}
            onClick={() => onDeptReorder!(deptId, "right")}
            className="flex h-5 w-5 items-center justify-center rounded border border-slate-200 bg-white/90 shadow-sm text-slate-400 hover:text-slate-700 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
            title="Move department right (sets Auto Align order)"
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

  const [collapsed,         setCollapsed]         = useState<Set<string>>(new Set());
  const [search,            setSearch]            = useState("");
  const [deptFilter,        setDeptFilter]        = useState("");
  const [statusFilter,      setStatusFilter]      = useState("");
  const [viewMode,          setViewMode]          = useState<"chart" | "mindmap">("chart");
  const [showDeptGroups,    setShowDeptGroups]    = useState(true);

  // Grid visibility — persisted in localStorage
  const [showGrid, setShowGrid] = useState(true);
  useEffect(() => {
    const stored = localStorage.getItem("org-chart-grid");
    if (stored !== null) setShowGrid(stored !== "0");
  }, []);

  // In-session position overrides (drag tracking)
  const [sessionPositions,   setSessionPositions]   = useState<Map<string, PosXY>>(new Map());
  // In-session dept layout overrides (drag/resize tracking)
  const [sessionDeptLayouts, setSessionDeptLayouts] = useState<Map<string, DeptLayoutState>>(new Map());

  // Undo stack for Auto Align (capped at UNDO_LIMIT)
  const [undoStack, setUndoStack] = useState<LayoutSnapshot[]>([]);

  // IDs of currently selected position nodes (for multi-select alignment toolbar)
  const [selectedPositionIds, setSelectedPositionIds] = useState<Set<string>>(new Set());

  // Canvas interaction mode: pan (default) or marquee select
  const [canvasMode,    setCanvasMode]    = useState<CanvasMode>("pan");
  const [importPending, setImportPending] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const viewType = viewMode === "mindmap" ? "mind_map" : "org_chart";

  // Saved DB position layouts, keyed by positionId for current viewType
  const layoutsById = useMemo(
    () => new Map(
      layouts
        .filter((l) => l.viewType === viewType)
        .map((l) => [l.positionId, l]),
    ),
    [layouts, viewType],
  );

  // Combined dept layouts: DB rows + session overrides
  const combinedDeptLayouts = useMemo<Map<string, DeptLayoutState>>(() => {
    const map = new Map<string, DeptLayoutState>();
    for (const dl of deptLayouts.filter((l) => l.viewType === viewType)) {
      map.set(dl.deptId, { x: dl.layoutX, y: dl.layoutY, w: dl.layoutW, h: dl.layoutH });
    }
    for (const [deptId, state] of sessionDeptLayouts) map.set(deptId, state);
    return map;
  }, [deptLayouts, viewType, sessionDeptLayouts]);

  const positionsById   = useMemo(() => new Map(positions.map((p) => [p.id, p])),   [positions]);
  const departmentsById = useMemo(() => new Map(departments.map((d) => [d.id, d])), [departments]);

  const onToggle = useCallback((id: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  // Swap department order (affects Auto Align canonical ordering only)
  const onDeptReorder = useCallback((deptId: string, dir: "left" | "right") => {
    const sorted = [...departments].sort((a, b) => {
      if (a.sortOrder == null && b.sortOrder == null) return a.name.localeCompare(b.name);
      if (a.sortOrder == null) return 1;
      if (b.sortOrder == null) return -1;
      return a.sortOrder - b.sortOrder;
    });
    const idx       = sorted.findIndex((d) => d.id === deptId);
    const targetIdx = dir === "left" ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= sorted.length) return;
    const other      = sorted[targetIdx];
    const myOrder    = departments.find((d) => d.id === deptId)?.sortOrder ?? idx       * 10;
    const otherOrder = other.sortOrder ?? targetIdx * 10;
    startTransition(async () => {
      await swapOrgDepartmentOrder(deptId, myOrder, other.id, otherOrder);
      router.refresh();
    });
  }, [departments, router, startTransition]);

  // Dept box resize end — saves new position + size to session + DB
  const onDeptResize = useCallback((deptId: string, x: number, y: number, w: number, h: number) => {
    if (!isAdmin || !versionId) return;
    setSessionDeptLayouts((prev) => new Map(prev).set(deptId, { x, y, w, h }));
    startTransition(async () => {
      await saveDeptLayout(deptId, versionId, viewType, x, y, w, h);
    });
  }, [isAdmin, versionId, viewType, startTransition]);

  // Dagre/DFS layout — position nodes only, no dept groups, no saved overrides
  const { positionNodes: dagrePositionNodes, edges } = useMemo(
    () => viewMode === "mindmap"
      ? buildMindMapLayout(positions, collapsed)
      : buildLayout(positions, collapsed),
    [positions, collapsed, viewMode],
  );

  // Apply saved positions: session override → DB saved → dagre fallback
  const positionNodes = useMemo(() => {
    return dagrePositionNodes.map((n) => {
      const base = { ...n, draggable: isAdmin, selectable: isAdmin };
      const session = sessionPositions.get(n.id);
      if (session) return { ...base, position: session };
      const saved   = layoutsById.get(n.id);
      if (saved) return { ...base, position: { x: saved.layoutX, y: saved.layoutY } };
      return base; // dagre fallback position
    });
  }, [dagrePositionNodes, sessionPositions, layoutsById, isAdmin]);

  // Dept group overlay boxes
  const deptGroupNodes = useMemo(
    () => buildDeptGroups(positionNodes, positionsById, departments, combinedDeptLayouts, isAdmin),
    [positionNodes, positionsById, departments, combinedDeptLayouts, isAdmin],
  );

  const ctx = useMemo(() => ({
    onEdit,
    onAdd,
    onToggle,
    onDeptReorder: isAdmin ? onDeptReorder : undefined,
    onDeptResize:  isAdmin ? onDeptResize  : undefined,
    positionsById,
    departmentsById,
    isAdmin,
    viewMode,
  }), [onEdit, onAdd, onToggle, onDeptReorder, onDeptResize, positionsById, departmentsById, isAdmin, viewMode]);

  // Dimming for search/filter
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
    return new Set(
      positionNodes.map((n) => n.id).filter((id) => !matched.has(id))
    );
  }, [positions, positionNodes, search, deptFilter, statusFilter]);

  const allNodes = useMemo(() => {
    const combined = [
      ...(showDeptGroups ? deptGroupNodes : []),
      ...positionNodes,
    ];
    if (dimmedIds.size === 0) return combined;
    return combined.map((n) => ({
      ...n,
      style: { ...n.style, opacity: dimmedIds.has(n.id) ? 0.18 : 1, transition: "opacity 0.15s" },
    }));
  }, [deptGroupNodes, positionNodes, dimmedIds, showDeptGroups]);

  const [nodes, setNodes, onNodesChange] = useNodesState(allNodes);
  const [rfEdges, setEdges, onEdgesChange] = useEdgesState(edges);

  // Sync allNodes → React Flow nodes, always preserving current positions for existing nodes
  useEffect(() => {
    setNodes((curr) => {
      const currPosMap  = new Map(curr.filter((n) => !n.id.startsWith("dg-")).map((n) => [n.id, n.position]));
      const currDeptMap = new Map(
        curr.filter((n) => n.id.startsWith("dg-")).map((n) => [n.id, { position: n.position, style: n.style }]),
      );
      return allNodes.map((n) => {
        if (n.id.startsWith("dg-")) {
          if (currDeptMap.has(n.id)) {
            const saved = currDeptMap.get(n.id)!;
            // Preserve RF position (stable during drags) but use allNodes.style
            // (from combinedDeptLayouts) — RF stores resize dims in .width/.height,
            // NOT in .style, so saving .style would overwrite the new resize dims
            return { ...n, position: saved.position };
          }
          return n;
        }
        if (currPosMap.has(n.id)) return { ...n, position: currPosMap.get(n.id)! };
        return n;
      });
    });
  }, [allNodes, setNodes]);

  useEffect(() => { setEdges(edges); }, [edges, setEdges]);

  // Fit view when the tree structure changes (edge set changes)
  useEffect(() => {
    const t = setTimeout(() => fitView({ duration: 350, padding: 0.12 }), 80);
    return () => clearTimeout(t);
  }, [edges, fitView]);

  const parentIds = useMemo(
    () => new Set(positions.filter((p) => positions.some((q) => q.reportsToPositionId === p.id)).map((p) => p.id)),
    [positions],
  );

  function expandAll()   { setCollapsed(new Set()); }
  function collapseAll() { setCollapsed(new Set(parentIds)); }

  // Double-click opens edit modal; single click is handled by RF for selection
  const onNodeDoubleClick: NodeMouseHandler = useCallback((_event, node) => {
    if (node.id.startsWith("dg-") || !onEdit || !isAdmin) return;
    const pos = positionsById.get(node.id);
    if (pos) onEdit(pos);
  }, [onEdit, isAdmin, positionsById]);

  // ─── Drag stop: handles multi-select batch-save + dept box drag ──────────────

  const onNodeDragStop: OnNodeDrag = useCallback(
    (_: MouseEvent | TouchEvent, _primaryNode: Node, draggedNodes: Node[]) => {
      if (!isAdmin || !versionId) return;

      const movedDepts     = draggedNodes.filter((n) =>  n.id.startsWith("dg-"));
      const movedPositions = draggedNodes.filter((n) => !n.id.startsWith("dg-"));

      // Save dept box positions
      for (const d of movedDepts) {
        const deptId = d.id.slice(3);
        const w = (d.style?.width  as number) ?? DEPT_MIN_W;
        const h = (d.style?.height as number) ?? DEPT_MIN_H;
        const state: DeptLayoutState = { x: d.position.x, y: d.position.y, w, h };
        setSessionDeptLayouts((prev) => new Map(prev).set(deptId, state));
        startTransition(async () => {
          await saveDeptLayout(deptId, versionId, viewType, d.position.x, d.position.y, w, h);
        });
      }

      // Save position card positions (including multi-select batch)
      if (movedPositions.length > 0) {
        setSessionPositions((prev) => {
          const next = new Map(prev);
          for (const p of movedPositions) next.set(p.id, { x: p.position.x, y: p.position.y });
          return next;
        });

        // Immediately recompute dept group AABBs from current React Flow state
        setNodes((curr) => {
          const currPosNodes = curr.filter((n) => !n.id.startsWith("dg-"));
          const newGroups    = buildDeptGroups(currPosNodes, positionsById, departments, combinedDeptLayouts, isAdmin);
          return [...newGroups, ...currPosNodes];
        });

        const entries = movedPositions.map((n) => ({ positionId: n.id, x: n.position.x, y: n.position.y }));
        startTransition(async () => {
          if (entries.length === 1) {
            await savePositionLayout(entries[0].positionId, versionId, viewType, entries[0].x, entries[0].y);
          } else {
            await batchSavePositionLayouts(entries, versionId, viewType);
          }
        });
      }
    },
    [isAdmin, versionId, viewType, positionsById, departments, combinedDeptLayouts, setNodes, startTransition],
  );

  // ─── Auto Align ───────────────────────────────────────────────────────────────

  const handleAutoAlign = useCallback(() => {
    if (!versionId || positions.length === 0) return;

    // 1. Snapshot current layout for undo
    const snapshot: LayoutSnapshot = { positions: new Map(), depts: new Map() };
    for (const n of nodes) {
      if (n.id.startsWith("dg-")) {
        const deptId = n.id.slice(3);
        snapshot.depts.set(deptId, {
          x: n.position.x, y: n.position.y,
          w: (n.style?.width  as number) ?? DEPT_MIN_W,
          h: (n.style?.height as number) ?? DEPT_MIN_H,
        });
      } else {
        snapshot.positions.set(n.id, { x: n.position.x, y: n.position.y });
      }
    }
    setUndoStack((prev) => [...prev.slice(-(UNDO_LIMIT - 1)), snapshot]);

    // 2. Compute fresh dagre layout (full positions list, ignore current saved positions)
    const { positionNodes: aligned } = buildLayout(positions, collapsed);

    // 3. Offset so top-left of layout is at (100, 100)
    if (aligned.length > 0) {
      const minX = Math.min(...aligned.map((n) => n.position.x));
      const minY = Math.min(...aligned.map((n) => n.position.y));
      const dx = 100 - minX;
      const dy = 100 - minY;
      for (const n of aligned) {
        n.position.x += dx;
        n.position.y += dy;
      }
    }

    // 4. Compute AABB dept groups from new positions (clear manual dept box positions)
    const alignedWithDraggable = aligned.map((n) => ({ ...n, draggable: isAdmin, selectable: isAdmin }));
    const newDeptGroups = buildDeptGroups(alignedWithDraggable, positionsById, departments, new Map(), isAdmin);

    // 5. Update React Flow immediately
    setNodes([
      ...(showDeptGroups ? newDeptGroups : []),
      ...alignedWithDraggable,
    ]);

    // 6. Sync session state so subsequent moves work correctly
    const newSessionPositions = new Map<string, PosXY>();
    for (const n of aligned) newSessionPositions.set(n.id, { x: n.position.x, y: n.position.y });
    setSessionPositions(newSessionPositions);
    setSessionDeptLayouts(new Map()); // dept groups are now AABB-computed

    // 7. Persist all positions + dept layouts to DB
    const positionEntries = aligned.map((n) => ({ positionId: n.id, x: n.position.x, y: n.position.y }));
    startTransition(async () => {
      await batchSavePositionLayouts(positionEntries, versionId, viewType);
      await clearDeptLayouts(versionId, viewType);
      for (const g of newDeptGroups) {
        await saveDeptLayout(
          g.id.slice(3), versionId, viewType,
          g.position.x, g.position.y,
          (g.style?.width  as number) ?? DEPT_MIN_W,
          (g.style?.height as number) ?? DEPT_MIN_H,
        );
      }
    });

    setTimeout(() => fitView({ duration: 450, padding: 0.12 }), 100);
  }, [nodes, positions, collapsed, positionsById, departments, showDeptGroups, isAdmin, versionId, viewType, setNodes, fitView, startTransition]);

  // ─── Undo Layout ──────────────────────────────────────────────────────────────

  const handleUndoLayout = useCallback(() => {
    if (undoStack.length === 0 || !versionId) return;
    const snapshot = undoStack[undoStack.length - 1];
    setUndoStack((prev) => prev.slice(0, -1));

    // Restore React Flow nodes immediately
    setNodes((curr) => curr.map((n) => {
      if (n.id.startsWith("dg-")) {
        const state = snapshot.depts.get(n.id.slice(3));
        if (state) return { ...n, position: { x: state.x, y: state.y }, style: { ...n.style, width: state.w, height: state.h } };
        return n;
      }
      const pos = snapshot.positions.get(n.id);
      return pos ? { ...n, position: pos } : n;
    }));

    // Sync session state
    setSessionPositions(snapshot.positions);
    setSessionDeptLayouts(snapshot.depts);

    // Persist restored positions to DB
    const positionEntries = [...snapshot.positions.entries()].map(([positionId, p]) => ({ positionId, x: p.x, y: p.y }));
    startTransition(async () => {
      if (positionEntries.length > 0) await batchSavePositionLayouts(positionEntries, versionId, viewType);
      if (snapshot.depts.size > 0) {
        await clearDeptLayouts(versionId, viewType);
        for (const [deptId, state] of snapshot.depts) {
          await saveDeptLayout(deptId, versionId, viewType, state.x, state.y, state.w, state.h);
        }
      }
    });

    setTimeout(() => fitView({ duration: 400, padding: 0.12 }), 100);
  }, [undoStack, versionId, viewType, setNodes, fitView, startTransition]);

  // ─── Reset Layout ─────────────────────────────────────────────────────────────

  const handleResetLayout = useCallback(() => {
    if (!versionId) return;
    startTransition(async () => {
      await Promise.all([
        clearPositionLayouts(versionId, viewType),
        clearDeptLayouts(versionId, viewType),
      ]);
      setSessionPositions(new Map());
      setSessionDeptLayouts(new Map());
      setUndoStack([]);
      router.refresh();
    });
  }, [versionId, viewType, startTransition, router]);

  // ─── Grid toggle ──────────────────────────────────────────────────────────────

  const toggleGrid = useCallback(() => {
    setShowGrid((v) => {
      const next = !v;
      localStorage.setItem("org-chart-grid", next ? "1" : "0");
      return next;
    });
  }, []);

  // ─── Selection change ──────────────────────────────────────────────────────────

  const onSelectionChange = useCallback(({ nodes: sel }: { nodes: Node[] }) => {
    const ids = new Set(sel.filter((n) => !n.id.startsWith("dg-")).map((n) => n.id));
    setSelectedPositionIds(ids);
  }, []);

  // ─── Alignment operations for multi-selected position cards ───────────────────

  const handleAlign = useCallback((op: AlignOp) => {
    if (!versionId || selectedPositionIds.size < 2) return;

    const selectedNodes = nodes.filter((n) => selectedPositionIds.has(n.id));
    if (selectedNodes.length < 2) return;

    // Snapshot for undo
    const snapshot: LayoutSnapshot = { positions: new Map(), depts: new Map() };
    for (const n of nodes) {
      if (n.id.startsWith("dg-")) {
        snapshot.depts.set(n.id.slice(3), {
          x: n.position.x, y: n.position.y,
          w: (n.style?.width  as number) ?? DEPT_MIN_W,
          h: (n.style?.height as number) ?? DEPT_MIN_H,
        });
      } else {
        snapshot.positions.set(n.id, { x: n.position.x, y: n.position.y });
      }
    }
    setUndoStack((prev) => [...prev.slice(-(UNDO_LIMIT - 1)), snapshot]);

    const xs   = selectedNodes.map((n) => n.position.x);
    const ys   = selectedNodes.map((n) => n.position.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);

    const newPositions = new Map<string, PosXY>();

    switch (op) {
      case "top":
        for (const n of selectedNodes) newPositions.set(n.id, { x: n.position.x, y: minY });
        break;
      case "bottom":
        for (const n of selectedNodes) newPositions.set(n.id, { x: n.position.x, y: maxY });
        break;
      case "left":
        for (const n of selectedNodes) newPositions.set(n.id, { x: minX, y: n.position.y });
        break;
      case "right":
        for (const n of selectedNodes) newPositions.set(n.id, { x: maxX, y: n.position.y });
        break;
      case "centerH": {
        const cy = (minY + maxY + NODE_H) / 2 - NODE_H / 2;
        for (const n of selectedNodes) newPositions.set(n.id, { x: n.position.x, y: cy });
        break;
      }
      case "centerV": {
        const cx = (minX + maxX + NODE_W) / 2 - NODE_W / 2;
        for (const n of selectedNodes) newPositions.set(n.id, { x: cx, y: n.position.y });
        break;
      }
      case "distH": {
        const sorted = [...selectedNodes].sort((a, b) => a.position.x - b.position.x);
        const count  = sorted.length;
        for (let i = 0; i < count; i++) {
          const x = count > 1 ? minX + (i * (maxX - minX)) / (count - 1) : minX;
          newPositions.set(sorted[i].id, { x, y: sorted[i].position.y });
        }
        break;
      }
      case "distV": {
        const sorted = [...selectedNodes].sort((a, b) => a.position.y - b.position.y);
        const count  = sorted.length;
        for (let i = 0; i < count; i++) {
          const y = count > 1 ? minY + (i * (maxY - minY)) / (count - 1) : minY;
          newPositions.set(sorted[i].id, { x: sorted[i].position.x, y });
        }
        break;
      }
    }

    // Apply to RF immediately
    setNodes((curr) => curr.map((n) => {
      const pos = newPositions.get(n.id);
      return pos ? { ...n, position: pos } : n;
    }));

    // Sync session
    setSessionPositions((prev) => {
      const next = new Map(prev);
      for (const [id, pos] of newPositions) next.set(id, pos);
      return next;
    });

    // Persist to DB
    const entries = [...newPositions.entries()].map(([positionId, pos]) => ({
      positionId, x: pos.x, y: pos.y,
    }));
    startTransition(async () => {
      await batchSavePositionLayouts(entries, versionId, viewType);
    });
  }, [versionId, selectedPositionIds, nodes, viewType, setNodes, startTransition]);

  // ─── CSV Import ───────────────────────────────────────────────────────────────

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const text = await file.text();
    const lines = text.split(/\r?\n/).filter((l) => l.trim());
    if (lines.length < 2) {
      alert("CSV must have a header row and at least one data row.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    const headers    = parseCsvLine(lines[0]).map((h) => h.toLowerCase().replace(/\s+/g, ""));
    const titleIdx   = headers.findIndex((h) => ["title", "position", "role", "jobtitle"].includes(h));
    const deptIdx    = headers.findIndex((h) => ["department", "dept"].includes(h));
    const statusIdx  = headers.findIndex((h) => h === "status");

    if (titleIdx === -1) {
      alert('CSV must have a "Title" column (also accepted: Position, Role).');
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    const deptByName = new Map(departments.map((d) => [d.name.toLowerCase(), d]));
    const validStatuses = new Set(["filled", "open", "planned", "inactive"]);

    const rows = lines.slice(1).flatMap((line, i) => {
      const cols  = parseCsvLine(line);
      const title = cols[titleIdx]?.trim();
      if (!title) return [];
      const rawDept  = deptIdx    !== -1 ? (cols[deptIdx]?.trim()   ?? "") : "";
      const rawStatus = statusIdx !== -1 ? (cols[statusIdx]?.trim()?.toLowerCase() ?? "open") : "open";
      const dept    = rawDept  ? deptByName.get(rawDept.toLowerCase())  : null;
      const status  = validStatuses.has(rawStatus) ? rawStatus : "open";
      const warning = rawDept && !dept ? `Row ${i + 2}: department "${rawDept}" not found — will be unassigned` : "";
      return [{ title, departmentId: dept?.id ?? null, status, warning }];
    });

    if (rows.length === 0) {
      alert("No valid title rows found in CSV.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    const warnings = rows.filter((r) => r.warning).map((r) => `• ${r.warning}`).join("\n");
    const msg = `Import ${rows.length} position${rows.length === 1 ? "" : "s"} into the current org chart?${warnings ? `\n\nWarnings:\n${warnings}` : ""}`;
    if (!confirm(msg)) {
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setImportPending(true);
    try {
      for (const row of rows) {
        await createOrgPosition({ orgChartVersionId: versionId, title: row.title, departmentId: row.departmentId, status: row.status });
      }
      router.refresh();
    } catch {
      alert("Import failed. Check the console for details.");
    } finally {
      setImportPending(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }, [departments, versionId, router]);

  // ─── PDF Export ───────────────────────────────────────────────────────────────

  const handleExportPdf = useCallback(async () => {
    const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
      import("jspdf"),
      import("jspdf-autotable"),
    ]);

    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    doc.setFontSize(18);
    doc.text("Org Chart", 14, 14);
    doc.setFontSize(10);
    doc.setTextColor(120);
    doc.text(new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }), 14, 21);
    doc.setTextColor(0);

    const body = [...positions]
      .sort((a, b) => {
        const da = a.department?.name ?? "";
        const db = b.department?.name ?? "";
        return da.localeCompare(db) || a.title.localeCompare(b.title);
      })
      .map((p) => {
        const dept      = p.departmentId ? departmentsById.get(p.departmentId) : null;
        const division  = dept?.division?.name ?? "—";
        const deptName  = dept?.name ?? "—";
        const assignee  = p.assignments.find((a) => a.isActive && a.assignmentType === "primary");
        const user      = assignee?.user?.name ?? "Vacant";
        const statusLbl = p.status.charAt(0).toUpperCase() + p.status.slice(1);
        const reportsTo = p.reportsToPositionId ? (positions.find((x) => x.id === p.reportsToPositionId)?.title ?? "—") : "—";
        return [p.title, division, deptName, statusLbl, user, reportsTo];
      });

    autoTable(doc, {
      startY: 26,
      head: [["Position Title", "Division", "Department", "Status", "Assigned To", "Reports To"]],
      body,
      styles:          { fontSize: 8.5, cellPadding: 3 },
      headStyles:      { fillColor: [99, 102, 241], textColor: 255, fontStyle: "bold" },
      alternateRowStyles: { fillColor: [248, 249, 255] },
      columnStyles:    { 0: { cellWidth: 65 }, 1: { cellWidth: 38 }, 2: { cellWidth: 38 }, 3: { cellWidth: 22 }, 4: { cellWidth: 50 }, 5: { cellWidth: 50 } },
    });

    doc.save("org-chart.pdf");
  }, [positions, departmentsById]);

  // ─── Toolbar button style helpers ─────────────────────────────────────────────

  const btnBase = "flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm transition-colors";
  const btnNormal = `${btnBase} hover:bg-muted/40`;
  const btnActive = `${btnBase} bg-muted/40 text-foreground`;

  return (
    <OrgCtx.Provider value={ctx}>
      <div className="flex h-full flex-col gap-3">
        {/* ── Toolbar ── */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Search */}
          <div className="relative min-w-44 flex-1">
            <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search positions or people…"
              className="w-full rounded-md border bg-background py-1.5 pl-8 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>

          {/* Filters */}
          <select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            className="rounded-md border bg-background px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
          >
            <option value="">All Departments</option>
            {departments.filter((d) => d.status === "active").map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
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

          {/* Expand / Collapse */}
          <button type="button" onClick={expandAll} className={btnNormal}>
            <ChevronDown className="size-3.5" /> Expand all
          </button>
          <button type="button" onClick={collapseAll} className={btnNormal}>
            <ChevronUp className="size-3.5" /> Collapse all
          </button>

          {/* Fit View */}
          <button
            type="button"
            onClick={() => fitView({ duration: 400, padding: 0.12 })}
            className={btnNormal}
            title="Fit entire chart in view"
          >
            <Maximize2 className="size-3.5" /> Fit View
          </button>

          {/* Chart / Mind Map toggle */}
          <div className="flex rounded-md border overflow-hidden">
            <button
              type="button"
              onClick={() => setViewMode("chart")}
              className={cn("flex items-center gap-1.5 px-3 py-1.5 text-sm transition-colors",
                viewMode === "chart" ? "bg-primary text-primary-foreground" : "bg-background hover:bg-muted/40")}
            >
              <Network className="size-3.5" /> Chart
            </button>
            <button
              type="button"
              onClick={() => setViewMode("mindmap")}
              className={cn("flex items-center gap-1.5 px-3 py-1.5 text-sm transition-colors border-l",
                viewMode === "mindmap" ? "bg-primary text-primary-foreground" : "bg-background hover:bg-muted/40")}
            >
              <GitBranch className="size-3.5" /> Mind Map
            </button>
          </div>

          {/* Depts toggle */}
          <button
            type="button"
            onClick={() => setShowDeptGroups((v) => !v)}
            className={showDeptGroups ? btnActive : btnNormal}
            title={showDeptGroups ? "Hide department groups" : "Show department groups"}
          >
            <Layers className="size-3.5" />
            Depts
          </button>

          {/* Grid toggle */}
          <button
            type="button"
            onClick={toggleGrid}
            className={showGrid ? btnActive : btnNormal}
            title={showGrid ? "Hide grid" : "Show grid"}
            data-testid="grid-toggle"
          >
            <Grid3x3 className="size-3.5" />
            {showGrid ? "Grid" : "Grid"}
          </button>

          {/* Admin-only: Auto Align, Undo, Reset, Canvas mode, Import */}
          {isAdmin && (
            <>
              <button
                type="button"
                onClick={handleAutoAlign}
                className={`${btnNormal} text-primary hover:text-primary hover:bg-primary/10 border-primary/30`}
                title="Auto Align — recompute layout using reporting hierarchy. Previous layout saved for undo."
                data-testid="auto-align-btn"
              >
                <Wand2 className="size-3.5" /> Auto Align
              </button>

              <button
                type="button"
                onClick={handleUndoLayout}
                disabled={undoStack.length === 0}
                className={`${btnNormal} disabled:opacity-40 disabled:cursor-not-allowed`}
                title={undoStack.length > 0 ? `Undo layout (${undoStack.length} step${undoStack.length > 1 ? "s" : ""} available)` : "No layout changes to undo"}
                data-testid="undo-layout-btn"
              >
                <Undo2 className="size-3.5" /> Undo
              </button>

              {(layoutsById.size > 0 || combinedDeptLayouts.size > 0) && (
                <button
                  type="button"
                  onClick={handleResetLayout}
                  className={`${btnNormal} text-muted-foreground hover:text-destructive hover:border-destructive/30`}
                  title="Reset Layout — clear all saved positions and return to default dagre layout"
                >
                  <RotateCcw className="size-3.5" /> Reset
                </button>
              )}

              {/* Canvas mode toggle — Pan ↔ Select */}
              <div className="flex rounded-md border overflow-hidden">
                <button
                  type="button"
                  onClick={() => setCanvasMode("pan")}
                  title="Pan mode — drag to pan the canvas"
                  className={cn("flex items-center gap-1.5 px-2.5 py-1.5 text-sm transition-colors",
                    canvasMode === "pan" ? "bg-primary text-primary-foreground" : "bg-background hover:bg-muted/40")}
                >
                  <Hand className="size-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setCanvasMode("select")}
                  title="Select mode — drag to draw a selection box around multiple positions"
                  className={cn("flex items-center gap-1.5 px-2.5 py-1.5 text-sm transition-colors border-l",
                    canvasMode === "select" ? "bg-primary text-primary-foreground" : "bg-background hover:bg-muted/40")}
                >
                  <MousePointer2 className="size-3.5" />
                </button>
              </div>

              {/* Import CSV */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={importPending}
                className={`${btnNormal} disabled:opacity-50 disabled:cursor-not-allowed`}
                title="Import positions from CSV. Columns: Title (required), Department, Status"
              >
                <Upload className="size-3.5" />
                {importPending ? "Importing…" : "Import"}
              </button>
            </>
          )}

          {/* Export PDF — visible to all users */}
          <button
            type="button"
            onClick={handleExportPdf}
            className={btnNormal}
            title="Export org chart to PDF"
          >
            <Download className="size-3.5" /> Export
          </button>
        </div>

        {/* Admin hint */}
        {isAdmin && positions.length > 1 && (
          <p className="text-[11px] text-muted-foreground/60 px-0.5">
            <strong>Pan mode:</strong> drag to pan · <strong>Select mode:</strong> drag to draw selection box.
            Double-click a card to edit. Shift+Click or Ctrl+Click to add to selection.
            Click a dept box and drag handles to resize.
          </p>
        )}

        {/* Alignment toolbar — shown when 2+ position nodes are selected */}
        {isAdmin && selectedPositionIds.size >= 2 && (
          <div className="flex flex-wrap items-center gap-1 rounded-lg border border-primary/20 bg-primary/5 px-3 py-1.5">
            <span className="mr-1 text-[11px] font-medium text-muted-foreground">
              {selectedPositionIds.size} selected:
            </span>
            {([
              { op: "top",     Icon: AlignStartHorizontal,      label: "Align Top" },
              { op: "bottom",  Icon: AlignEndHorizontal,        label: "Align Bottom" },
              { op: "left",    Icon: AlignStartVertical,        label: "Align Left" },
              { op: "right",   Icon: AlignEndVertical,          label: "Align Right" },
              { op: "centerH", Icon: AlignCenterHorizontal,     label: "Center H" },
              { op: "centerV", Icon: AlignCenterVertical,       label: "Center V" },
              { op: "distH",   Icon: AlignHorizontalSpaceBetween, label: "Distribute H" },
              { op: "distV",   Icon: AlignVerticalSpaceBetween,   label: "Distribute V" },
            ] as const).map(({ op, Icon, label }) => (
              <button
                key={op}
                type="button"
                onClick={() => handleAlign(op as AlignOp)}
                title={label}
                className="flex items-center gap-1 rounded border border-transparent px-2 py-1 text-[11px] text-slate-600 transition-colors hover:border-primary/20 hover:bg-primary/10 hover:text-primary"
              >
                <Icon className="size-3.5 flex-none" />
                <span>{label}</span>
              </button>
            ))}
          </div>
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
              nodesDraggable={false}         // per-node `draggable` overrides this
              nodesConnectable={false}
              elementsSelectable={isAdmin}
              multiSelectionKeyCode={["Meta", "Control"]}
              selectionKeyCode="Shift"
              selectionOnDrag={isAdmin && canvasMode === "select"}
              selectionMode={SelectionMode.Partial}
              panOnDrag={canvasMode === "select" ? [1, 2] : true}
              snapToGrid
              snapGrid={[SNAP_GRID, SNAP_GRID]}
              onNodeDoubleClick={onNodeDoubleClick}
              onNodeDragStop={onNodeDragStop}
              onSelectionChange={onSelectionChange}
            >
              {showGrid && (
                <Background
                  variant={BackgroundVariant.Dots}
                  gap={20}
                  size={1.5}
                  color="#94a3b8"
                  data-testid="canvas-background"
                />
              )}
              <Controls position="bottom-right" showInteractive={false} />
            </ReactFlow>
          )}
        </div>
      </div>

      {/* Hidden file input for CSV import */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,.tsv,.txt"
        className="hidden"
        onChange={handleFileSelect}
      />
    </OrgCtx.Provider>
  );
}

// ─── Public export ────────────────────────────────────────────────────────────

export function OrgChartCanvas({
  positions,
  departments,
  layouts    = [],
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
