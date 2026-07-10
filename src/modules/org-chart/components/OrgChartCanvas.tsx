"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
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
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  ChevronDown,
  ChevronUp,
  Maximize2,
  Search,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { UserAvatarImage } from "@/components/shared/AppShell/UserAvatarImage";
import type { OrgDepartment, OrgPosition } from "../lib/types";

// ─── Layout constants ─────────────────────────────────────────────────────────

const NODE_W = 215;
const NODE_H = 138; // approximate rendered height used for vertical spacing
const X_GAP  = 56;
const Y_GAP  = 72;

// ─── Tree layout algorithm ─────────────────────────────────────────────────────

function buildLayout(
  positions: OrgPosition[],
  collapsed: Set<string>,
): { nodes: Node[]; edges: Edge[] } {
  if (positions.length === 0) return { nodes: [], edges: [] };

  const idSet     = new Set(positions.map((p) => p.id));
  const childrenOf = new Map<string, string[]>(positions.map((p) => [p.id, []]));

  for (const p of positions) {
    if (p.reportsToPositionId && idSet.has(p.reportsToPositionId)) {
      childrenOf.get(p.reportsToPositionId)!.push(p.id);
    }
  }

  const roots = positions
    .filter((p) => !p.reportsToPositionId || !idSet.has(p.reportsToPositionId))
    .map((p) => p.id);

  // Compute subtree widths (DFS, respects collapsed state)
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

  // Assign x,y coordinates
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

  // Determine visible nodes (parents in collapsed set hide their subtrees)
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
      type: "orgPosition",
      position: xy,
      data: {
        position: pos,
        childCount:  kids.length,
        isCollapsed: collapsed.has(id),
      },
      style:    { overflow: "visible" },
      draggable: false,
      selectable: false,
    });

    if (pos.reportsToPositionId && visible.has(pos.reportsToPositionId)) {
      edges.push({
        id:     `e:${pos.reportsToPositionId}→${id}`,
        source:  pos.reportsToPositionId,
        target:  id,
        type:   "smoothstep",
        style:  { stroke: "#cbd5e1", strokeWidth: 1.5 },
      });
    }
  }

  return { nodes, edges };
}

// ─── Callbacks context (avoids passing fns through React Flow node data) ───────

const OrgCtx = createContext<{
  onEdit:   (p: OrgPosition) => void;
  onToggle: (id: string)     => void;
}>({ onEdit: () => {}, onToggle: () => {} });

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS: Record<string, { bar: string; dot: string; label: string }> = {
  filled:   { bar: "bg-emerald-500", dot: "bg-emerald-500", label: "Filled"   },
  open:     { bar: "bg-amber-400",   dot: "bg-amber-400",   label: "Open"     },
  planned:  { bar: "bg-blue-400",    dot: "bg-blue-400",    label: "Planned"  },
  inactive: { bar: "bg-slate-300",   dot: "bg-slate-300",   label: "Inactive" },
};

// ─── Position card node ───────────────────────────────────────────────────────

type PositionNodeData = {
  position:    OrgPosition;
  childCount:  number;
  isCollapsed: boolean;
};

function PositionNode({ data, id }: NodeProps) {
  const { onEdit, onToggle } = useContext(OrgCtx);
  const d = data as unknown as PositionNodeData;
  const { position, childCount, isCollapsed } = d;

  const primary   = position.assignments.find((a) => a.isActive && a.assignmentType === "primary");
  const isVacant  = !primary?.user;
  const isPlanned = position.status === "planned";
  const st        = STATUS[position.status] ?? STATUS.inactive;

  const displayName = primary?.user?.name
    ?? (isPlanned ? "— Planned —" : "— Vacant —");

  return (
    <div
      className="relative cursor-pointer"
      style={{ width: NODE_W }}
      onClick={() => onEdit(position)}
    >
      {/* White card */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md">
        {/* Colored status accent bar */}
        <div className={cn("h-1.5 w-full rounded-t-xl", st.bar)} />

        {/* Avatar — floats up overlapping the accent bar */}
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

      {/* Expand / collapse badge — sits below the card */}
      {childCount > 0 && (
        <button
          type="button"
          className="absolute bottom-0 left-1/2 z-20 flex -translate-x-1/2 translate-y-1/2 items-center gap-0.5 rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-500 shadow-sm hover:bg-slate-50"
          onClick={(e) => { e.stopPropagation(); onToggle(id); }}
        >
          {childCount}
          {isCollapsed
            ? <ChevronDown className="size-2.5" />
            : <ChevronUp   className="size-2.5" />}
        </button>
      )}

      <Handle type="target" position={Position.Top}    style={{ opacity: 0, pointerEvents: "none" }} />
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0, pointerEvents: "none" }} />
    </div>
  );
}

const NODE_TYPES = { orgPosition: PositionNode };

// ─── Inner canvas (must be inside ReactFlowProvider) ──────────────────────────

function OrgChartInner({
  positions,
  departments,
  onEdit,
}: {
  positions:   OrgPosition[];
  departments: OrgDepartment[];
  onEdit:      (p: OrgPosition) => void;
}) {
  const { fitView } = useReactFlow();

  const [collapsed,    setCollapsed]    = useState<Set<string>>(new Set());
  const [search,       setSearch]       = useState("");
  const [deptFilter,   setDeptFilter]   = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const onToggle = useCallback((id: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const ctx = useMemo(() => ({ onEdit, onToggle }), [onEdit, onToggle]);

  // Compute layout from positions + collapsed state
  const layout = useMemo(() => buildLayout(positions, collapsed), [positions, collapsed]);

  // Compute which nodes to dim based on active filters
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
    return new Set(layout.nodes.filter((n) => !matched.has(n.id)).map((n) => n.id));
  }, [positions, layout.nodes, search, deptFilter, statusFilter]);

  const displayNodes = useMemo(
    () =>
      dimmedIds.size === 0
        ? layout.nodes
        : layout.nodes.map((n) => ({
            ...n,
            style: {
              ...n.style,
              opacity:    dimmedIds.has(n.id) ? 0.18 : 1,
              transition: "opacity 0.15s",
            },
          })),
    [layout.nodes, dimmedIds],
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(displayNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(layout.edges);

  useEffect(() => { setNodes(displayNodes);   }, [displayNodes, setNodes]);
  useEffect(() => { setEdges(layout.edges);   }, [layout.edges, setEdges]);
  useEffect(() => {
    const t = setTimeout(() => fitView({ duration: 350, padding: 0.12 }), 60);
    return () => clearTimeout(t);
  }, [layout, fitView]);

  // Compute the set of nodes that have children (for collapse-all)
  const parentIds = useMemo(
    () => new Set(positions.filter((p) => positions.some((q) => q.reportsToPositionId === p.id)).map((p) => p.id)),
    [positions],
  );

  function expandAll()   { setCollapsed(new Set()); }
  function collapseAll() { setCollapsed(new Set(parentIds)); }

  return (
    <OrgCtx.Provider value={ctx}>
      <div className="flex h-full flex-col gap-3">
        {/* ── Toolbar ── */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Search */}
          <div className="relative min-w-48 flex-1">
            <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search positions or people…"
              className="w-full rounded-md border bg-background py-1.5 pl-8 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>

          {/* Department filter */}
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

          {/* Status filter */}
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

          {/* Expand / collapse all */}
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

          {/* Fit view */}
          <button
            type="button"
            onClick={() => fitView({ duration: 400, padding: 0.12 })}
            className="flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm transition-colors hover:bg-muted/40"
          >
            <Maximize2 className="size-3.5" /> Fit view
          </button>
        </div>

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
            >
              <Background
                variant={BackgroundVariant.Dots}
                gap={22}
                size={1}
                color="#e2e8f0"
              />
              <Controls position="bottom-right" showInteractive={false} />
            </ReactFlow>
          )}
        </div>
      </div>
    </OrgCtx.Provider>
  );
}

// ─── Public export (wraps in ReactFlowProvider) ────────────────────────────────

export function OrgChartCanvas({
  positions,
  departments,
  onEdit,
}: {
  positions:   OrgPosition[];
  departments: OrgDepartment[];
  onEdit:      (p: OrgPosition) => void;
}) {
  return (
    <ReactFlowProvider>
      <OrgChartInner
        positions={positions}
        departments={departments}
        onEdit={onEdit}
      />
    </ReactFlowProvider>
  );
}
