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
  type OnNodeDrag,
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
} from "lucide-react";
import { useRouter } from "next/navigation";
import { swapOrgPositionOrder, reparentOrgPosition } from "../lib/actions";
import { cn } from "@/lib/utils";
import { UserAvatarImage } from "@/components/shared/AppShell/UserAvatarImage";
import type { OrgDepartment, OrgPosition } from "../lib/types";

// ─── Layout constants ─────────────────────────────────────────────────────────

const NODE_W = 215;
const NODE_H = 138;
const X_GAP  = 56;
const Y_GAP  = 72;

// Drop threshold: center-to-center distance at which a drag target is recognized
const DROP_DIST = NODE_W;

// ─── Department group layout ──────────────────────────────────────────────────

const LABEL_H  = 52;
const PAD_H    = 28;
const PAD_B    = 28;

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
      data:       { label: dept.name, color: dept.color ?? "#6366f1" },
      zIndex:     -1,
      draggable:  false,
      selectable: false,
    });
  }
  return groups;
}

// ─── Tree layout algorithm ─────────────────────────────────────────────────────

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
      type:      "orgPosition",
      position:  xy,
      data:      { positionId: id, childCount: kids.length, isCollapsed: collapsed.has(id) },
      style:     { overflow: "visible" },
      draggable: false,   // overridden per-node when isAdmin (see OrgChartInner)
      selectable: false,
    });

    if (pos.reportsToPositionId && visible.has(pos.reportsToPositionId)) {
      edges.push({
        id:    `e:${pos.reportsToPositionId}→${id}`,
        source: pos.reportsToPositionId,
        target: id,
        type:  "smoothstep",
        style: { stroke: "#cbd5e1", strokeWidth: 1.5 },
      });
    }
  }

  const deptGroups = buildDeptGroups(nodes, posById, departments);
  return { nodes: [...deptGroups, ...nodes], edges };
}

// ─── Context ──────────────────────────────────────────────────────────────────

const OrgCtx = createContext<{
  onEdit?:        (p: OrgPosition) => void;
  onAdd?:         (reportsToId: string) => void;
  onToggle:       (id: string) => void;
  onReorder?:     (id: string, dir: "left" | "right") => void;
  positionsById:  Map<string, OrgPosition>;
  isAdmin:        boolean;
  dropTargetId:   string | null;
}>({ onToggle: () => {}, positionsById: new Map(), isAdmin: false, dropTargetId: null });

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS: Record<string, { bar: string; dot: string; label: string }> = {
  filled:   { bar: "bg-emerald-500", dot: "bg-emerald-500", label: "Filled"   },
  open:     { bar: "bg-amber-400",   dot: "bg-amber-400",   label: "Open"     },
  planned:  { bar: "bg-blue-400",    dot: "bg-blue-400",    label: "Planned"  },
  inactive: { bar: "bg-slate-300",   dot: "bg-slate-300",   label: "Inactive" },
};

// ─── Position card node ───────────────────────────────────────────────────────

type PositionNodeData = {
  positionId:  string;
  childCount:  number;
  isCollapsed: boolean;
};

function PositionNode({ data, id }: NodeProps) {
  const { onEdit, onAdd, onToggle, onReorder, positionsById, isAdmin, dropTargetId } = useContext(OrgCtx);
  const d = data as unknown as PositionNodeData;
  const { positionId, childCount, isCollapsed } = d;

  const position = positionsById.get(positionId)!;
  if (!position) return null;

  const primary   = position.assignments.find((a) => a.isActive && a.assignmentType === "primary");
  const isVacant  = !primary?.user;
  const isPlanned = position.status === "planned";
  const st        = STATUS[position.status] ?? STATUS.inactive;

  const displayName = primary?.user?.name
    ?? (isPlanned ? "— Planned —" : "— Vacant —");

  const isDropTarget = dropTargetId === positionId;

  // Siblings for reorder (admin only)
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

  const siblingIdx    = siblings.findIndex((p) => p.id === position.id);
  const canMoveLeft   = isAdmin && siblingIdx > 0;
  const canMoveRight  = isAdmin && siblingIdx >= 0 && siblingIdx < siblings.length - 1;
  const showReorder   = isAdmin && (canMoveLeft || canMoveRight);

  return (
    <div
      className={cn("relative group", onEdit ? "cursor-pointer" : "cursor-default")}
      style={{ width: NODE_W }}
      onClick={() => onEdit?.(position)}
    >
      {/* Admin reorder arrows — always visible for admin when siblings exist */}
      {showReorder && (
        <div className="absolute -top-7 left-0 right-0 flex justify-center gap-1 z-30">
          <button
            type="button"
            disabled={!canMoveLeft}
            onClick={(e) => { e.stopPropagation(); onReorder?.(position.id, "left"); }}
            className="flex h-5 w-5 items-center justify-center rounded border border-slate-200 bg-white shadow-sm text-slate-400 hover:text-slate-700 hover:border-slate-300 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
            title="Move left"
          >
            <ChevronLeft className="size-3" />
          </button>
          <button
            type="button"
            disabled={!canMoveRight}
            onClick={(e) => { e.stopPropagation(); onReorder?.(position.id, "right"); }}
            className="flex h-5 w-5 items-center justify-center rounded border border-slate-200 bg-white shadow-sm text-slate-400 hover:text-slate-700 hover:border-slate-300 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
            title="Move right"
          >
            <ChevronRight className="size-3" />
          </button>
        </div>
      )}

      {/* White card — highlighted when it's the drag-to-reparent drop target */}
      <div className={cn(
        "rounded-xl border bg-white shadow-sm transition-all",
        isDropTarget
          ? "border-primary ring-2 ring-primary/30 shadow-md"
          : "border-slate-200 hover:shadow-md",
      )}>
        {/* Colored status accent bar */}
        <div className={cn("h-1.5 w-full rounded-t-xl", st.bar)} />

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
            <span className="mt-1.5 inline-block max-w-full truncate rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500">
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
          className="absolute bottom-0 left-1/2 z-20 flex -translate-x-1/2 translate-y-1/2 items-center gap-0.5 rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-500 shadow-sm hover:bg-slate-50"
          onClick={(e) => { e.stopPropagation(); onToggle(id); }}
        >
          {childCount}
          {isCollapsed ? <ChevronDown className="size-2.5" /> : <ChevronUp className="size-2.5" />}
        </button>
      )}

      {/* Admin: "+" add direct report button */}
      {isAdmin && onAdd && (
        <button
          type="button"
          title="Add direct report"
          onClick={(e) => { e.stopPropagation(); onAdd(position.id); }}
          className="absolute -bottom-2 -right-2 z-30 flex size-6 items-center justify-center rounded-full border-2 border-white bg-emerald-500 shadow-md text-white hover:bg-emerald-600 transition-colors"
        >
          <Plus className="size-3.5" />
        </button>
      )}

      <Handle type="target" position={Position.Top}    style={{ opacity: 0, pointerEvents: "none" }} />
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0, pointerEvents: "none" }} />
    </div>
  );
}

// ─── Department group container node ─────────────────────────────────────────

function DeptGroupNode({ data }: NodeProps) {
  const { label, color } = data as { label: string; color: string };
  const c = color ?? "#6366f1";
  return (
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
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);

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

  // Sibling reorder: swap sort_order values atomically
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
    const myOrder    = pos.sortOrder    ?? idx;
    const otherOrder = other.sortOrder  ?? targetIdx;
    startTransition(async () => {
      await swapOrgPositionOrder(id, myOrder, other.id, otherOrder);
      router.refresh();
    });
  }, [positionsById, router, startTransition]);

  const ctx = useMemo(
    () => ({ onEdit, onAdd, onToggle, onReorder: isAdmin ? onReorder : undefined, positionsById, isAdmin, dropTargetId }),
    [onEdit, onAdd, onToggle, onReorder, positionsById, isAdmin, dropTargetId],
  );

  // Build base layout
  const layout = useMemo(
    () => buildLayout(positions, departments, collapsed),
    [positions, departments, collapsed],
  );

  // Dim nodes that don't match active filters
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

  // For admin: enable dragging on position nodes
  const displayNodes = useMemo(() => {
    const withDim = dimmedIds.size === 0
      ? layout.nodes
      : layout.nodes.map((n) => ({
          ...n,
          style: {
            ...n.style,
            opacity:    dimmedIds.has(n.id) ? 0.18 : 1,
            transition: "opacity 0.15s",
          },
        }));

    if (!isAdmin) return withDim;
    return withDim.map((n) => ({
      ...n,
      draggable: n.type === "orgPosition",
    }));
  }, [layout.nodes, dimmedIds, isAdmin]);

  const [nodes, setNodes, onNodesChange] = useNodesState(displayNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(layout.edges);

  useEffect(() => { setNodes(displayNodes); }, [displayNodes, setNodes]);
  useEffect(() => { setEdges(layout.edges); }, [layout.edges, setEdges]);
  useEffect(() => {
    const t = setTimeout(() => fitView({ duration: 350, padding: 0.12 }), 60);
    return () => clearTimeout(t);
  }, [layout, fitView]);

  // Collapse-all helper
  const parentIds = useMemo(
    () => new Set(positions.filter((p) => positions.some((q) => q.reportsToPositionId === p.id)).map((p) => p.id)),
    [positions],
  );

  function expandAll()   { setCollapsed(new Set()); }
  function collapseAll() { setCollapsed(new Set(parentIds)); }

  // ── Drag-to-reparent helpers ────────────────────────────────────────────────

  // Compute the set of all descendants of a given position id
  function getDescendants(id: string): Set<string> {
    const result = new Set<string>();
    function walk(cur: string) {
      for (const p of positionsById.values()) {
        if (p.reportsToPositionId === cur) { result.add(p.id); walk(p.id); }
      }
    }
    walk(id);
    return result;
  }

  // Find the closest valid drop-target node given a dragged node's position
  function findDropTarget(
    draggedId: string,
    dragPos: { x: number; y: number },
    currentNodes: Node[],
  ): string | null {
    const descendants = getDescendants(draggedId);
    const cx = dragPos.x + NODE_W / 2;
    const cy = dragPos.y + NODE_H / 2;

    let best: string | null = null;
    let bestDist = DROP_DIST;

    for (const n of currentNodes) {
      if (n.id === draggedId || n.id.startsWith("dg-") || descendants.has(n.id)) continue;
      const nx = n.position.x + NODE_W / 2;
      const ny = n.position.y + NODE_H / 2;
      const dist = Math.sqrt((cx - nx) ** 2 + (cy - ny) ** 2);
      if (dist < bestDist) { bestDist = dist; best = n.id; }
    }
    return best;
  }

  const onNodeDrag: OnNodeDrag<Node> = useCallback((_event, draggedNode) => {
    if (!isAdmin || draggedNode.id.startsWith("dg-")) return;
    const target = findDropTarget(draggedNode.id, draggedNode.position, nodes);
    setDropTargetId(target);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, nodes, positionsById]);

  const onNodeDragStop: OnNodeDrag<Node> = useCallback((_event, draggedNode) => {
    setDropTargetId(null);
    if (!isAdmin || draggedNode.id.startsWith("dg-")) {
      router.refresh();
      return;
    }

    const newParentId = findDropTarget(draggedNode.id, draggedNode.position, nodes);
    const currentParentId = positionsById.get(draggedNode.id)?.reportsToPositionId ?? null;

    if (newParentId === null || newParentId === currentParentId) {
      // No-op or dropped far from everything: just restore layout
      router.refresh();
      return;
    }

    startTransition(async () => {
      await reparentOrgPosition(draggedNode.id, newParentId);
      router.refresh();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, nodes, positionsById, router, startTransition]);

  // ── Node click via ReactFlow API (most reliable path) ──────────────────────
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
        </div>

        {/* Admin drag hint */}
        {isAdmin && positions.length > 1 && (
          <p className="text-[11px] text-muted-foreground/70 px-0.5">
            Drag a card onto another to change its parent. Use ← → to reorder siblings. Click any card to edit.
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
              nodesDraggable={isAdmin}
              nodesConnectable={false}
              elementsSelectable={false}
              onNodeClick={onNodeClick}
              onNodeDrag={isAdmin ? onNodeDrag : undefined}
              onNodeDragStop={isAdmin ? onNodeDragStop : undefined}
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
