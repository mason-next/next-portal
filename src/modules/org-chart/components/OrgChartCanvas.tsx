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
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
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
} from "lucide-react";
import { useRouter } from "next/navigation";
import { swapOrgPositionOrder, swapOrgDepartmentOrder } from "../lib/actions";
import { cn } from "@/lib/utils";
import { UserAvatarImage } from "@/components/shared/AppShell/UserAvatarImage";
import type { OrgDepartment, OrgPosition } from "../lib/types";

// ─── Layout constants ─────────────────────────────────────────────────────────

const NODE_W = 215;
const NODE_H = 138;
const X_GAP  = 140;   // was 56 — wider sibling separation
const Y_GAP  = 100;   // was 72 — more space between levels

// Department group overlay
const LABEL_H  = 60;  // was 52
const PAD_H    = 44;  // was 28 — horizontal padding inside group box
const PAD_B    = 44;  // was 28 — bottom padding inside group box
const GROUP_GAP = 32; // min gap between dept group bounding boxes (nudge pass)

// Mind map layout
const MM_X_GAP = 80;  // horizontal gap between tree levels
const MM_Y_GAP = 24;  // vertical gap between sibling subtrees

// ─── Dept group nudge pass ────────────────────────────────────────────────────

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
): Node[] {
  const buckets = new Map<string, Array<{ x: number; y: number }>>();
  for (const n of positionNodes) {
    const dept = posById.get(n.id)?.departmentId;
    if (!dept) continue;
    if (!buckets.has(dept)) buckets.set(dept, []);
    buckets.get(dept)!.push(n.position);
  }

  const groups: Node[] = [];
  let groupIdx = 0;
  for (const dept of departments) {
    const pts = buckets.get(dept.id);
    if (!pts || pts.length === 0) continue;

    const minX = Math.min(...pts.map((p) => p.x));
    const minY = Math.min(...pts.map((p) => p.y));
    const maxX = Math.max(...pts.map((p) => p.x));
    const maxY = Math.max(...pts.map((p) => p.y));

    const w = maxX - minX + NODE_W + PAD_H * 2;
    const h = maxY - minY + NODE_H + LABEL_H + PAD_B;

    groups.push({
      id:         `dg-${dept.id}`,
      type:       "deptGroup",
      position:   { x: minX - PAD_H, y: minY - LABEL_H },
      style:      { width: w, height: h },
      data:       { label: dept.name, color: dept.color ?? "#6366f1", deptId: dept.id, deptIndex: groupIdx },
      zIndex:     -1,
      draggable:  false,
      selectable: false,
    });
    groupIdx++;
  }

  const nudged = nudgeDeptGroups(groups);
  const total = nudged.length;
  return nudged.map((g) => ({
    ...g,
    data: { ...(g.data as Record<string, unknown>), deptTotal: total },
  }));
}

// ─── Top-down tree layout ─────────────────────────────────────────────────────

function buildLayout(
  positions:   OrgPosition[],
  departments: OrgDepartment[],
  collapsed:   Set<string>,
): { nodes: Node[]; edges: Edge[] } {
  if (positions.length === 0) return { nodes: [], edges: [] };

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

  const subtreeW = new Map<string, number>();
  function calcWidth(id: string): number {
    const kids = collapsed.has(id) ? [] : (childrenOf.get(id) ?? []);
    if (kids.length === 0) { subtreeW.set(id, NODE_W); return NODE_W; }
    const total = kids.reduce((s, k) => s + calcWidth(k) + X_GAP, -X_GAP);
    const w     = Math.max(total, NODE_W);
    subtreeW.set(id, w);
    return w;
  }
  for (const r of roots) calcWidth(r);

  const xyMap = new Map<string, { x: number; y: number }>();
  function assign(id: string, left: number, y: number) {
    const w = subtreeW.get(id) ?? NODE_W;
    xyMap.set(id, { x: left + (w - NODE_W) / 2, y });
    if (collapsed.has(id)) return;
    const kids = childrenOf.get(id) ?? [];
    let cx = left;
    for (const kid of kids) {
      const kw = subtreeW.get(kid) ?? NODE_W;
      assign(kid, cx, y + NODE_H + Y_GAP);
      cx += kw + X_GAP;
    }
  }
  let rootLeft = 0;
  for (const r of roots) {
    assign(r, rootLeft, 0);
    rootLeft += (subtreeW.get(r) ?? NODE_W) + X_GAP * 2;
  }

  const visible = new Set<string>();
  function markVisible(id: string) {
    visible.add(id);
    if (!collapsed.has(id)) for (const k of childrenOf.get(id) ?? []) markVisible(k);
  }
  for (const r of roots) markVisible(r);

  const posById = new Map(positions.map((p) => [p.id, p]));
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  for (const [id, xy] of xyMap) {
    if (!visible.has(id)) continue;
    const pos  = posById.get(id)!;
    const kids = childrenOf.get(id) ?? [];

    nodes.push({
      id,
      type:       "orgPosition",
      position:   xy,
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

  const deptGroups = buildDeptGroups(nodes, posById, departments);
  return { nodes: [...deptGroups, ...nodes], edges };
}

// ─── Left-to-right mind map layout ───────────────────────────────────────────

function buildMindMapLayout(
  positions:   OrgPosition[],
  departments: OrgDepartment[],
  collapsed:   Set<string>,
): { nodes: Node[]; edges: Edge[] } {
  if (positions.length === 0) return { nodes: [], edges: [] };

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
    rootY += rh + Y_GAP;
  }

  const visible = new Set<string>();
  function markVisible(id: string) {
    visible.add(id);
    if (!collapsed.has(id)) for (const k of childrenOf.get(id) ?? []) markVisible(k);
  }
  for (const r of roots) markVisible(r);

  const posById = new Map(positions.map((p) => [p.id, p]));
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  for (const [id, xy] of xyMap) {
    if (!visible.has(id)) continue;
    const pos  = posById.get(id)!;
    const kids = childrenOf.get(id) ?? [];

    nodes.push({
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

  const deptGroups = buildDeptGroups(nodes, posById, departments);
  return { nodes: [...deptGroups, ...nodes], edges };
}

// ─── Context ──────────────────────────────────────────────────────────────────

const OrgCtx = createContext<{
  onEdit?:         (p: OrgPosition) => void;
  onAdd?:          (reportsToId: string) => void;
  onToggle:        (id: string) => void;
  onReorder?:      (id: string, dir: "left" | "right") => void;
  onDeptReorder?:  (deptId: string, dir: "left" | "right") => void;
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

function PositionNode({ data, id }: NodeProps) {
  const { onEdit, onAdd, onToggle, onReorder, positionsById, departmentsById, isAdmin, viewMode } = useContext(OrgCtx);
  const d = data as unknown as PositionNodeData;
  const { positionId, childCount, isCollapsed } = d;

  const position = positionsById.get(positionId)!;
  if (!position) return null;

  const primary   = position.assignments.find((a) => a.isActive && a.assignmentType === "primary");
  const isVacant  = !primary?.user;
  const isPlanned = position.status === "planned";
  const st        = STATUS[position.status] ?? STATUS.inactive;

  // Department color drives the top accent bar
  const deptColor = position.departmentId
    ? (departmentsById.get(position.departmentId)?.color ?? "#6366f1")
    : "#e2e8f0";

  const displayName = primary?.user?.name
    ?? (isPlanned ? "— Planned —" : "— Vacant —");

  const isMindmap = viewMode === "mindmap";

  const siblings = useMemo(() => {
    if (!isAdmin || !onReorder) return [];
    const parentKey = position.reportsToPositionId ?? "__root__";
    return [...positionsById.values()]
      .filter((p) => (p.reportsToPositionId ?? "__root__") === parentKey)
      .sort((a, b) => {
        if (a.sortOrder == null && b.sortOrder == null) return a.createdAt < b.createdAt ? -1 : 1;
        if (a.sortOrder == null) return 1;
        if (b.sortOrder == null) return -1;
        return a.sortOrder - b.sortOrder;
      });
  }, [isAdmin, onReorder, position, positionsById]);

  const siblingIdx   = siblings.findIndex((p) => p.id === position.id);
  const canMoveLeft  = isAdmin && siblingIdx > 0;
  const canMoveRight = isAdmin && siblingIdx >= 0 && siblingIdx < siblings.length - 1;
  const showReorder  = isAdmin && (canMoveLeft || canMoveRight);

  return (
    <div
      className={cn("relative", onEdit ? "cursor-pointer" : "cursor-default")}
      style={{ width: NODE_W }}
      onClick={() => onEdit?.(position)}
    >
      {/* Sibling reorder arrows */}
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

      {/* Expand / collapse badge — below card in chart mode, right side in mind map */}
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

      {/* Invisible connection handles — chart mode (top / bottom) */}
      <Handle id="tgt-top"    type="target" position={Position.Top}    style={{ opacity: 0, pointerEvents: "none" }} />
      <Handle id="src-bottom" type="source" position={Position.Bottom} style={{ opacity: 0, pointerEvents: "none" }} />

      {/* Invisible connection handles — mind map mode (left / right) */}
      <Handle id="tgt-left"  type="target" position={Position.Left}  style={{ opacity: 0, pointerEvents: "none" }} />
      <Handle id="src-right" type="source" position={Position.Right} style={{ opacity: 0, pointerEvents: "none" }} />
    </div>
  );
}

// ─── Department group container node ─────────────────────────────────────────

function DeptGroupNode({ data }: NodeProps) {
  const { label, color, deptId, deptIndex, deptTotal } = data as {
    label: string; color: string; deptId: string; deptIndex: number; deptTotal: number;
  };
  const { onDeptReorder, isAdmin } = useContext(OrgCtx);
  const c = color ?? "#6366f1";
  const canMoveLeft  = isAdmin && deptIndex > 0;
  const canMoveRight = isAdmin && deptIndex < (deptTotal - 1);

  return (
    <div className="relative h-full w-full">
      {/* Background (non-interactive) */}
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
        </div>
      </div>

      {/* Admin department reorder controls — pointer-events enabled */}
      {isAdmin && (canMoveLeft || canMoveRight) && onDeptReorder && (
        <div className="absolute top-2 right-2 z-10 flex gap-1">
          <button
            type="button"
            disabled={!canMoveLeft}
            onClick={() => onDeptReorder(deptId, "left")}
            className="flex h-5 w-5 items-center justify-center rounded border border-slate-200 bg-white/90 shadow-sm text-slate-400 hover:text-slate-700 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
            title="Move department left"
            style={{ pointerEvents: "all" }}
          >
            <ChevronLeft className="size-3" />
          </button>
          <button
            type="button"
            disabled={!canMoveRight}
            onClick={() => onDeptReorder(deptId, "right")}
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
  onEdit,
  onAdd,
  isAdmin,
}: {
  positions:   OrgPosition[];
  departments: OrgDepartment[];
  onEdit?:     (p: OrgPosition) => void;
  onAdd?:      (reportsToId: string) => void;
  isAdmin:     boolean;
}) {
  const { fitView } = useReactFlow();
  const router = useRouter();
  const [, startTransition] = useTransition();

  const [collapsed,    setCollapsed]    = useState<Set<string>>(new Set());
  const [search,       setSearch]       = useState("");
  const [deptFilter,   setDeptFilter]   = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [viewMode,     setViewMode]     = useState<"chart" | "mindmap">("chart");

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

  // Position sibling reorder
  const onReorder = useCallback((id: string, dir: "left" | "right") => {
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
  }, [positionsById, router, startTransition]);

  // Department order reorder
  const onDeptReorder = useCallback((deptId: string, dir: "left" | "right") => {
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
  }, [departments, router, startTransition]);

  const ctx = useMemo(
    () => ({
      onEdit,
      onAdd,
      onToggle,
      onReorder:     isAdmin ? onReorder     : undefined,
      onDeptReorder: isAdmin ? onDeptReorder : undefined,
      positionsById,
      departmentsById,
      isAdmin,
      viewMode,
    }),
    [onEdit, onAdd, onToggle, onReorder, onDeptReorder, positionsById, departmentsById, isAdmin, viewMode],
  );

  const layout = useMemo(
    () => viewMode === "mindmap"
      ? buildMindMapLayout(positions, departments, collapsed)
      : buildLayout(positions, departments, collapsed),
    [positions, departments, collapsed, viewMode],
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
    return new Set(
      layout.nodes
        .filter((n) => !n.id.startsWith("dg-") && !matched.has(n.id))
        .map((n) => n.id),
    );
  }, [positions, layout.nodes, search, deptFilter, statusFilter]);

  const displayNodes = useMemo(() => {
    if (dimmedIds.size === 0) return layout.nodes;
    return layout.nodes.map((n) => ({
      ...n,
      style: {
        ...n.style,
        opacity:    dimmedIds.has(n.id) ? 0.18 : 1,
        transition: "opacity 0.15s",
      },
    }));
  }, [layout.nodes, dimmedIds]);

  const [nodes, setNodes, onNodesChange] = useNodesState(displayNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(layout.edges);

  useEffect(() => { setNodes(displayNodes); }, [displayNodes, setNodes]);
  useEffect(() => { setEdges(layout.edges); }, [layout.edges, setEdges]);
  useEffect(() => {
    const t = setTimeout(() => fitView({ duration: 350, padding: 0.12 }), 60);
    return () => clearTimeout(t);
  }, [layout, fitView]);

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
        </div>

        {/* Admin hint */}
        {isAdmin && positions.length > 1 && (
          <p className="text-[11px] text-muted-foreground/70 px-0.5">
            Use ← → arrows to reorder siblings. Click any card to edit. Use + to add a direct report.
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
              edges={edges}
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
              elementsSelectable={false}
              onNodeClick={onNodeClick}
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
  onEdit,
  onAdd,
  isAdmin = false,
}: {
  positions:   OrgPosition[];
  departments: OrgDepartment[];
  onEdit?:     (p: OrgPosition) => void;
  onAdd?:      (reportsToId: string) => void;
  isAdmin?:    boolean;
}) {
  return (
    <ReactFlowProvider>
      <OrgChartInner
        positions={positions}
        departments={departments}
        onEdit={onEdit}
        onAdd={onAdd}
        isAdmin={isAdmin}
      />
    </ReactFlowProvider>
  );
}
