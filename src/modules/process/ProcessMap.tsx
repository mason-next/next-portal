'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Circle,
  GitFork,
  Info,
  Layers,
  Menu,
  Minus,
  Plus,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  WORKFLOW,
  ALL_ROLES,
  flattenWorkflow,
  groupByMilestone,
  getNodeTitle,
  type DecisionNode,
  type MilestoneNode,
  type ParallelNode,
  type Role,
  type StageNode,
  type TaskNode,
  type WorkflowNode,
} from './process-workflow';
import { InfoModal } from './InfoModal';

// ─── Constants ────────────────────────────────────────────────────────────────

const ZOOM_MIN = 0.1;
const ZOOM_MAX = 2.5;
const ZOOM_THRESHOLD = 0.5;
const LANE_W = 220;
const LANE_GAP = 16;
const COL_BASE_W = 620;
const COL_PAD_X = 40;
const BUCKET_GAP = 64;
// Approx: column pt-8 (32px) + half of milestone banner height (~34px)
const CONNECTOR_TOP = 66;
const FLUID_H = 48;     // default bezier connector height between nodes

function parallelSvgW(laneCount: number): number {
  return laneCount * LANE_W + (laneCount - 1) * LANE_GAP;
}

function getBucketWidth(nodes: WorkflowNode[]): number {
  let w = COL_BASE_W;
  for (const n of nodes) {
    if (n.type === 'parallel') {
      w = Math.max(w, parallelSvgW((n as ParallelNode).lanes.length) + COL_PAD_X * 2);
    }
  }
  return w;
}

// ─── Context ──────────────────────────────────────────────────────────────────

interface ProcessCtxValue {
  expandedTaskId: string | null;
  highlightedDecisions: Map<string, 'A' | 'B'>;
  activeRoles: Set<string>;
  currentNodeId: string | null;
  interactive: boolean;
  registerNode: (id: string, el: HTMLElement | null) => void;
  onTaskClick: (id: string) => void;
  onDecisionOption: (decisionId: string, option: 'A' | 'B' | null) => void;
  onNodeClick: (id: string) => void;
}

const ProcessCtx = createContext<ProcessCtxValue>(null!);
const useProcess = () => useContext(ProcessCtx);

// ─── FluidConnector ───────────────────────────────────────────────────────────

// Bezier S-curve that connects two adjacent nodes in the flow.
// Replaces rigid straight-line stubs with an organic, comfortable connector.
function FluidConnector({ height = FLUID_H }: { height?: number }) {
  const cx = 8;    // half of SVG width
  const dx = 3.5;  // lateral variation that creates the gentle S-curve
  const h = height;
  const d = `M ${cx} 0 C ${cx + dx} ${h / 3}, ${cx - dx} ${(h * 2) / 3}, ${cx} ${h}`;
  return (
    <svg
      width={cx * 2}
      height={h}
      aria-hidden
      className="block mx-auto text-border shrink-0 overflow-visible"
    >
      <path d={d} stroke="currentColor" strokeWidth={1.5} fill="none" strokeLinecap="round" />
    </svg>
  );
}

// Straight spine used only inside parallel lanes (where bezier height isn't deterministic).
function Spine() {
  return (
    <div
      aria-hidden
      className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-0.5 bg-border pointer-events-none"
    />
  );
}

// ─── Role badge ───────────────────────────────────────────────────────────────

function RoleBadge({ role }: { role: Role }) {
  return (
    <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium bg-muted text-muted-foreground border">
      {role}
    </span>
  );
}

// ─── Parallel fan SVG ─────────────────────────────────────────────────────────

function ParallelFanSVG({
  laneCount,
  direction,
}: {
  laneCount: number;
  direction: 'out' | 'in';
}) {
  const svgW = parallelSvgW(laneCount);
  const h = 36;
  const cx = svgW / 2;
  const laneCenters = Array.from(
    { length: laneCount },
    (_, i) => i * (LANE_W + LANE_GAP) + LANE_W / 2,
  );

  return (
    <svg
      width={svgW}
      height={h}
      className="block shrink-0 text-border overflow-visible"
    >
      {laneCenters.map((lx, i) => {
        const d =
          direction === 'out'
            ? `M ${cx} 0 C ${cx} ${h / 2}, ${lx} ${h / 2}, ${lx} ${h}`
            : `M ${lx} 0 C ${lx} ${h / 2}, ${cx} ${h / 2}, ${cx} ${h}`;
        return <path key={i} d={d} stroke="currentColor" strokeWidth={1.5} fill="none" />;
      })}
    </svg>
  );
}

// ─── Node renderers ───────────────────────────────────────────────────────────

function MilestoneNodeRenderer({ node }: { node: MilestoneNode }) {
  const { registerNode, onNodeClick, currentNodeId } = useProcess();
  const isCurrent = currentNodeId === node.id;

  return (
    <div
      ref={(el) => registerNode(node.id, el)}
      onClick={() => onNodeClick(node.id)}
      className={cn(
        'w-full cursor-pointer rounded-xl border-2 px-6 py-4 flex items-center gap-4 transition-all hover:shadow-md',
        'bg-amber-50 border-amber-300 hover:border-amber-400',
        isCurrent && 'ring-2 ring-amber-500 ring-offset-2',
      )}
    >
      <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-amber-400 text-white font-bold text-sm">
        {node.number}
      </div>
      <div>
        <div className="text-[10px] font-semibold text-amber-600 uppercase tracking-widest">
          Milestone {node.number}
        </div>
        <div className="text-sm font-semibold text-amber-900 leading-tight">{node.title}</div>
      </div>
    </div>
  );
}

function StageNodeRenderer({ node }: { node: StageNode }) {
  const { registerNode, onNodeClick, currentNodeId } = useProcess();
  const isCurrent = currentNodeId === node.id;

  return (
    <div
      ref={(el) => registerNode(node.id, el)}
      onClick={() => onNodeClick(node.id)}
      className={cn(
        'w-full cursor-pointer rounded-lg px-4 py-2.5 transition-colors bg-background hover:bg-muted/50',
        isCurrent && 'bg-muted',
      )}
    >
      <div className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
        {node.title}
      </div>
      {node.meta && (
        <div className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{node.meta}</div>
      )}
    </div>
  );
}

function TaskNodeRenderer({
  node,
  context = 'main',
}: {
  node: TaskNode;
  context?: 'main' | 'lane' | 'branch';
}) {
  const {
    expandedTaskId,
    activeRoles,
    currentNodeId,
    interactive,
    registerNode,
    onTaskClick,
    onNodeClick,
  } = useProcess();
  const isExpanded = expandedTaskId === node.id;
  const isCurrent = currentNodeId === node.id;
  const isDimmed = activeRoles.size > 0 && !node.roles.some((r) => activeRoles.has(r));

  function handleClick(e: React.MouseEvent) {
    e.stopPropagation();
    if (interactive) onTaskClick(node.id);
    onNodeClick(node.id);
  }

  return (
    <div
      ref={(el) => registerNode(node.id, el)}
      onClick={handleClick}
      className={cn(
        'w-full bg-card border rounded-xl p-3 cursor-pointer transition-all select-none',
        isExpanded
          ? 'border-primary/50 shadow-sm'
          : 'hover:border-muted-foreground/30 hover:shadow-sm',
        isCurrent && 'ring-2 ring-primary ring-offset-1',
        isDimmed && 'opacity-25 pointer-events-none',
        context === 'branch' && 'max-w-55',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium leading-snug">{node.title}</div>
          {!isExpanded && (
            <div className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{node.summary}</div>
          )}
        </div>
        {interactive && (
          <ChevronDown
            className={cn(
              'size-3.5 text-muted-foreground shrink-0 mt-0.5 transition-transform duration-200',
              isExpanded && 'rotate-180',
            )}
          />
        )}
      </div>

      {isExpanded && interactive && (
        <div className="mt-3 space-y-2 border-t pt-3">
          <ul className="space-y-1.5">
            {node.details.map((d, i) => (
              <li key={i} className="flex gap-2 text-xs text-muted-foreground">
                <span className="shrink-0 text-border">·</span>
                <span>{d}</span>
              </li>
            ))}
          </ul>
          {node.roles.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-1">
              {node.roles.map((r) => (
                <RoleBadge key={r} role={r} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function DecisionNodeRenderer({
  node,
  context = 'main',
}: {
  node: DecisionNode;
  context?: 'main' | 'lane' | 'branch';
}) {
  const {
    highlightedDecisions,
    activeRoles,
    currentNodeId,
    interactive,
    registerNode,
    onDecisionOption,
    onNodeClick,
  } = useProcess();
  const selectedOption = highlightedDecisions.get(node.id) ?? null;
  const isDimmed = activeRoles.size > 0 && !node.roles.some((r) => activeRoles.has(r));
  const isCurrent = currentNodeId === node.id;

  const hasComplexA = (node.optionA.branch?.length ?? 0) > 0;
  const hasComplexB = (node.optionB.branch?.length ?? 0) > 0;
  const branchADim = selectedOption !== null && selectedOption !== 'A';
  const branchBDim = selectedOption !== null && selectedOption !== 'B';

  function handleOptionA(e: React.MouseEvent) {
    e.stopPropagation();
    if (!interactive) return;
    onDecisionOption(node.id, selectedOption === 'A' ? null : 'A');
  }
  function handleOptionB(e: React.MouseEvent) {
    e.stopPropagation();
    if (!interactive) return;
    onDecisionOption(node.id, selectedOption === 'B' ? null : 'B');
  }

  const cardMaxW =
    context === 'branch' ? 'max-w-65' : context === 'lane' ? '' : 'max-w-110';

  return (
    <div ref={(el) => registerNode(node.id, el)} className="flex flex-col items-center w-full">
      <div
        onClick={(e) => {
          e.stopPropagation();
          onNodeClick(node.id);
        }}
        className={cn(
          'w-full cursor-pointer rounded-xl border-2 bg-violet-50 border-violet-200 p-4 transition-all select-none hover:border-violet-300 hover:shadow-sm',
          cardMaxW,
          isCurrent && 'ring-2 ring-violet-500 ring-offset-1',
          isDimmed && 'opacity-25',
        )}
      >
        <div className="flex items-start gap-2 mb-3">
          <GitFork className="size-3.5 text-violet-500 shrink-0 mt-0.5 rotate-180" />
          <span className="text-sm font-medium text-violet-900 leading-snug">{node.title}</span>
        </div>
        {node.roles.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {node.roles.map((r) => (
              <RoleBadge key={r} role={r} />
            ))}
          </div>
        )}
        <div className="flex gap-2">
          <button
            onClick={handleOptionA}
            className={cn(
              'flex-1 rounded-lg border-2 px-2.5 py-1.5 text-xs font-semibold transition-colors',
              selectedOption === 'A'
                ? 'border-violet-500 bg-violet-500 text-white'
                : 'border-violet-200 text-violet-700 hover:bg-violet-100',
              !interactive && 'pointer-events-none',
            )}
          >
            {node.optionA.label}
          </button>
          <button
            onClick={handleOptionB}
            className={cn(
              'flex-1 rounded-lg border-2 px-2.5 py-1.5 text-xs font-semibold transition-colors',
              selectedOption === 'B'
                ? 'border-violet-500 bg-violet-500 text-white'
                : 'border-violet-200 text-violet-700 hover:bg-violet-100',
              !interactive && 'pointer-events-none',
            )}
          >
            {node.optionB.label}
          </button>
        </div>
      </div>

      {/* Branch paths below decision card */}
      <div className="flex gap-6 items-start mt-0">
        <div
          className={cn(
            'flex flex-col items-center gap-2 transition-opacity duration-200',
            branchADim && 'opacity-20',
          )}
        >
          <div className="w-0.5 h-4 bg-border mx-auto shrink-0" />
          <div className="text-[10px] font-semibold bg-violet-100 text-violet-700 rounded px-2 py-0.5 border border-violet-200 whitespace-nowrap">
            {node.optionA.label}
          </div>
          {node.optionA.description && (
            <div className="text-[11px] text-muted-foreground text-center max-w-45 leading-snug">
              {node.optionA.description}
            </div>
          )}
          {hasComplexA &&
            node.optionA.branch!.map((n, i) => (
              <React.Fragment key={n.id}>
                {i > 0 && <div className="w-0.5 h-4 bg-border mx-auto shrink-0" />}
                <NodeRenderer node={n} context="branch" />
              </React.Fragment>
            ))}
        </div>

        <div className="w-px bg-border/40 self-stretch mt-4 shrink-0" />

        <div
          className={cn(
            'flex flex-col items-center gap-2 transition-opacity duration-200',
            branchBDim && 'opacity-20',
          )}
        >
          <div className="w-0.5 h-4 bg-border mx-auto shrink-0" />
          <div className="text-[10px] font-semibold bg-violet-100 text-violet-700 rounded px-2 py-0.5 border border-violet-200 whitespace-nowrap">
            {node.optionB.label}
          </div>
          {node.optionB.description && (
            <div className="text-[11px] text-muted-foreground text-center max-w-45 leading-snug">
              {node.optionB.description}
            </div>
          )}
          {hasComplexB &&
            node.optionB.branch!.map((n, i) => (
              <React.Fragment key={n.id}>
                {i > 0 && <div className="w-0.5 h-4 bg-border mx-auto shrink-0" />}
                <NodeRenderer node={n} context="branch" />
              </React.Fragment>
            ))}
        </div>
      </div>
    </div>
  );
}

function ParallelNodeRenderer({ node }: { node: ParallelNode }) {
  const { registerNode, onNodeClick } = useProcess();
  const laneCount = node.lanes.length;
  const svgW = parallelSvgW(laneCount);

  return (
    <div
      ref={(el) => registerNode(node.id, el)}
      onClick={(e) => {
        e.stopPropagation();
        onNodeClick(node.id);
      }}
      className="flex flex-col items-center cursor-pointer w-full"
    >
      {node.description && (
        <div className="text-[11px] text-muted-foreground italic text-center mb-1.5 max-w-md">
          {node.description}
        </div>
      )}

      {/* Fan-out from main spine to each lane */}
      <ParallelFanSVG laneCount={laneCount} direction="out" />

      {/* Lane columns */}
      <div
        className="flex items-stretch"
        style={{ gap: `${LANE_GAP}px`, width: svgW }}
        onClick={(e) => e.stopPropagation()}
      >
        {node.lanes.map((lane) => (
          <div
            key={lane.name}
            style={{ width: `${LANE_W}px` }}
            className="relative flex flex-col items-center"
          >
            {/* Continuous spine within this lane */}
            <Spine />

            {/* Lane header — opaque bg hides spine */}
            <div className="relative z-10 w-full text-center text-[10px] font-semibold uppercase tracking-wide text-muted-foreground border rounded-lg py-1.5 px-2 bg-muted shrink-0">
              {lane.name}
            </div>

            {/* Lane nodes — each with py gap so spine shows between cards */}
            {lane.nodes.map((lnode) => (
              <div
                key={lnode.id}
                className="relative z-10 py-3 w-full flex flex-col items-center"
              >
                <NodeRenderer node={lnode} context="lane" />
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Fan-in from each lane back to main spine */}
      <ParallelFanSVG laneCount={laneCount} direction="in" />
    </div>
  );
}

function NodeRenderer({
  node,
  context = 'main',
}: {
  node: WorkflowNode;
  context?: 'main' | 'lane' | 'branch';
}) {
  switch (node.type) {
    case 'milestone':
      return <MilestoneNodeRenderer node={node} />;
    case 'stage':
      return <StageNodeRenderer node={node} />;
    case 'task':
      return <TaskNodeRenderer node={node} context={context} />;
    case 'decision':
      return <DecisionNodeRenderer node={node} context={context} />;
    case 'parallel':
      return <ParallelNodeRenderer node={node} />;
  }
}

// ─── Bucket column ─────────────────────────────────────────────────────────────

interface Phase {
  milestone?: MilestoneNode;
  items: WorkflowNode[];
}

function BucketColumn({ phase }: { phase: Phase }) {
  const colW = getBucketWidth(phase.items);

  return (
    <div style={{ width: colW }} className="flex flex-col items-center pt-8 pb-16">
      {/* Milestone banner */}
      {phase.milestone && (
        <div className="w-full flex justify-center px-10">
          <MilestoneNodeRenderer node={phase.milestone} />
        </div>
      )}

      {/* Phase nodes connected by fluid bezier curves */}
      {phase.items.map((node, i) => (
        <React.Fragment key={node.id}>
          <FluidConnector height={i === 0 ? 56 : FLUID_H} />
          <div className="w-full flex flex-col items-center px-10">
            <NodeRenderer node={node} />
          </div>
        </React.Fragment>
      ))}
    </div>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

function Sidebar({
  onClose,
  onSelect,
  currentNodeId,
}: {
  onClose: () => void;
  onSelect: (id: string) => void;
  currentNodeId: string | null;
}) {
  const groups = useMemo(() => groupByMilestone(WORKFLOW), []);

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30" onClick={onClose} />
      <div className="fixed left-0 top-0 bottom-0 z-50 w-72 bg-background border-r shadow-xl overflow-y-auto flex flex-col">
        <div className="sticky top-0 flex items-center justify-between border-b bg-background px-4 py-3 shrink-0">
          <span className="font-semibold text-sm">Workflow Navigation</span>
          <button
            onClick={onClose}
            className="flex size-7 items-center justify-center rounded-md hover:bg-muted transition-colors"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="p-3 space-y-1 flex-1 overflow-y-auto">
          {groups.map((group, gi) => (
            <div key={gi}>
              {group.milestone && (
                <button
                  onClick={() => onSelect(group.milestone!.id)}
                  className="w-full flex items-center gap-2 rounded-lg px-2.5 py-2 text-left hover:bg-amber-50 transition-colors"
                >
                  <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700 text-[10px] font-bold">
                    {group.milestone.number}
                  </span>
                  <span className="text-sm font-semibold text-amber-800 leading-tight">
                    {group.milestone.title}
                  </span>
                </button>
              )}
              <div className="ml-2 mt-0.5 space-y-0.5">
                {group.items.map((node) => (
                  <button
                    key={node.id}
                    onClick={() => onSelect(node.id)}
                    className={cn(
                      'w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-left hover:bg-muted transition-colors',
                      currentNodeId === node.id && 'bg-muted',
                    )}
                  >
                    <span className="shrink-0">
                      {node.type === 'decision' ? (
                        <GitFork className="size-3 text-violet-400 rotate-180" />
                      ) : node.type === 'parallel' ? (
                        <Layers className="size-3 text-blue-400" />
                      ) : node.type === 'stage' ? (
                        <span className="block size-3" />
                      ) : (
                        <Circle className="size-2.5 text-muted-foreground" />
                      )}
                    </span>
                    <span
                      className={cn(
                        'truncate text-xs text-muted-foreground',
                        node.type === 'stage' &&
                          'font-semibold uppercase tracking-wide text-[10px]',
                        currentNodeId === node.id && 'text-foreground font-medium',
                      )}
                    >
                      {getNodeTitle(node)}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

// ─── ProcessMap ───────────────────────────────────────────────────────────────

export function ProcessMap() {
  const phases = useMemo(() => groupByMilestone(WORKFLOW) as Phase[], []);

  // pan + scale stored together so wheel handler can read both atomically via ref
  const [transform, setTransform] = useState({ x: 60, y: 40, scale: 0.65 });
  const [isPanning, setIsPanning] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  const [currentNodeId, setCurrentNodeId] = useState<string | null>(null);
  const [highlightedDecisions, setHighlightedDecisions] = useState<Map<string, 'A' | 'B'>>(
    new Map(),
  );
  const [activeRoles, setActiveRoles] = useState<Set<string>>(new Set());
  const [isAnimating, setIsAnimating] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const nodeRefs = useRef(new Map<string, HTMLElement>());
  const transformRef = useRef(transform);
  const panStartRef = useRef({ mx: 0, my: 0, tx: 0, ty: 0 });
  const clickAfterDragRef = useRef(false);
  const isPanningRef = useRef(false);

  useEffect(() => {
    transformRef.current = transform;
  }, [transform]);

  // Center on first bucket on mount
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const { width } = container.getBoundingClientRect();
    const firstColW = getBucketWidth(phases[0]?.items ?? []);
    const initScale = 0.65;
    const initX = Math.max(40, width / 2 - (firstColW * initScale) / 2);
    setTransform({ x: initX, y: 40, scale: initScale });
  }, [phases]);

  // Non-passive wheel zoom — must preventDefault to block page scroll
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    function handleWheel(e: WheelEvent) {
      e.preventDefault();
      const { x, y, scale } = transformRef.current;
      const rect = el!.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
      const newScale = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, scale * factor));
      // Keep point under cursor stationary: canvasX = (mx - panX) / scale
      const canvasX = (mx - x) / scale;
      const canvasY = (my - y) / scale;
      setTransform({
        x: mx - canvasX * newScale,
        y: my - canvasY * newScale,
        scale: newScale,
      });
    }
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, []);

  // Pan drag
  function handleMouseDown(e: React.MouseEvent) {
    const target = e.target as HTMLElement;
    if (target.tagName === 'BUTTON' || target.closest('button')) return;
    clickAfterDragRef.current = false;
    const { x, y } = transformRef.current;
    panStartRef.current = { mx: e.clientX, my: e.clientY, tx: x, ty: y };
    setIsPanning(true);
    isPanningRef.current = true;
  }

  useEffect(() => {
    if (!isPanning) return;
    function handleMouseMove(e: MouseEvent) {
      const { mx, my, tx, ty } = panStartRef.current;
      const dx = e.clientX - mx;
      const dy = e.clientY - my;
      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) clickAfterDragRef.current = true;
      setTransform((prev) => ({ ...prev, x: tx + dx, y: ty + dy }));
    }
    function handleMouseUp() {
      setIsPanning(false);
      isPanningRef.current = false;
      setTimeout(() => { clickAfterDragRef.current = false; }, 50);
    }
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isPanning]);

  // Focus a node: center in viewport, zoom in if below threshold
  const focusNode = useCallback((nodeId: string) => {
    const el = nodeRefs.current.get(nodeId);
    const container = containerRef.current;
    if (!el || !container) return;

    const nodeRect = el.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    const { x, y, scale } = transformRef.current;
    const targetScale = Math.max(scale, ZOOM_THRESHOLD);

    setIsAnimating(true);

    const nodeCx = nodeRect.left + nodeRect.width / 2;
    const nodeCy = nodeRect.top + nodeRect.height / 2;

    if (targetScale !== scale) {
      // Zoom in + pan: canvas coord stays fixed, then re-center
      const canvasCx = (nodeCx - containerRect.left - x) / scale;
      const canvasCy = (nodeCy - containerRect.top - y) / scale;
      setTransform({
        x: containerRect.width / 2 - canvasCx * targetScale,
        y: containerRect.height / 2 - canvasCy * targetScale,
        scale: targetScale,
      });
    } else {
      const dx = containerRect.left + containerRect.width / 2 - nodeCx;
      const dy = containerRect.top + containerRect.height / 2 - nodeCy;
      setTransform((prev) => ({ ...prev, x: prev.x + dx, y: prev.y + dy }));
    }

    setTimeout(() => setIsAnimating(false), 380);
  }, []);

  function doZoom(factor: number) {
    const container = containerRef.current;
    if (!container) return;
    const cx = container.clientWidth / 2;
    const cy = container.clientHeight / 2;
    const { x, y, scale } = transformRef.current;
    const newScale = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, scale * factor));
    const ratio = newScale / scale;
    setTransform({ x: cx - (cx - x) * ratio, y: cy - (cy - y) * ratio, scale: newScale });
  }

  const registerNode = useCallback((id: string, el: HTMLElement | null) => {
    if (el) nodeRefs.current.set(id, el);
    else nodeRefs.current.delete(id);
  }, []);

  const onTaskClick = useCallback((id: string) => {
    if (clickAfterDragRef.current) return;
    setExpandedTaskId((prev) => (prev === id ? null : id));
    setCurrentNodeId(id);
  }, []);

  const onDecisionOption = useCallback((decisionId: string, option: 'A' | 'B' | null) => {
    setHighlightedDecisions((prev) => {
      const next = new Map(prev);
      if (option === null) next.delete(decisionId);
      else next.set(decisionId, option);
      return next;
    });
  }, []);

  const onNodeClick = useCallback(
    (id: string) => {
      if (clickAfterDragRef.current) return;
      setCurrentNodeId(id);
      setExpandedTaskId((prev) => (prev === id ? prev : null));
      focusNode(id);
    },
    [focusNode],
  );

  function toggleRole(role: string) {
    setActiveRoles((prev) => {
      const next = new Set(prev);
      if (next.has(role)) next.delete(role);
      else next.add(role);
      return next;
    });
  }

  const flatNodes = useMemo(() => flattenWorkflow(WORKFLOW), []);
  const currentIndex = flatNodes.findIndex((n) => n.id === currentNodeId);
  const interactive = transform.scale >= ZOOM_THRESHOLD;

  function goToIndex(idx: number) {
    const node = flatNodes[idx];
    if (!node) return;
    setCurrentNodeId(node.id);
    if (node.type === 'task') setExpandedTaskId(node.id);
    else setExpandedTaskId(null);
    focusNode(node.id);
  }

  function handleSidebarSelect(id: string) {
    setSidebarOpen(false);
    setCurrentNodeId(id);
    focusNode(id);
  }

  const ctxValue = useMemo<ProcessCtxValue>(
    () => ({
      expandedTaskId,
      highlightedDecisions,
      activeRoles,
      currentNodeId,
      interactive,
      registerNode,
      onTaskClick,
      onDecisionOption,
      onNodeClick,
    }),
    [
      expandedTaskId,
      highlightedDecisions,
      activeRoles,
      currentNodeId,
      interactive,
      registerNode,
      onTaskClick,
      onDecisionOption,
      onNodeClick,
    ],
  );

  return (
    <ProcessCtx.Provider value={ctxValue}>
      <div
        ref={containerRef}
        className={cn(
          'relative w-full overflow-hidden select-none',
          'bg-[radial-gradient(circle,oklch(0.922_0_0)_1px,transparent_1px)] bg-size-[24px_24px]',
          isPanning ? 'cursor-grabbing' : 'cursor-grab',
        )}
        style={{ height: 'calc(100vh - 4rem)' }}
        onMouseDown={handleMouseDown}
        onClick={(e) => {
          if (clickAfterDragRef.current) return;
          const target = e.target as HTMLElement;
          if (!target.closest('[data-node]')) setExpandedTaskId(null);
        }}
      >
        {/* Canvas — single transform for pan + scale. No CSS zoom (it breaks wheel events). */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
            transformOrigin: '0 0',
            transition: isAnimating ? 'transform 0.35s cubic-bezier(0.4,0,0.2,1)' : 'none',
          }}
        >
          {/* Horizontal flow: one column per milestone phase */}
          <div className="flex items-start" style={{ padding: '0 56px' }}>
            {phases.map((phase, i) => (
              <React.Fragment key={i}>
                <BucketColumn phase={phase} />
                {i < phases.length - 1 && (
                  <div
                    aria-hidden
                    className="shrink-0 flex items-center"
                    style={{ width: BUCKET_GAP, marginTop: CONNECTOR_TOP }}
                  >
                    <div className="flex-1 h-0.5 bg-border" />
                    <ChevronRight className="size-3.5 text-muted-foreground shrink-0 -ml-0.5" />
                  </div>
                )}
              </React.Fragment>
            ))}
            <div style={{ width: 56, flexShrink: 0 }} />
          </div>
        </div>

        {/* ── UI Overlays ── */}

        {/* Sidebar toggle */}
        <div className="absolute top-4 left-4 z-10">
          <button
            onClick={() => setSidebarOpen(true)}
            className="flex size-9 items-center justify-center rounded-lg border bg-background/90 backdrop-blur-sm shadow-sm hover:bg-background transition-colors"
            title="Open navigation"
          >
            <Menu className="size-4" />
          </button>
        </div>

        {/* Role filters */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 max-w-[calc(100vw-200px)]">
          <div className="flex flex-wrap items-center gap-1 bg-background/90 backdrop-blur-sm border rounded-xl px-3 py-1.5 shadow-sm">
            {activeRoles.size > 0 && (
              <span className="text-[10px] font-bold text-primary min-w-3">
                {activeRoles.size}
              </span>
            )}
            {ALL_ROLES.map((role) => (
              <button
                key={role}
                onClick={() => toggleRole(role)}
                className={cn(
                  'rounded-md px-1.5 py-0.5 text-[10px] font-medium transition-colors border whitespace-nowrap',
                  activeRoles.has(role)
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-transparent text-muted-foreground border-transparent hover:border-border hover:text-foreground',
                )}
              >
                {role}
              </button>
            ))}
            {activeRoles.size > 0 && (
              <button
                onClick={() => setActiveRoles(new Set())}
                className="ml-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                title="Clear filters"
              >
                <X className="size-3" />
              </button>
            )}
          </div>
        </div>

        {/* Zoom controls */}
        <div className="absolute top-4 right-4 z-10 flex items-center gap-1.5">
          <button
            onClick={() => doZoom(1 / 1.2)}
            className="flex size-9 items-center justify-center rounded-lg border bg-background/90 backdrop-blur-sm shadow-sm hover:bg-background transition-colors"
            title="Zoom out"
          >
            <Minus className="size-4" />
          </button>
          <div className="min-w-13 text-center text-xs font-mono font-medium border rounded-lg bg-background/90 backdrop-blur-sm shadow-sm px-2 h-9 flex items-center justify-center">
            {Math.round(transform.scale * 100)}%
          </div>
          <button
            onClick={() => doZoom(1.2)}
            className="flex size-9 items-center justify-center rounded-lg border bg-background/90 backdrop-blur-sm shadow-sm hover:bg-background transition-colors"
            title="Zoom in"
          >
            <Plus className="size-4" />
          </button>
        </div>

        {/* Info button */}
        <div className="absolute bottom-20 right-4 z-10">
          <button
            onClick={() => setInfoOpen(true)}
            className="flex size-9 items-center justify-center rounded-full border bg-background/90 backdrop-blur-sm shadow-sm hover:bg-background transition-colors"
            title="Process reference"
          >
            <Info className="size-4" />
          </button>
        </div>

        {/* Overview hint */}
        {!interactive && (
          <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
            <div className="text-xs text-muted-foreground bg-background/80 backdrop-blur-sm rounded-full px-3 py-1.5 border">
              Zoom in to interact with nodes
            </div>
          </div>
        )}

        {/* Stepper */}
        {interactive && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10">
            <div className="flex items-center gap-3 bg-background/95 backdrop-blur-sm border rounded-full shadow-md px-4 py-2">
              <button
                onClick={() => goToIndex(currentIndex - 1)}
                disabled={currentIndex <= 0}
                className="flex size-7 items-center justify-center rounded-full hover:bg-muted transition-colors disabled:opacity-30"
              >
                <ChevronLeft className="size-4" />
              </button>
              <span className="text-xs text-muted-foreground w-52 text-center truncate shrink-0">
                {currentNodeId
                  ? getNodeTitle(flatNodes.find((n) => n.id === currentNodeId))
                  : 'Click a node or use arrows to navigate'}
              </span>
              <button
                onClick={() => goToIndex(currentIndex + 1)}
                disabled={currentIndex >= flatNodes.length - 1}
                className="flex size-7 items-center justify-center rounded-full hover:bg-muted transition-colors disabled:opacity-30"
              >
                <ChevronRight className="size-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {sidebarOpen && (
        <Sidebar
          onClose={() => setSidebarOpen(false)}
          onSelect={handleSidebarSelect}
          currentNodeId={currentNodeId}
        />
      )}
      {infoOpen && <InfoModal onClose={() => setInfoOpen(false)} />}
    </ProcessCtx.Provider>
  );
}
