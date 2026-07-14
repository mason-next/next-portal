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
  ChevronUp,
  Circle,
  Download,
  FileText,
  GitFork,
  Info,
  Layers,
  Menu,
  Minus,
  Pencil,
  Plus,
  Save,
  Trash2,
  Video,
  X,
} from 'lucide-react';
import { downloadTemplate, getTemplate } from '@/lib/templateStore';
import {
  getOverrides, saveOverride, clearOverride,
  getAddedNodes, addNode, removeAddedNode, updateAddedNode,
  type NodeOverride, type AddedNodeDef,
} from '@/lib/processOverrides';
import { useSession } from '@/lib/auth/client';
import { cn } from '@/lib/utils';
import {
  WORKFLOW,
  ALL_ROLES,
  flattenWorkflow,
  getNodeRoles,
  nodeChildren,
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
const LANE_W = 180;
const LANE_GAP = 16;
const COL_BASE_W = 700;
const FLUID_H = 48;

const C_BLUE = '#1B3667';
const C_GREEN = '#1DB954';
const C_RED = '#911A1D';

function parallelSvgW(laneCount: number): number {
  return laneCount * LANE_W + (laneCount - 1) * LANE_GAP;
}

function scanBucketWidth(nodes: WorkflowNode[], nestDepth = 0): number {
  let w = 0;
  for (const n of nodes) {
    if (n.type === 'parallel') {
      const cost = 32 + 80 * nestDepth;
      w = Math.max(w, parallelSvgW(n.lanes.length) + cost);
      for (const lane of n.lanes) {
        w = Math.max(w, scanBucketWidth(lane.nodes, nestDepth));
      }
    } else {
      const ch = nodeChildren(n);
      if (ch.length) w = Math.max(w, scanBucketWidth(ch, nestDepth + 1));
    }
    if (n.type === 'decision') {
      w = Math.max(w, scanBucketWidth([...(n.optionA.branch ?? []), ...(n.optionB.branch ?? [])], nestDepth));
    }
  }
  return Math.max(w, COL_BASE_W);
}

function findAncestors(nodes: WorkflowNode[], targetId: string, path: string[] = []): string[] | null {
  for (const node of nodes) {
    if (node.id === targetId) return path;
    const ch = nodeChildren(node);
    if (ch.length) {
      const found = findAncestors(ch, targetId, [...path, node.id]);
      if (found) return found;
    }
    if (node.type === 'parallel') {
      for (const lane of node.lanes) {
        const found = findAncestors(lane.nodes, targetId, [...path, node.id]);
        if (found) return found;
      }
    }
    if (node.type === 'decision') {
      const withDec = [...path, node.id];
      const found =
        findAncestors(node.optionA.branch ?? [], targetId, withDec) ??
        findAncestors(node.optionB.branch ?? [], targetId, withDec);
      if (found) return found;
    }
  }
  return null;
}

// Group consecutive same-exclusiveGroup task nodes so they render side-by-side
type GroupedItem =
  | { type: 'single'; node: WorkflowNode }
  | { type: 'exclusive'; group: string; nodes: TaskNode[] };

function groupNodes(nodes: WorkflowNode[]): GroupedItem[] {
  const result: GroupedItem[] = [];
  let i = 0;
  while (i < nodes.length) {
    const node = nodes[i];
    const grp = node.type === 'task' ? (node as TaskNode).exclusiveGroup : undefined;
    if (grp) {
      const run: TaskNode[] = [node as TaskNode];
      let j = i + 1;
      while (j < nodes.length) {
        const next = nodes[j];
        if (next.type === 'task' && (next as TaskNode).exclusiveGroup === grp) {
          run.push(next as TaskNode);
          j++;
        } else break;
      }
      if (run.length > 1) {
        result.push({ type: 'exclusive', group: grp, nodes: run });
        i = j;
        continue;
      }
    }
    result.push({ type: 'single', node });
    i++;
  }
  return result;
}

// ─── Context ──────────────────────────────────────────────────────────────────

interface ProcessCtxValue {
  expandedTaskId: string | null;
  expandedParents: Set<string>;
  highlightedDecisions: Map<string, 'A' | 'B'>;
  activeRoles: Set<string>;
  currentNodeId: string | null;
  interactive: boolean;
  editMode: boolean;
  overrides: Record<string, NodeOverride>;
  addedNodes: AddedNodeDef[];
  editingNodeId: string | null;
  addingAfterNodeId: string | null;
  onSetEditingNode: (id: string | null) => void;
  onSetAddingAfter: (id: string | null) => void;
  onOverrideSave: (nodeId: string, override: NodeOverride) => void;
  onOverrideClear: (nodeId: string) => void;
  onAddNode: (afterNodeId: string, data: Omit<AddedNodeDef, 'id' | 'afterNodeId'>) => void;
  onRemoveAddedNode: (id: string) => void;
  onUpdateAddedNode: (id: string, data: Partial<Omit<AddedNodeDef, 'id' | 'afterNodeId'>>) => void;
  registerNode: (id: string, el: HTMLElement | null) => void;
  onNodeClick: (id: string) => void;
  onCollapseParent: (id: string) => void;
  onDecisionOption: (decisionId: string, option: 'A' | 'B' | null) => void;
}

const ProcessCtx = createContext<ProcessCtxValue>(null!);
const useProcess = () => useContext(ProcessCtx);

// ─── Confetti ─────────────────────────────────────────────────────────────────

const CONFETTI_COLORS = [C_GREEN, C_BLUE, '#FFAE00', '#EDEDED', '#3b82f6', '#10b981', '#f97316', '#8b5cf6'];

function ConfettiCanvas({ x, y, onDone }: { x: number; y: number; onDone: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const onDoneRef = useRef(onDone);
  useEffect(() => { onDoneRef.current = onDone; }, [onDone]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const particles = Array.from({ length: 100 }, () => ({
      x, y, vx: (Math.random() - 0.5) * 22, vy: -(Math.random() * 26 + 6), gravity: 0.4,
      color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
      w: Math.random() * 12 + 5, h: Math.random() * 7 + 3,
      angle: Math.random() * Math.PI * 2, vAngle: (Math.random() - 0.5) * 0.3,
    }));
    const start = Date.now();
    let raf: number;
    function draw() {
      const elapsed = (Date.now() - start) / 1000;
      if (elapsed > 3) { cancelAnimationFrame(raf); onDoneRef.current(); return; }
      ctx.clearRect(0, 0, canvas!.width, canvas!.height);
      for (const p of particles) {
        p.vy += p.gravity; p.x += p.vx; p.y += p.vy; p.angle += p.vAngle;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.angle);
        ctx.globalAlpha = Math.max(0, 1 - elapsed / 2.6);
        ctx.fillStyle = p.color; ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      }
      raf = requestAnimationFrame(draw);
    }
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [x, y]);

  return <canvas ref={canvasRef} style={{ position: 'fixed', inset: 0, width: '100vw', height: '100vh', pointerEvents: 'none', zIndex: 9999 }} />;
}

// ─── FluidConnector ───────────────────────────────────────────────────────────

function FluidConnector({ height = FLUID_H }: { height?: number }) {
  const cx = 8, dx = 3.5, h = height;
  const d = `M ${cx} 0 C ${cx + dx} ${h / 3}, ${cx - dx} ${(h * 2) / 3}, ${cx} ${h}`;
  return (
    <svg width={cx * 2} height={h} aria-hidden className="block mx-auto text-border shrink-0 overflow-visible">
      <path d={d} stroke="currentColor" strokeWidth={1.5} fill="none" strokeLinecap="round" />
    </svg>
  );
}

function Spine() {
  return <div aria-hidden className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-0.5 bg-border pointer-events-none" />;
}

// ─── Children section — ResizeObserver-driven height animation ───────────────
// Measures natural content height so the outer div animates between 0 and the
// exact pixel height. When nested content expands, the ResizeObserver updates
// the outer height directly (no React re-render), so the glass bubble always
// encloses all content without overflow escaping its background/border.

function ChildrenSection({ expanded, children }: { expanded: boolean; children: React.ReactNode }) {
  const outerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const expandedRef = useRef(expanded);
  useEffect(() => { expandedRef.current = expanded; }, [expanded]);

  // Animate height when expanded/collapsed
  useEffect(() => {
    const outer = outerRef.current;
    const inner = innerRef.current;
    if (!outer || !inner) return;
    outer.style.height = expanded ? `${inner.scrollHeight}px` : '0px';
  }, [expanded]);

  // Keep height in sync while content grows or shrinks (e.g. nested expansions)
  useEffect(() => {
    const inner = innerRef.current;
    if (!inner) return;
    const obs = new ResizeObserver(() => {
      if (expandedRef.current && outerRef.current) {
        outerRef.current.style.height = `${inner.scrollHeight}px`;
      }
    });
    obs.observe(inner);
    return () => obs.disconnect();
  }, []);

  return (
    <div
      ref={outerRef}
      style={{ height: 0, overflow: 'hidden', transition: 'height 0.42s cubic-bezier(0.4, 0, 0.2, 1)', width: '100%' }}
    >
      <div ref={innerRef}>
        {children}
      </div>
    </div>
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

function ParallelFanSVG({ laneCount, direction }: { laneCount: number; direction: 'out' | 'in' }) {
  const svgW = parallelSvgW(laneCount);
  const h = 36;
  const cx = svgW / 2;
  const centers = Array.from({ length: laneCount }, (_, i) => i * (LANE_W + LANE_GAP) + LANE_W / 2);
  return (
    <svg width={svgW} height={h} className="block shrink-0 text-border overflow-visible">
      {centers.map((lx, i) => {
        const d = direction === 'out'
          ? `M ${cx} 0 C ${cx} ${h / 2}, ${lx} ${h / 2}, ${lx} ${h}`
          : `M ${lx} 0 C ${lx} ${h / 2}, ${cx} ${h / 2}, ${cx} ${h}`;
        return <path key={i} d={d} stroke="currentColor" strokeWidth={1.5} fill="none" />;
      })}
    </svg>
  );
}

// ─── Collapse button (floating) ───────────────────────────────────────────────

function CollapseButton({ nodeId, accentColor }: { nodeId: string; accentColor?: string }) {
  const { onCollapseParent } = useProcess();
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onCollapseParent(nodeId); }}
      title="Collapse"
      className="absolute -top-2 -right-2 z-20 flex size-5 items-center justify-center rounded-full border bg-background shadow-md hover:bg-muted transition-colors"
      style={accentColor ? { borderColor: `${accentColor}40`, color: accentColor } : undefined}
    >
      <Minus className="size-2.5" />
    </button>
  );
}

// ─── Exclusive group renderer — side-by-side cards, children inline per card ──

function ExclusiveGroupRenderer({ nodes, depth }: { nodes: TaskNode[]; depth: number }) {
  const { expandedParents } = useProcess();

  // Nodes flagged wideChildren render their branch below the full row (full
  // bubble width, centered) rather than inline in a narrow flex-1 column.
  const wideNode = nodes.find((n) => n.wideChildren);
  const isWideExpanded = wideNode ? expandedParents.has(wideNode.id) : false;
  const wideNodeChildren = wideNode ? nodeChildren(wideNode) : [];

  return (
    <div className="w-full flex flex-col items-center">
      <div className="flex gap-3 w-full items-start">
        {nodes.map((n) => {
          const isExpanded = expandedParents.has(n.id);
          const ch = n.wideChildren ? [] : nodeChildren(n);
          return (
            <div key={n.id} className="flex-1 relative min-w-0 flex flex-col items-center">
              {isExpanded && <CollapseButton nodeId={n.id} />}
              <div className="w-full">
                <NodeRenderer node={n} />
              </div>
              {ch.length > 0 && (
                <ChildrenSection expanded={isExpanded}>
                  <NodeList nodes={ch} depth={depth + 1} noPad />
                </ChildrenSection>
              )}
            </div>
          );
        })}
      </div>

      {/* Wide-children branch rendered below the row at full bubble width */}
      {wideNode && wideNodeChildren.length > 0 && (
        <ChildrenSection expanded={isWideExpanded}>
          <NodeList nodes={wideNodeChildren} depth={depth + 1} noPad />
        </ChildrenSection>
      )}
    </div>
  );
}

// ─── Template download link ───────────────────────────────────────────────────

function TemplateLink({ name, className }: { name: string; className?: string }) {
  const has = typeof window !== 'undefined' && !!getTemplate(name);
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        const found = downloadTemplate(name);
        if (!found) alert(`No file uploaded for "${name}" yet. Upload it in Admin → SOP Templates.`);
      }}
      title={has ? `Download ${name}` : `${name} — no file uploaded yet`}
      className={cn(
        'flex items-center gap-1.5 text-xs hover:underline underline-offset-2 transition-colors',
        has ? 'opacity-100' : 'opacity-50',
        className,
      )}
    >
      {has ? <Download className="size-3 shrink-0" /> : <FileText className="size-3 shrink-0" />}
      {name}
    </button>
  );
}

// ─── Stage node — card style matching task cards ──────────────────────────────

function StageNodeRenderer({ node }: { node: StageNode }) {
  const { registerNode, onNodeClick, currentNodeId, expandedParents } = useProcess();
  const isExpanded = expandedParents.has(node.id);
  const hasChildren = (node.children?.length ?? 0) > 0;
  const isCurrent = currentNodeId === node.id;

  return (
    <div
      ref={(el) => registerNode(node.id, el)}
      onClick={() => onNodeClick(node.id)}
      className={cn(
        'w-full bg-card border rounded-xl p-3 cursor-pointer transition-all select-none',
        isExpanded ? 'border-primary/40 shadow-sm' : 'hover:border-muted-foreground/30 hover:shadow-sm',
        isCurrent && 'ring-2 ring-primary ring-offset-1',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium leading-snug">{node.title}</div>
          {node.meta && (
            <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{node.meta}</div>
          )}
        </div>
        {hasChildren && !isExpanded && (
          <div className="size-4 rounded-full border border-border bg-muted/30 flex items-center justify-center shrink-0 mt-0.5">
            <Plus className="size-2 text-muted-foreground" />
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Task node ────────────────────────────────────────────────────────────────

function TaskNodeRenderer({ node, context = 'main' }: { node: TaskNode; context?: 'main' | 'lane' | 'branch' }) {
  const {
    expandedTaskId, expandedParents, activeRoles, currentNodeId, interactive,
    editMode, overrides, editingNodeId, onSetEditingNode,
    onOverrideSave, onOverrideClear,
    registerNode, onNodeClick,
  } = useProcess();
  const isDetailExpanded = expandedTaskId === node.id;
  const isParentExpanded = expandedParents.has(node.id);
  const isCurrent = currentNodeId === node.id;
  const isDimmed = activeRoles.size > 0 && !node.roles.some((r) => activeRoles.has(r));
  const hasChildren = (node.children?.length ?? 0) > 0;

  const ov = overrides[node.id] ?? {};
  const isHidden = ov.hidden === true;
  const effTitle = ov.title ?? node.title;
  const effSummary = ov.summary ?? node.summary;
  const effDetails = ov.details ?? node.details;
  const effRoles = ov.roles ?? node.roles;
  const effTemplates = ov.templates ?? node.templates;

  const isGrouping = hasChildren && effDetails.length === 0;
  const showDetails = isDetailExpanded || isParentExpanded;
  const editOpen = editingNodeId === node.id;

  const [editTitle, setEditTitle] = useState('');
  const [editSummary, setEditSummary] = useState('');
  const [editDetails, setEditDetails] = useState('');
  const [editRoles, setEditRoles] = useState<string[]>([]);

  // Close edit panel when editMode is turned off externally
  useEffect(() => {
    if (!editMode && editOpen) onSetEditingNode(null);
  }, [editMode]); // eslint-disable-line react-hooks/exhaustive-deps

  // Hidden nodes: outside edit mode, render nothing
  if (isHidden && !editMode) return null;

  function openEdit(e: React.MouseEvent) {
    e.stopPropagation();
    setEditTitle(effTitle);
    setEditSummary(effSummary);
    setEditDetails(effDetails.join('\n'));
    setEditRoles([...effRoles]);
    onSetEditingNode(node.id);
  }

  function saveEdit(e: React.MouseEvent) {
    e.stopPropagation();
    onOverrideSave(node.id, {
      title: editTitle.trim() || undefined,
      summary: editSummary.trim() || undefined,
      details: editDetails.trim() ? editDetails.split('\n').filter(Boolean) : undefined,
      roles: editRoles,
    });
    onSetEditingNode(null);
  }

  function cancelEdit(e: React.MouseEvent) {
    e.stopPropagation();
    onSetEditingNode(null);
  }

  function resetOverride(e: React.MouseEvent) {
    e.stopPropagation();
    onOverrideClear(node.id);
    onSetEditingNode(null);
  }

  function toggleHidden(e: React.MouseEvent) {
    e.stopPropagation();
    onOverrideSave(node.id, { hidden: !isHidden });
  }

  if (node.isCall) {
    return (
      <div
        ref={(el) => registerNode(node.id, el)}
        onClick={(e) => { e.stopPropagation(); onNodeClick(node.id); }}
        className={cn(
          'w-full cursor-pointer rounded-xl border transition-all select-none bg-sky-50 border-sky-200 hover:border-sky-300 hover:shadow-sm',
          isCurrent && 'ring-2 ring-sky-400 ring-offset-1',
          isDimmed && 'opacity-20 pointer-events-none',
          context === 'branch' && 'max-w-55',
        )}
      >
        <div className="px-4 py-3 flex items-start gap-3">
          <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-sky-100 mt-0.5">
            <Video className="size-3.5 text-sky-600" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-sky-900 leading-snug">{node.title}</div>
            {!isDetailExpanded && (
              <div className="text-xs text-sky-700/70 mt-0.5 line-clamp-1">{node.summary}</div>
            )}
          </div>
        </div>
        {isDetailExpanded && interactive && (
          <div className="px-4 pb-3 space-y-2 border-t border-sky-100 pt-2.5">
            <ul className="space-y-1.5">
              {node.details.map((d, i) => (
                <li key={i} className="flex gap-2 text-xs text-sky-800/80">
                  <span className="shrink-0 text-sky-300">·</span><span>{d}</span>
                </li>
              ))}
            </ul>
            {node.roles.length > 0 && (
              <div className="flex flex-wrap gap-1 pt-1">
                {node.roles.map((r) => <RoleBadge key={r} role={r} />)}
              </div>
            )}
            {node.templates && node.templates.length > 0 && (
              <div className="pt-1 border-t border-sky-100 flex flex-wrap gap-2">
                {node.templates.map((t) => (
                  <TemplateLink key={t} name={t} className="text-sky-700 hover:text-sky-900" />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      ref={(el) => registerNode(node.id, el)}
      onClick={(e) => { e.stopPropagation(); if (!editOpen && !isHidden) onNodeClick(node.id); }}
      className={cn(
        'w-full bg-card border rounded-xl p-3 transition-all select-none',
        !editMode && !isHidden && 'cursor-pointer',
        showDetails ? 'border-primary/40 shadow-sm' : 'hover:border-muted-foreground/30 hover:shadow-sm',
        isCurrent && !isHidden && 'ring-2 ring-primary ring-offset-1',
        isDimmed && !editMode && 'opacity-20 pointer-events-none',
        context === 'branch' && 'max-w-55',
        (ov.title || ov.summary || ov.details) && 'ring-1 ring-amber-300/60',
        isHidden && 'opacity-40 ring-1 ring-destructive/40 cursor-default',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className={cn('text-sm font-medium leading-snug', isHidden && 'line-through text-muted-foreground')}>{effTitle}</div>
          {!showDetails && !isHidden && (
            <div className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{effSummary}</div>
          )}
          {isHidden && (
            <div className="text-[10px] text-destructive/60 mt-0.5">Hidden — not visible outside edit mode</div>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0 mt-0.5">
          {editMode && (
            <>
              <button onClick={openEdit} title="Edit card" className="flex size-5 items-center justify-center rounded hover:bg-amber-50 transition-colors text-amber-500">
                <Pencil className="size-2.5" />
              </button>
              <button onClick={toggleHidden} title={isHidden ? 'Restore card' : 'Hide card'} className={cn('flex size-5 items-center justify-center rounded transition-colors', isHidden ? 'text-green-600 hover:bg-green-50' : 'text-destructive/60 hover:bg-destructive/10')}>
                {isHidden ? <Plus className="size-2.5" /> : <Trash2 className="size-2.5" />}
              </button>
            </>
          )}
          {!editMode && hasChildren && !isParentExpanded && (
            <div className="size-4 rounded-full border border-border bg-muted/30 flex items-center justify-center">
              <Plus className="size-2 text-muted-foreground" />
            </div>
          )}
          {!editMode && !hasChildren && interactive && (
            <svg className={cn('size-3.5 text-muted-foreground transition-transform duration-200', isDetailExpanded && 'rotate-180')}
              viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <polyline points="6 9 12 15 18 9" />
            </svg>
          )}
        </div>
      </div>
      {showDetails && interactive && !isGrouping && !editOpen && !isHidden && (
        <div className="mt-3 space-y-2 border-t pt-3">
          <ul className="space-y-1.5">
            {effDetails.map((d, i) => (
              <li key={i} className="flex gap-2 text-xs text-muted-foreground">
                <span className="shrink-0 text-border">·</span><span>{d}</span>
              </li>
            ))}
          </ul>
          {effRoles.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-1">
              {effRoles.map((r) => <RoleBadge key={r} role={r as Role} />)}
            </div>
          )}
          {effTemplates && effTemplates.length > 0 && (
            <div className="pt-1 border-t flex flex-wrap gap-2">
              {effTemplates.map((t) => (
                <TemplateLink key={t} name={t} className="text-primary" />
              ))}
            </div>
          )}
        </div>
      )}
      {editOpen && (
        <div className="mt-3 space-y-2 border-t pt-3" onClick={(e) => e.stopPropagation()}>
          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Title</label>
            <input value={editTitle} onChange={(e) => setEditTitle(e.target.value)}
              className="w-full text-xs border rounded-md px-2 py-1.5 bg-background focus:outline-none focus:ring-1 focus:ring-amber-400" />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Summary</label>
            <input value={editSummary} onChange={(e) => setEditSummary(e.target.value)}
              className="w-full text-xs border rounded-md px-2 py-1.5 bg-background focus:outline-none focus:ring-1 focus:ring-amber-400" />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Details (one per line)</label>
            <textarea value={editDetails} onChange={(e) => setEditDetails(e.target.value)} rows={4}
              className="w-full text-xs border rounded-md px-2 py-1.5 bg-background focus:outline-none focus:ring-1 focus:ring-amber-400 resize-none" />
          </div>
          <RoleEditor roles={editRoles} onChange={setEditRoles} />
          <div className="flex gap-2 pt-1">
            <button onClick={saveEdit}
              className="flex items-center gap-1 text-xs bg-amber-500 hover:bg-amber-600 text-white rounded-md px-3 py-1.5 transition-colors">
              <Save className="size-3" /> Save
            </button>
            {Object.keys(ov).some((k) => k !== 'hidden') && (
              <button onClick={resetOverride}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground border rounded-md px-3 py-1.5 transition-colors">
                Reset to default
              </button>
            )}
            <button onClick={cancelEdit}
              className="text-xs text-muted-foreground hover:text-foreground rounded-md px-3 py-1.5 transition-colors">
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Decision node ────────────────────────────────────────────────────────────

function DecisionNodeRenderer({ node, context = 'main' }: { node: DecisionNode; context?: 'main' | 'lane' | 'branch' }) {
  const { highlightedDecisions, activeRoles, currentNodeId, interactive, registerNode, onDecisionOption, onNodeClick } = useProcess();
  const selected = highlightedDecisions.get(node.id) ?? null;
  const isDimmed = activeRoles.size > 0 && !node.roles.some((r) => activeRoles.has(r));
  const isCurrent = currentNodeId === node.id;
  const cardMaxW = context === 'branch' ? 'max-w-65' : '';

  return (
    <div ref={(el) => registerNode(node.id, el)} className="flex flex-col items-center w-full">
      <div
        onClick={(e) => { e.stopPropagation(); onNodeClick(node.id); }}
        className={cn('w-full cursor-pointer rounded-xl border-2 p-4 transition-all select-none hover:shadow-sm', cardMaxW, isDimmed && 'opacity-20')}
        style={{
          background: 'rgba(145, 26, 29, 0.07)',
          borderColor: isCurrent ? C_RED : 'rgba(145, 26, 29, 0.28)',
          ...(isCurrent ? { outline: `2px solid ${C_RED}`, outlineOffset: 2 } : {}),
        }}
      >
        <div className="flex items-start gap-2 mb-2">
          <GitFork className="size-3.5 shrink-0 mt-0.5 rotate-180" style={{ color: C_RED }} />
          <span className="text-sm font-medium leading-snug" style={{ color: C_RED }}>{node.title}</span>
        </div>
        {node.context && (
          <div className="mb-3 text-[11px] leading-snug rounded-lg px-3 py-2"
            style={{ background: 'rgba(145, 26, 29, 0.06)', color: 'rgba(145, 26, 29, 0.8)' }}>
            {node.context}
          </div>
        )}
        {node.roles.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {node.roles.map((r) => <RoleBadge key={r} role={r} />)}
          </div>
        )}
        <div className="flex gap-2">
          {(['A', 'B'] as const).map((opt) => {
            const option = opt === 'A' ? node.optionA : node.optionB;
            const isSel = selected === opt;
            return (
              <button key={opt}
                onClick={(e) => { e.stopPropagation(); if (interactive) onDecisionOption(node.id, isSel ? null : opt); }}
                className="flex-1 rounded-lg border-2 px-2.5 py-1.5 text-xs font-semibold transition-colors"
                style={isSel
                  ? { background: C_RED, borderColor: C_RED, color: 'white' }
                  : { borderColor: 'rgba(145, 26, 29, 0.25)', color: C_RED }
                }
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>
      <div className="flex gap-6 items-start">
        {(['A', 'B'] as const).map((opt) => {
          const option = opt === 'A' ? node.optionA : node.optionB;
          const hasBranch = (option.branch?.length ?? 0) > 0;
          const isOtherSelected = selected !== null && selected !== opt;
          const isThisSelected = selected === opt;
          // Filter branch items by showWhen, then show only when this option is selected
          const visibleBranch = (option.branch ?? []).filter((n) => {
            const sw = (n as TaskNode | DecisionNode).showWhen;
            if (!sw) return true;
            if (sw.option === 'any') return highlightedDecisions.has(sw.decisionId);
            return highlightedDecisions.get(sw.decisionId) === sw.option;
          });
          return (
            <div key={opt} className={cn('flex flex-col items-center gap-2 transition-opacity duration-200', isOtherSelected && !hasBranch && 'opacity-20')}>
              <div className="w-0.5 h-4 bg-border mx-auto shrink-0" />
              <div className="text-[10px] font-semibold rounded px-2 py-0.5 border whitespace-nowrap"
                style={{ background: 'rgba(145, 26, 29, 0.08)', color: C_RED, borderColor: 'rgba(145, 26, 29, 0.2)' }}>
                {option.label}
              </div>
              {option.description && (
                <div className="text-[11px] text-muted-foreground text-center max-w-45 leading-snug">{option.description}</div>
              )}
              {/* Branches only render when this option is explicitly selected */}
              {hasBranch && isThisSelected && visibleBranch.map((n, i) => (
                <React.Fragment key={n.id}>
                  {i > 0 && <div className="w-0.5 h-4 bg-border mx-auto shrink-0" />}
                  <NodeRenderer node={n} context="branch" />
                </React.Fragment>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Parallel node ────────────────────────────────────────────────────────────

function ParallelNodeRenderer({ node }: { node: ParallelNode }) {
  const { registerNode, onNodeClick } = useProcess();
  const svgW = parallelSvgW(node.lanes.length);

  return (
    <div ref={(el) => registerNode(node.id, el)} onClick={(e) => { e.stopPropagation(); onNodeClick(node.id); }}
      className="flex flex-col items-center cursor-pointer w-full">
      {node.description && (
        <div className="text-[11px] text-muted-foreground italic text-center mb-1.5 max-w-md">{node.description}</div>
      )}
      <ParallelFanSVG laneCount={node.lanes.length} direction="out" />
      <div className="flex items-stretch" style={{ gap: `${LANE_GAP}px`, width: svgW }} onClick={(e) => e.stopPropagation()}>
        {node.lanes.map((lane) => (
          <div key={lane.name} style={{ width: `${LANE_W}px` }} className="relative flex flex-col items-center">
            <Spine />
            <div className="relative z-10 w-full text-center text-[10px] font-semibold uppercase tracking-wide text-muted-foreground border rounded-lg py-1.5 px-2 bg-muted shrink-0">
              {lane.name}
            </div>
            {lane.nodes.map((lnode) => (
              <div key={lnode.id} className="relative z-10 py-3 w-full flex flex-col items-center">
                <NodeRenderer node={lnode} context="lane" />
              </div>
            ))}
          </div>
        ))}
      </div>
      <ParallelFanSVG laneCount={node.lanes.length} direction="in" />
    </div>
  );
}

// ─── Generic node router ─────────────────────────────────────────────────────

// ─── Role editor (used in edit panels) ───────────────────────────────────────

function RoleEditor({ roles, onChange }: { roles: string[]; onChange: (r: string[]) => void }) {
  const [open, setOpen] = useState(false);
  const available = ALL_ROLES.filter((r) => !roles.includes(r));

  return (
    <div className="space-y-1.5" onClick={(e) => e.stopPropagation()}>
      <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Roles</label>
      <div className="flex flex-wrap gap-1 min-h-6">
        {roles.map((r) => (
          <span key={r} className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium border"
            style={{ background: `${C_BLUE}15`, borderColor: `${C_BLUE}30`, color: C_BLUE }}>
            {r}
            <button onClick={() => onChange(roles.filter((x) => x !== r))}
              className="hover:text-destructive transition-colors leading-none">
              <X className="size-2.5" />
            </button>
          </span>
        ))}
        {available.length > 0 && (
          <div className="relative">
            <button
              onClick={() => setOpen((v) => !v)}
              className="inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[10px] font-medium border border-dashed border-muted-foreground/40 text-muted-foreground hover:border-primary hover:text-primary transition-colors"
            >
              <Plus className="size-2.5" /> Add
            </button>
            {open && (
              <div className="absolute left-0 top-full mt-1 z-30 bg-background border rounded-lg shadow-lg py-1 min-w-44 max-h-52 overflow-y-auto">
                {available.map((r) => (
                  <button key={r} onClick={() => { onChange([...roles, r]); setOpen(false); }}
                    className="w-full text-left px-3 py-1.5 text-xs hover:bg-muted transition-colors">
                    {r}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        {roles.length === 0 && available.length === 0 && (
          <span className="text-[10px] text-muted-foreground">No roles available</span>
        )}
      </div>
    </div>
  );
}

function NodeRenderer({ node, context = 'main' }: { node: WorkflowNode; context?: 'main' | 'lane' | 'branch' }) {
  switch (node.type) {
    case 'milestone': return null;
    case 'stage':     return <StageNodeRenderer node={node} />;
    case 'task':      return <TaskNodeRenderer node={node} context={context} />;
    case 'decision':  return <DecisionNodeRenderer node={node} context={context} />;
    case 'parallel':  return <ParallelNodeRenderer node={node} />;
  }
}

// ─── Added-node inline card ───────────────────────────────────────────────────

function AddedNodeCard({ def }: { def: AddedNodeDef }) {
  const { editMode, editingNodeId, addingAfterNodeId, onSetEditingNode, onSetAddingAfter, onRemoveAddedNode, onUpdateAddedNode, onAddNode } = useProcess();
  const editOpen = editingNodeId === def.id;

  const [detailsOpen, setDetailsOpen] = useState(false);
  const [editTitle, setEditTitle] = useState(def.title);
  const [editSummary, setEditSummary] = useState(def.summary);
  const [editDetails, setEditDetails] = useState(def.details.join('\n'));
  const [editRoles, setEditRoles] = useState<string[]>(def.roles);

  const hasDetails = def.details.length > 0 || !!def.summary || def.roles.length > 0;

  function saveEdit(e: React.MouseEvent) {
    e.stopPropagation();
    onUpdateAddedNode(def.id, {
      title: editTitle.trim() || def.title,
      summary: editSummary.trim() || def.summary,
      details: editDetails.trim() ? editDetails.split('\n').filter(Boolean) : def.details,
      roles: editRoles,
    });
    onSetEditingNode(null);
  }

  function openEdit(e: React.MouseEvent) {
    e.stopPropagation();
    setEditTitle(def.title);
    setEditSummary(def.summary);
    setEditDetails(def.details.join('\n'));
    setEditRoles([...def.roles]);
    onSetEditingNode(def.id);
  }

  function handleCardClick(e: React.MouseEvent) {
    e.stopPropagation();
    if (editOpen) return;
    if (hasDetails) setDetailsOpen((v) => !v);
  }

  return (
    <div
      onClick={handleCardClick}
      className={cn(
        'w-full bg-card border rounded-xl p-3 transition-all select-none',
        editMode && 'border-dashed border-amber-300',
        editMode && hasDetails && !editOpen && 'cursor-pointer hover:border-amber-400 hover:shadow-sm',
        !editMode && hasDetails && !editOpen && 'cursor-pointer hover:border-muted-foreground/30 hover:shadow-sm',
        editOpen && 'border-amber-400 shadow-sm',
        detailsOpen && !editMode && 'border-primary/40 shadow-sm',
        detailsOpen && editMode && 'border-amber-400 shadow-sm',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          {editMode && (
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className="text-[9px] font-semibold uppercase tracking-widest text-amber-500 bg-amber-50 rounded px-1.5 py-0.5">Added</span>
            </div>
          )}
          <div className="text-sm font-medium leading-snug">{def.title}</div>
          {!detailsOpen && !editOpen && def.summary && (
            <div className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{def.summary}</div>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0 mt-0.5">
          {editMode && (
            <>
              <button onClick={openEdit} title="Edit" className="flex size-5 items-center justify-center rounded hover:bg-amber-50 text-amber-500 transition-colors">
                <Pencil className="size-2.5" />
              </button>
              <button onClick={(e) => { e.stopPropagation(); onRemoveAddedNode(def.id); }} title="Delete" className="flex size-5 items-center justify-center rounded hover:bg-destructive/10 text-destructive/60 transition-colors">
                <Trash2 className="size-2.5" />
              </button>
            </>
          )}
          {!editMode && hasDetails && (
            <svg className={cn('size-3.5 text-muted-foreground transition-transform duration-200', detailsOpen && 'rotate-180')}
              viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <polyline points="6 9 12 15 18 9" />
            </svg>
          )}
        </div>
      </div>

      {detailsOpen && !editOpen && (
        <div className="mt-3 space-y-2 border-t pt-3">
          {def.summary && (
            <p className="text-xs text-muted-foreground">{def.summary}</p>
          )}
          {def.details.length > 0 && (
            <ul className="space-y-1.5">
              {def.details.map((d, i) => (
                <li key={i} className="flex gap-2 text-xs text-muted-foreground">
                  <span className="shrink-0 text-border">·</span><span>{d}</span>
                </li>
              ))}
            </ul>
          )}
          {def.roles.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-1">
              {def.roles.map((r) => <RoleBadge key={r} role={r as Role} />)}
            </div>
          )}
        </div>
      )}

      {editOpen && (
        <div className="mt-3 space-y-2 border-t pt-3" onClick={(e) => e.stopPropagation()}>
          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Title</label>
            <input value={editTitle} onChange={(e) => setEditTitle(e.target.value)}
              className="w-full text-xs border rounded-md px-2 py-1.5 bg-background focus:outline-none focus:ring-1 focus:ring-amber-400" />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Summary</label>
            <input value={editSummary} onChange={(e) => setEditSummary(e.target.value)}
              className="w-full text-xs border rounded-md px-2 py-1.5 bg-background focus:outline-none focus:ring-1 focus:ring-amber-400" />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Details (one per line)</label>
            <textarea value={editDetails} onChange={(e) => setEditDetails(e.target.value)} rows={3}
              className="w-full text-xs border rounded-md px-2 py-1.5 bg-background focus:outline-none focus:ring-1 focus:ring-amber-400 resize-none" />
          </div>
          <RoleEditor roles={editRoles} onChange={setEditRoles} />
          <div className="flex gap-2 pt-1">
            <button onClick={saveEdit}
              className="flex items-center gap-1 text-xs bg-amber-500 hover:bg-amber-600 text-white rounded-md px-3 py-1.5 transition-colors">
              <Save className="size-3" /> Save
            </button>
            <button onClick={(e) => { e.stopPropagation(); onSetEditingNode(null); }}
              className="text-xs text-muted-foreground hover:text-foreground rounded-md px-3 py-1.5 transition-colors">
              Cancel
            </button>
          </div>
        </div>
      )}
      {/* Add card after this added node */}
      {editMode && !addingAfterNodeId && !editingNodeId && (
        <button onClick={(e) => { e.stopPropagation(); onSetAddingAfter(def.id); }}
          className="mt-2 w-full flex items-center justify-center gap-1 text-[10px] text-amber-500 hover:text-amber-700 border border-dashed border-amber-200 hover:border-amber-400 rounded-lg py-1 transition-colors">
          <Plus className="size-2.5" /> Add card after
        </button>
      )}
    </div>
  );
}

// ─── Inline add-card form ─────────────────────────────────────────────────────

function AddCardInlineForm({ afterNodeId }: { afterNodeId: string }) {
  const { onSetAddingAfter, onAddNode } = useProcess();
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [details, setDetails] = useState('');
  const [roles, setRoles] = useState<string[]>([]);

  function handleSave(e: React.MouseEvent) {
    e.stopPropagation();
    if (!title.trim()) return;
    onAddNode(afterNodeId, {
      title: title.trim(),
      summary: summary.trim(),
      details: details.trim() ? details.split('\n').filter(Boolean) : [],
      roles,
    });
    onSetAddingAfter(null);
  }

  return (
    <div className="w-full bg-amber-50/60 border border-dashed border-amber-300 rounded-xl p-3" onClick={(e) => e.stopPropagation()}>
      <div className="text-[10px] font-semibold uppercase tracking-widest text-amber-600 mb-2">New card</div>
      <div className="space-y-2">
        <input autoFocus placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)}
          className="w-full text-xs border rounded-md px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-amber-400" />
        <input placeholder="Summary (optional)" value={summary} onChange={(e) => setSummary(e.target.value)}
          className="w-full text-xs border rounded-md px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-amber-400" />
        <textarea placeholder="Details — one per line (optional)" value={details} onChange={(e) => setDetails(e.target.value)} rows={3}
          className="w-full text-xs border rounded-md px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-amber-400 resize-none" />
        <RoleEditor roles={roles} onChange={setRoles} />
        <div className="flex gap-2">
          <button onClick={handleSave}
            className="flex items-center gap-1 text-xs bg-amber-500 hover:bg-amber-600 text-white rounded-md px-3 py-1.5 transition-colors disabled:opacity-40"
            disabled={!title.trim()}>
            <Save className="size-3" /> Add card
          </button>
          <button onClick={(e) => { e.stopPropagation(); onSetAddingAfter(null); }}
            className="text-xs text-muted-foreground hover:text-foreground rounded-md px-3 py-1.5 transition-colors">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── NodeList ─────────────────────────────────────────────────────────────────

function NodeList({ nodes, depth = 0, noPad = false }: { nodes: WorkflowNode[]; depth?: number; noPad?: boolean }) {
  const { expandedParents, highlightedDecisions, editMode, addedNodes, addingAfterNodeId, editingNodeId, onSetAddingAfter } = useProcess();
  const grouped = useMemo(() => {
    const visible = nodes.filter((node) => {
      const sw = (node as TaskNode | DecisionNode).showWhen;
      if (!sw) return true;
      if (sw.option === 'any') return highlightedDecisions.has(sw.decisionId);
      return highlightedDecisions.get(sw.decisionId) === sw.option;
    });
    return groupNodes(visible);
  }, [nodes, highlightedDecisions]);

  function renderAddedAfter(afterId: string, connH: number) {
    const after = addedNodes.filter((a) => a.afterNodeId === afterId);
    if (after.length === 0 && !editMode) return null;
    return (
      <>
        {after.map((def) => (
          <React.Fragment key={def.id}>
            <div className="flex justify-center"><FluidConnector height={connH} /></div>
            <div className="w-full flex flex-col items-center px-10">
              <AddedNodeCard def={def} />
            </div>
            {/* Recurse: added nodes can themselves have added nodes after them */}
            {renderAddedAfter(def.id, FLUID_H)}
          </React.Fragment>
        ))}
        {/* Add-card form triggered from this position */}
        {addingAfterNodeId === afterId && (
          <>
            <div className="flex justify-center"><FluidConnector height={connH} /></div>
            <div className="w-full flex flex-col items-center px-10">
              <AddCardInlineForm afterNodeId={afterId} />
            </div>
          </>
        )}
        {/* "Add card here" button shown in edit mode when no form is open */}
        {editMode && !addingAfterNodeId && !editingNodeId && after.length === 0 && (
          <>
            <div className="flex justify-center"><FluidConnector height={connH} /></div>
            <div className="w-full flex flex-col items-center px-10">
              <button onClick={(e) => { e.stopPropagation(); onSetAddingAfter(afterId); }}
                className="w-full flex items-center justify-center gap-1 text-[10px] text-amber-500 hover:text-amber-700 border border-dashed border-amber-200 hover:border-amber-400 rounded-lg py-1.5 transition-colors bg-amber-50/30">
                <Plus className="size-2.5" /> Add card here
              </button>
            </div>
          </>
        )}
      </>
    );
  }

  return (
    <div className="w-full">
      {grouped.map((item, i) => {
        if (item.type === 'exclusive') {
          return (
            <React.Fragment key={item.group}>
              <div className="flex justify-center">
                <FluidConnector height={i === 0 && depth > 0 ? 36 : FLUID_H} />
              </div>
              <div className="w-full flex flex-col items-center px-4">
                <ExclusiveGroupRenderer nodes={item.nodes} depth={depth} />
              </div>
            </React.Fragment>
          );
        }

        const node = item.node;
        const ch = nodeChildren(node);
        const isParentExpanded = expandedParents.has(node.id);
        const isWide = node.type === 'parallel' || node.type === 'decision';

        return (
          <React.Fragment key={node.id}>
            <div className="flex justify-center">
              <FluidConnector height={i === 0 && depth > 0 ? 36 : FLUID_H} />
            </div>
            <div className={cn('w-full flex flex-col items-center', !noPad && !isWide && 'px-10')}>
              <div className="relative w-full">
                {ch.length > 0 && isParentExpanded && <CollapseButton nodeId={node.id} />}
                <NodeRenderer node={node} />
              </div>
              {ch.length > 0 && (
                <ChildrenSection expanded={isParentExpanded}>
                  <NodeList nodes={ch} depth={depth + 1} />
                </ChildrenSection>
              )}
            </div>
            {/* Added nodes (and add button) after each node in the main flow */}
            {node.type !== 'parallel' && node.type !== 'decision' && renderAddedAfter(node.id, FLUID_H)}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ─── Milestone block ─────────────────────────────────────────────────────────

function MilestoneBlock({ milestone, colW }: { milestone: MilestoneNode; colW: number }) {
  const {
    expandedParents, onCollapseParent, registerNode, onNodeClick, currentNodeId,
    editMode, overrides, editingNodeId, onSetEditingNode, onOverrideSave, onOverrideClear,
  } = useProcess();
  const children = milestone.children ?? [];
  const isExpanded = expandedParents.has(milestone.id);
  const isCurrent = currentNodeId === milestone.id;
  const isComplete = milestone.id === 'milestone-7';
  const bg = isComplete ? C_GREEN : C_BLUE;
  const hasChildren = children.length > 0;

  const ov = overrides[milestone.id] ?? {};
  const effTitle = ov.title ?? milestone.title;
  const editOpen = editingNodeId === milestone.id;
  const [editTitle, setEditTitle] = useState('');

  useEffect(() => {
    if (!editMode && editOpen) onSetEditingNode(null);
  }, [editMode]); // eslint-disable-line react-hooks/exhaustive-deps

  function openEdit(e: React.MouseEvent) {
    e.stopPropagation();
    setEditTitle(effTitle);
    onSetEditingNode(milestone.id);
  }

  function saveEdit(e?: React.MouseEvent) {
    e?.stopPropagation();
    onOverrideSave(milestone.id, { title: editTitle.trim() || undefined });
    onSetEditingNode(null);
  }

  function cancelEdit(e?: React.MouseEvent) {
    e?.stopPropagation();
    onSetEditingNode(null);
  }

  function resetTitle(e: React.MouseEvent) {
    e.stopPropagation();
    onOverrideClear(milestone.id);
    onSetEditingNode(null);
  }

  return (
    <div style={{ width: colW }} className="flex flex-col items-center">
      <div className="relative w-full px-10">
        <div
          ref={(el) => registerNode(milestone.id, el)}
          onClick={() => { if (!editOpen) onNodeClick(milestone.id); }}
          className="w-full cursor-pointer rounded-xl border-2 px-6 py-4 flex items-center gap-4 transition-all hover:opacity-90 hover:shadow-lg select-none"
          style={{
            background: bg, borderColor: bg,
            ...(isCurrent ? { outline: '2px solid rgba(255,255,255,0.45)', outlineOffset: 2 } : {}),
          }}
        >
          <div className="flex size-9 shrink-0 items-center justify-center rounded-full font-bold text-sm text-white"
            style={{ background: 'rgba(255,255,255,0.18)' }}>
            {milestone.number}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.65)' }}>
              Phase {milestone.number}
            </div>
            {editOpen ? (
              <div className="flex items-center gap-1.5 mt-0.5" onClick={(e) => e.stopPropagation()}>
                <input
                  autoFocus
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') cancelEdit(); }}
                  className="flex-1 min-w-0 text-sm font-semibold rounded px-2 py-0.5 focus:outline-none"
                  style={{ background: 'rgba(255,255,255,0.22)', color: 'white', caretColor: 'white' }}
                />
                <button onClick={saveEdit} title="Save" className="flex size-6 items-center justify-center rounded transition-colors shrink-0" style={{ background: 'rgba(255,255,255,0.22)', color: 'white' }}>
                  <Save className="size-3" />
                </button>
                {ov.title && (
                  <button onClick={resetTitle} title="Reset to default" className="flex size-6 items-center justify-center rounded transition-colors shrink-0 text-[9px] font-semibold" style={{ background: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.7)' }}>
                    ↺
                  </button>
                )}
                <button onClick={cancelEdit} title="Cancel" className="flex size-6 items-center justify-center rounded transition-colors shrink-0" style={{ background: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.7)' }}>
                  <X className="size-3" />
                </button>
              </div>
            ) : (
              <div className="text-sm font-semibold text-white leading-tight">{effTitle}</div>
            )}
          </div>
          {editMode && !editOpen && (
            <button onClick={openEdit} title="Edit phase name"
              className="flex size-6 shrink-0 items-center justify-center rounded transition-colors"
              style={{ background: 'rgba(255,255,255,0.18)', color: 'white' }}>
              <Pencil className="size-3" />
            </button>
          )}
          {!editMode && hasChildren && !isExpanded && (
            <div className="flex size-6 shrink-0 items-center justify-center rounded-full" style={{ background: 'rgba(255,255,255,0.18)' }}>
              <Plus className="size-3 text-white" />
            </div>
          )}
        </div>
        {isExpanded && (
          <button
            onClick={(e) => { e.stopPropagation(); onCollapseParent(milestone.id); }}
            title="Collapse milestone"
            className="absolute -top-2 -right-2 z-20 flex size-6 items-center justify-center rounded-full border bg-background shadow-md hover:bg-muted transition-colors"
            style={{ borderColor: `${bg}40`, color: bg }}
          >
            <Minus className="size-3" style={{ color: bg }} />
          </button>
        )}
      </div>

      <ChildrenSection expanded={isExpanded}>
        <div style={{
          margin: '4px 16px 16px',
          borderRadius: 18,
          border: '1px solid rgba(255,255,255,0.55)',
          background: 'rgba(255,255,255,0.30)',
          backdropFilter: 'blur(14px)',
          WebkitBackdropFilter: 'blur(14px)',
          boxShadow: '0 4px 24px rgba(27, 54, 103, 0.08)',
          paddingBottom: 12,
          // Explicit font-smoothing on the backdrop-filter layer
          WebkitFontSmoothing: 'antialiased',
          MozOsxFontSmoothing: 'grayscale',
        } as React.CSSProperties}>
          <NodeList nodes={children} depth={0} />
        </div>
      </ChildrenSection>
    </div>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

function Sidebar({ onClose, onSelect, currentNodeId }: {
  onClose: () => void;
  onSelect: (id: string) => void;
  currentNodeId: string | null;
}) {
  const { activeRoles, overrides } = useProcess();

  function nodeMatchesRoles(node: WorkflowNode): boolean {
    if (activeRoles.size === 0) return true;
    const roles = getNodeRoles(node);
    if (roles.some((r) => activeRoles.has(r))) return true;
    const ch = nodeChildren(node);
    return ch.some(nodeMatchesRoles);
  }

  return (
    <>
      {/* No backdrop — sidebar is a persistent floating panel */}
      <div className="fixed left-0 top-0 bottom-0 z-50 w-72 bg-background border-r shadow-xl overflow-y-auto flex flex-col">
        <div className="sticky top-0 flex items-center justify-between border-b bg-background px-4 py-3 shrink-0">
          <span className="font-semibold text-sm">Workflow Navigation</span>
          <button onClick={onClose} className="flex size-7 items-center justify-center rounded-md hover:bg-muted transition-colors">
            <X className="size-4" />
          </button>
        </div>
        <div className="p-3 space-y-1 flex-1 overflow-y-auto">
          {WORKFLOW.map((milestone) => {
            const bg = milestone.id === 'milestone-7' ? C_GREEN : C_BLUE;
            const visibleChildren = (milestone.children ?? []).filter(nodeMatchesRoles);
            const milestoneVisible = activeRoles.size === 0 || visibleChildren.length > 0;
            if (!milestoneVisible) return null;
            const sidebarTitle = overrides[milestone.id]?.title ?? milestone.title;
            return (
              <div key={milestone.id}>
                <button onClick={() => onSelect(milestone.id)}
                  className="w-full flex items-center gap-2 rounded-lg px-2.5 py-2 text-left hover:bg-muted/60 transition-colors">
                  <span className="flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white" style={{ background: bg }}>
                    {milestone.number}
                  </span>
                  <span className="text-sm font-semibold leading-tight text-foreground">{sidebarTitle}</span>
                </button>
                <div className="ml-2 mt-0.5 space-y-0.5">
                  {visibleChildren.map((node) => (
                    <button key={node.id} onClick={() => onSelect(node.id)}
                      className={cn('w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-left hover:bg-muted transition-colors', currentNodeId === node.id && 'bg-muted')}>
                      <span className="shrink-0">
                        {node.type === 'decision' ? <GitFork className="size-3 rotate-180" style={{ color: C_RED }} />
                          : node.type === 'parallel' ? <Layers className="size-3 text-blue-400" />
                          : node.type === 'stage' ? <span className="block size-3" />
                          : <Circle className="size-2.5 text-muted-foreground" />}
                      </span>
                      <span className={cn('truncate text-xs text-muted-foreground', node.type === 'stage' && 'font-semibold uppercase tracking-wide text-[10px]', currentNodeId === node.id && 'text-foreground font-medium')}>
                        {getNodeTitle(node)}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

// ─── ProcessMap ───────────────────────────────────────────────────────────────

export function ProcessMap() {
  const session = useSession();
  const isAdmin = session.roleTypes.includes('Administrator');

  const [transform, setTransform] = useState({ x: 60, y: 40, scale: 0.85 });
  const [isPanning, setIsPanning] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  const [expandedParents, setExpandedParents] = useState<Set<string>>(new Set());
  const [currentNodeId, setCurrentNodeId] = useState<string | null>(null);
  const [highlightedDecisions, setHighlightedDecisions] = useState<Map<string, 'A' | 'B'>>(new Map());
  const [activeRoles, setActiveRoles] = useState<Set<string>>(new Set());
  const [isAnimating, setIsAnimating] = useState(false);
  const [confetti, setConfetti] = useState<{ x: number; y: number } | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [overrides, setOverrides] = useState<Record<string, NodeOverride>>({});
  const [addedNodes, setAddedNodes] = useState<AddedNodeDef[]>([]);
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [addingAfterNodeId, setAddingAfterNodeId] = useState<string | null>(null);
  const [roleFilterOpen, setRoleFilterOpen] = useState(() => {
    if (typeof window === 'undefined') return true;
    const v = localStorage.getItem('process_role_filter_open');
    return v === null ? true : v === 'true';
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const nodeRefs = useRef(new Map<string, HTMLElement>());
  const transformRef = useRef(transform);
  const expandedParentsRef = useRef<Set<string>>(new Set());
  const panStartRef = useRef({ mx: 0, my: 0, tx: 0, ty: 0 });
  const clickAfterDragRef = useRef(false);
  const isPanningRef = useRef(false);
  const pendingFocusRef = useRef<string | null>(null);
  const pendingFocusForceRef = useRef(false);
  const sessionSaveRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastMouseRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => { transformRef.current = transform; }, [transform]);
  useEffect(() => { expandedParentsRef.current = expandedParents; }, [expandedParents]);

  const colW = useMemo(() =>
    Math.max(COL_BASE_W, ...WORKFLOW.map((m) => scanBucketWidth(m.children ?? [], 0))),
    [],
  );

  useEffect(() => {
    // Load overrides and added nodes from localStorage
    setOverrides(getOverrides());
    setAddedNodes(getAddedNodes());

    // Restore sessionStorage state if available
    const saved = sessionStorage.getItem('process_view_state');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.transform) setTransform(parsed.transform);
        if (parsed.expandedParents) setExpandedParents(new Set(parsed.expandedParents as string[]));
        if (parsed.activeRoles) setActiveRoles(new Set(parsed.activeRoles as string[]));
        if (parsed.currentNodeId) setCurrentNodeId(parsed.currentNodeId);
        return;
      } catch { /* ignore malformed */ }
    }
    // Default initial position
    const container = containerRef.current;
    if (!container) return;
    const { width } = container.getBoundingClientRect();
    const initScale = 0.85;
    const initX = Math.max(40, width / 2 - (colW * initScale) / 2);
    setTransform({ x: initX, y: 40, scale: initScale });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!pendingFocusRef.current) return;
    const id = pendingFocusRef.current;
    const force = pendingFocusForceRef.current;
    pendingFocusRef.current = null;
    pendingFocusForceRef.current = false;
    const t = setTimeout(() => focusNode(id, force), 100);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expandedParents]);

  // Debounced sessionStorage persistence
  useEffect(() => {
    if (sessionSaveRef.current) clearTimeout(sessionSaveRef.current);
    sessionSaveRef.current = setTimeout(() => {
      sessionStorage.setItem('process_view_state', JSON.stringify({
        transform,
        expandedParents: [...expandedParents],
        activeRoles: [...activeRoles],
        currentNodeId,
      }));
    }, 300);
  }, [transform, expandedParents, activeRoles, currentNodeId]);

  // Persist role filter panel open/closed preference
  useEffect(() => {
    localStorage.setItem('process_role_filter_open', String(roleFilterOpen));
  }, [roleFilterOpen]);

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
      const canvasX = (mx - x) / scale;
      const canvasY = (my - y) / scale;
      setTransform({ x: mx - canvasX * newScale, y: my - canvasY * newScale, scale: newScale });
    }
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, []);

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

  const focusNode = useCallback((nodeId: string, force = false) => {
    const el = nodeRefs.current.get(nodeId);
    const container = containerRef.current;
    if (!el || !container) return;
    const nodeRect = el.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    const { x, y, scale } = transformRef.current;
    const targetScale = Math.max(scale, ZOOM_THRESHOLD);

    // Threshold check: only recenter if forced or if node is mostly off-screen
    if (!force) {
      const vw = containerRect.width;
      const vh = containerRect.height;
      const nr = nodeRect;
      const visibleW = Math.max(0, Math.min(nr.right, containerRect.right) - Math.max(nr.left, containerRect.left));
      const visibleH = Math.max(0, Math.min(nr.bottom, containerRect.bottom) - Math.max(nr.top, containerRect.top));
      const nodeArea = Math.max(1, nr.width * nr.height);
      const visibleFraction = (visibleW * visibleH) / nodeArea;
      // Also check if node is in the bottom 40% — children will appear below and may be off-screen
      const nodeRelativeY = (nr.top - containerRect.top) / vh;
      if (visibleFraction > 0.6 && nodeRelativeY < 0.6 && targetScale === scale) return;
      // Partial pan: bring node to top-third of viewport so children below are visible
      const targetY = containerRect.top + vh * 0.22;
      const nodeCx = nr.left + nr.width / 2;
      if (targetScale !== scale) {
        const canvasCx = (nodeCx - containerRect.left - x) / scale;
        const canvasCy = (nr.top - containerRect.top - y) / scale;
        setIsAnimating(true);
        setTransform({ x: containerRect.width / 2 - canvasCx * targetScale, y: containerRect.height / 3 - canvasCy * targetScale, scale: targetScale });
        setTimeout(() => setIsAnimating(false), 400);
      } else {
        const dy = targetY - nr.top;
        setIsAnimating(true);
        setTransform((prev) => ({ ...prev, y: prev.y + dy }));
        setTimeout(() => setIsAnimating(false), 400);
      }
      return;
    }

    setIsAnimating(true);
    const nodeCx = nodeRect.left + nodeRect.width / 2;
    const nodeCy = nodeRect.top + nodeRect.height / 2;
    if (targetScale !== scale) {
      const canvasCx = (nodeCx - containerRect.left - x) / scale;
      const canvasCy = (nodeCy - containerRect.top - y) / scale;
      setTransform({ x: containerRect.width / 2 - canvasCx * targetScale, y: containerRect.height / 2 - canvasCy * targetScale, scale: targetScale });
    } else {
      const dx = containerRect.left + containerRect.width / 2 - nodeCx;
      const dy = containerRect.top + containerRect.height / 2 - nodeCy;
      setTransform((prev) => ({ ...prev, x: prev.x + dx, y: prev.y + dy }));
    }
    setTimeout(() => setIsAnimating(false), 400);
  }, []);

  function doZoom(factor: number) {
    const container = containerRef.current;
    if (!container) return;
    const mp = lastMouseRef.current;
    const cx = mp ? mp.x : container.clientWidth / 2;
    const cy = mp ? mp.y : container.clientHeight / 2;
    const { x, y, scale } = transformRef.current;
    const newScale = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, scale * factor));
    const ratio = newScale / scale;
    setTransform({ x: cx - (cx - x) * ratio, y: cy - (cy - y) * ratio, scale: newScale });
  }

  const registerNode = useCallback((id: string, el: HTMLElement | null) => {
    if (el) nodeRefs.current.set(id, el);
    else nodeRefs.current.delete(id);
  }, []);

  function expandAncestors(nodeId: string) {
    const ancestors = findAncestors(WORKFLOW as WorkflowNode[], nodeId) ?? [];
    if (ancestors.length > 0) {
      setExpandedParents((prev) => {
        const next = new Set(prev);
        ancestors.forEach((a) => next.add(a));
        return next;
      });
    }
  }

  function expandForRole(role: string) {
    const allNodes = flattenWorkflow(WORKFLOW as WorkflowNode[]);
    const toExpand = new Set<string>();
    for (const node of allNodes) {
      const roles = getNodeRoles(node);
      if (roles.includes(role as Role)) {
        const ancestors = findAncestors(WORKFLOW as WorkflowNode[], node.id) ?? [];
        ancestors.forEach((a) => toExpand.add(a));
      }
    }
    setExpandedParents((prev) => new Set([...prev, ...toExpand]));
  }

  function toggleRole(role: string) {
    const isAdding = !activeRoles.has(role);
    setActiveRoles((prev) => {
      const next = new Set(prev);
      if (next.has(role)) next.delete(role); else next.add(role);
      return next;
    });
    if (isAdding) expandForRole(role);
  }

  function fireConfettiAt(id: string, delay = 0) {
    setTimeout(() => {
      const el = nodeRefs.current.get(id);
      const rect = el?.getBoundingClientRect();
      setConfetti({
        x: rect ? rect.left + rect.width / 2 : window.innerWidth / 2,
        y: rect ? rect.top + rect.height / 2 : window.innerHeight / 3,
      });
    }, delay);
  }

  const onNodeClick = useCallback((id: string) => {
    if (clickAfterDragRef.current) return;

    if (id === 'milestone-7') {
      fireConfettiAt(id);
      setCurrentNodeId(id);
      return;
    }

    const allNodes = flattenWorkflow(WORKFLOW as WorkflowNode[]);
    const node = allNodes.find((n) => n.id === id);
    if (!node) return;

    const ch = nodeChildren(node);
    const isAlreadyExpanded = expandedParentsRef.current.has(id);
    const group = node.type === 'task' ? (node as TaskNode).exclusiveGroup : undefined;

    if (group) {
      // Group members always use expandedParents (whether or not they have children)
      if (isAlreadyExpanded) {
        setExpandedParents((prev) => { const n = new Set(prev); n.delete(id); return n; });
        setExpandedTaskId(null);
      } else {
        setExpandedParents((prev) => {
          const next = new Set(prev);
          for (const n of allNodes) {
            if (n.type === 'task' && (n as TaskNode).exclusiveGroup === group && n.id !== id) {
              next.delete(n.id);
            }
          }
          next.add(id);
          return next;
        });
      }
      setCurrentNodeId(id);
      return;
    }

    if (ch.length > 0 && !isAlreadyExpanded) {
      // Auto-expand any single-child chain descending from this node
      const toExpand = new Set<string>([id]);
      let cur: WorkflowNode = node;
      while (true) {
        const children = nodeChildren(cur);
        if (children.length !== 1) break;
        toExpand.add(children[0].id);
        cur = children[0];
      }
      setExpandedParents((prev) => { const n = new Set(prev); toExpand.forEach((eid) => n.add(eid)); return n; });
      setCurrentNodeId(id);
      pendingFocusRef.current = id;
      pendingFocusForceRef.current = false;
    } else if (ch.length > 0 && isAlreadyExpanded) {
      setExpandedParents((prev) => { const n = new Set(prev); n.delete(id); return n; });
      setExpandedTaskId(null);
      setCurrentNodeId(id);
    } else if (node.type === 'task' && (node as TaskNode).details.length > 0) {
      setExpandedTaskId((prev) => (prev === id ? null : id));
      setCurrentNodeId(id);
      focusNode(id);
    } else {
      setCurrentNodeId(id);
      focusNode(id);
    }
  }, [focusNode]);

  const onCollapseParent = useCallback((id: string) => {
    setExpandedParents((prev) => { const n = new Set(prev); n.delete(id); return n; });
    setExpandedTaskId(null);
  }, []);

  const onDecisionOption = useCallback((decisionId: string, option: 'A' | 'B' | null) => {
    setHighlightedDecisions((prev) => {
      const next = new Map(prev);
      if (option === null) next.delete(decisionId); else next.set(decisionId, option);
      return next;
    });
  }, []);

  const flatNodes = useMemo(() => flattenWorkflow(WORKFLOW as WorkflowNode[]), []);
  const currentIndex = flatNodes.findIndex((n) => n.id === currentNodeId);
  const interactive = transform.scale >= ZOOM_THRESHOLD;

  // Arrow key navigation — Up/Right advance, Down/Left go back
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        goToIndex(currentIndex + 1);
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        goToIndex(currentIndex - 1);
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex]);

  function goToIndex(idx: number) {
    const node = flatNodes[idx];
    if (!node) return;
    expandAncestors(node.id);
    setCurrentNodeId(node.id);
    if (node.type === 'task' && (node as TaskNode).details.length > 0) setExpandedTaskId(node.id);
    else setExpandedTaskId(null);
    pendingFocusRef.current = node.id;
    pendingFocusForceRef.current = true;

    if (node.id === 'milestone-7') {
      setTimeout(() => focusNode('milestone-7', true), 100);
      fireConfettiAt('milestone-7', 480);
    }
  }

  function handleSidebarSelect(id: string) {
    expandAncestors(id);
    setCurrentNodeId(id);
    pendingFocusRef.current = id;
    pendingFocusForceRef.current = true;
  }

  function collapseAll() {
    setExpandedParents(new Set());
    setExpandedTaskId(null);
    setActiveRoles(new Set());
    const container = containerRef.current;
    if (container) {
      const { width } = container.getBoundingClientRect();
      const initScale = 0.85;
      const initX = Math.max(40, width / 2 - (colW * initScale) / 2);
      setIsAnimating(true);
      setTransform({ x: initX, y: 40, scale: initScale });
      setTimeout(() => setIsAnimating(false), 400);
    }
  }

  const onOverrideSave = useCallback((nodeId: string, override: NodeOverride) => {
    saveOverride(nodeId, override);
    setOverrides(getOverrides());
  }, []);

  const onOverrideClear = useCallback((nodeId: string) => {
    clearOverride(nodeId);
    setOverrides(getOverrides());
  }, []);

  const onAddNode = useCallback((afterNodeId: string, data: Omit<AddedNodeDef, 'id' | 'afterNodeId'>) => {
    addNode({ afterNodeId, ...data });
    setAddedNodes(getAddedNodes());
  }, []);

  const onRemoveAddedNode = useCallback((id: string) => {
    removeAddedNode(id);
    setAddedNodes(getAddedNodes());
  }, []);

  const onUpdateAddedNode = useCallback((id: string, data: Partial<Omit<AddedNodeDef, 'id' | 'afterNodeId'>>) => {
    updateAddedNode(id, data);
    setAddedNodes(getAddedNodes());
  }, []);

  const onSetEditingNode = useCallback((id: string | null) => setEditingNodeId(id), []);
  const onSetAddingAfter = useCallback((id: string | null) => setAddingAfterNodeId(id), []);

  function handleToggleEditMode() {
    if (editMode) {
      if (editingNodeId !== null || addingAfterNodeId !== null) {
        if (!window.confirm('You have unsaved edits. Discard them and exit editing?')) return;
      }
      setEditingNodeId(null);
      setAddingAfterNodeId(null);
      setEditMode(false);
    } else {
      setEditMode(true);
    }
  }

  const ctxValue = useMemo<ProcessCtxValue>(
    () => ({
      expandedTaskId, expandedParents, highlightedDecisions, activeRoles,
      currentNodeId, interactive, editMode, overrides, addedNodes,
      editingNodeId, addingAfterNodeId, onSetEditingNode, onSetAddingAfter,
      onOverrideSave, onOverrideClear, onAddNode, onRemoveAddedNode, onUpdateAddedNode,
      registerNode, onNodeClick, onCollapseParent, onDecisionOption,
    }),
    [expandedTaskId, expandedParents, highlightedDecisions, activeRoles, currentNodeId, interactive,
     editMode, overrides, addedNodes, editingNodeId, addingAfterNodeId,
     onSetEditingNode, onSetAddingAfter, onOverrideSave, onOverrideClear,
     onAddNode, onRemoveAddedNode, onUpdateAddedNode,
     registerNode, onNodeClick, onCollapseParent, onDecisionOption],
  );

  return (
    <ProcessCtx.Provider value={ctxValue}>
      {confetti && <ConfettiCanvas x={confetti.x} y={confetti.y} onDone={() => setConfetti(null)} />}

      <div
        ref={containerRef}
        className={cn(
          'relative w-full overflow-hidden select-none',
          'bg-[radial-gradient(circle,oklch(0.922_0_0)_1px,transparent_1px)] bg-size-[24px_24px]',
          isPanning ? 'cursor-grabbing' : 'cursor-grab',
        )}
        style={{ height: 'calc(100vh - 4rem)' }}
        onMouseDown={handleMouseDown}
        onMouseMove={(e) => {
          const rect = containerRef.current?.getBoundingClientRect();
          if (rect) lastMouseRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
        }}
      >
        {/* Canvas — zoom for crisp text at any scale; translate3d for smooth GPU pan */}
        <div
          className="antialiased"
          style={{
            position: 'absolute', top: 0, left: 0,
            transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
            zoom: transform.scale,
            transition: isAnimating
              ? 'transform 0.35s cubic-bezier(0.4,0,0.2,1), zoom 0.35s cubic-bezier(0.4,0,0.2,1)'
              : 'none',
            WebkitFontSmoothing: 'antialiased',
            MozOsxFontSmoothing: 'grayscale',
          } as React.CSSProperties}
        >
          <div className="flex flex-col items-center" style={{ padding: '40px 0 80px' }}>
            {WORKFLOW.map((milestone, i) => (
              <React.Fragment key={milestone.id}>
                {i > 0 && <FluidConnector height={FLUID_H} />}
                <MilestoneBlock milestone={milestone} colW={colW} />
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Sidebar toggle — clicking again closes it */}
        <div className="absolute top-4 left-4 z-10">
          <button onClick={() => setSidebarOpen((prev) => !prev)}
            className={cn('flex size-9 items-center justify-center rounded-lg border bg-background/90 backdrop-blur-sm shadow-sm hover:bg-background transition-colors', sidebarOpen && 'bg-background border-primary/40')}>
            <Menu className="size-4" />
          </button>
        </div>

        {/* Right-side controls: zoom/info, role filter, admin edit */}
        <div className="absolute top-4 right-4 z-10 flex flex-col items-end gap-2">
          {/* Zoom + Info row */}
          <div className="flex items-center gap-1.5">
            <button onClick={() => setInfoOpen(true)} title="Process Reference"
              className="flex size-9 items-center justify-center rounded-lg border bg-background/90 backdrop-blur-sm shadow-sm hover:bg-background transition-colors">
              <Info className="size-4" />
            </button>
            <div className="w-px h-5 bg-border" />
            <button onClick={() => doZoom(1 / 1.2)} className="flex size-9 items-center justify-center rounded-lg border bg-background/90 backdrop-blur-sm shadow-sm hover:bg-background transition-colors">
              <Minus className="size-4" />
            </button>
            <div className="min-w-13 text-center text-xs font-mono font-medium border rounded-lg bg-background/90 backdrop-blur-sm shadow-sm px-2 h-9 flex items-center justify-center">
              {Math.round(transform.scale * 100)}%
            </div>
            <button onClick={() => doZoom(1.2)} className="flex size-9 items-center justify-center rounded-lg border bg-background/90 backdrop-blur-sm shadow-sm hover:bg-background transition-colors">
              <Plus className="size-4" />
            </button>
          </div>

          {/* Collapse All */}
          {(expandedParents.size > 0 || expandedTaskId !== null) && (
            <button onClick={collapseAll}
              className="flex items-center gap-1.5 rounded-lg border bg-background/90 backdrop-blur-sm shadow-sm hover:bg-background transition-colors px-3 h-8 text-xs font-medium text-muted-foreground whitespace-nowrap">
              <Minus className="size-3" />
              Collapse All
            </button>
          )}

          {/* Role filter panel */}
          <div className="bg-background/90 backdrop-blur-sm border rounded-xl shadow-sm overflow-hidden" style={{ maxWidth: 180 }}>
            <button
              onClick={() => setRoleFilterOpen((v) => !v)}
              className="w-full flex items-center justify-between gap-2 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
            >
              <span className="flex items-center gap-1.5">
                Roles
                {activeRoles.size > 0 && (
                  <span className="text-[9px] font-bold rounded-full px-1.5 py-0.5 text-white" style={{ background: C_BLUE }}>{activeRoles.size}</span>
                )}
              </span>
              {roleFilterOpen ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
            </button>
            {roleFilterOpen && (
              <div className="px-2 pb-2 flex flex-col gap-0.5">
                {ALL_ROLES.map((role) => (
                  <button key={role} onClick={() => toggleRole(role)}
                    className="w-full text-left rounded-md px-2 py-1 text-[10px] font-medium transition-colors"
                    style={activeRoles.has(role)
                      ? { background: C_BLUE, color: 'white' }
                      : { color: 'var(--muted-foreground)' }
                    }
                  >
                    {role}
                  </button>
                ))}
                {activeRoles.size > 0 && (
                  <button onClick={() => setActiveRoles(new Set())}
                    className="mt-1 w-full text-center text-[10px] text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center gap-1">
                    <X className="size-2.5" /> Clear
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Admin edit toggle */}
          {isAdmin && (
            <button
              onClick={handleToggleEditMode}
              className={cn(
                'flex items-center gap-1.5 rounded-lg border bg-background/90 backdrop-blur-sm shadow-sm transition-colors px-3 h-8 text-xs font-medium whitespace-nowrap',
                editMode ? 'border-amber-400 text-amber-600 bg-amber-50/90' : 'text-muted-foreground hover:bg-background',
              )}
            >
              <Pencil className="size-3" />
              {editMode ? 'Editing' : 'Edit'}
            </button>
          )}
        </div>

        {!interactive && (
          <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
            <div className="text-xs text-muted-foreground bg-background/80 backdrop-blur-sm rounded-full px-3 py-1.5 border">
              Zoom in to interact with nodes
            </div>
          </div>
        )}

        {/* Stepper pill */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10">
          <div className="flex items-center gap-3 bg-background/95 backdrop-blur-sm border rounded-full shadow-md px-4 py-2">
            <button onClick={() => goToIndex(currentIndex - 1)} disabled={currentIndex <= 0}
              className="flex size-7 items-center justify-center rounded-full hover:bg-muted disabled:opacity-30 transition-colors shrink-0">
              <ChevronLeft className="size-4" />
            </button>
            <span className="text-xs text-muted-foreground w-52 text-center truncate shrink-0">
              {currentNodeId ? getNodeTitle(flatNodes.find((n) => n.id === currentNodeId)) : 'Click a node or use arrows to navigate'}
            </span>
            <button onClick={() => goToIndex(currentIndex + 1)} disabled={currentIndex < 0 || currentIndex >= flatNodes.length - 1}
              className="flex size-7 items-center justify-center rounded-full hover:bg-muted disabled:opacity-30 transition-colors shrink-0">
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>
      </div>

      {sidebarOpen && <Sidebar onClose={() => setSidebarOpen(false)} onSelect={handleSidebarSelect} currentNodeId={currentNodeId} />}
      {infoOpen && <InfoModal onClose={() => setInfoOpen(false)} />}
    </ProcessCtx.Provider>
  );
}
