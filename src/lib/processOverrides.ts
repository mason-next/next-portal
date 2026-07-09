export interface NodeOverride {
  title?: string;
  summary?: string;
  details?: string[];
  roles?: string[];
  templates?: string[];
  hidden?: boolean;
}

export interface AddedNodeDef {
  id: string;
  afterNodeId: string;
  title: string;
  summary: string;
  details: string[];
  roles: string[];
}

const OVERRIDES_KEY = 'sop_process_overrides';
const ADDED_NODES_KEY = 'sop_process_added_nodes';

// ─── Node overrides ────────────────────────────────────────────────────────────

export function getOverrides(): Record<string, NodeOverride> {
  if (typeof window === 'undefined') return {};
  const raw = localStorage.getItem(OVERRIDES_KEY);
  return raw ? (JSON.parse(raw) as Record<string, NodeOverride>) : {};
}

export function saveOverride(nodeId: string, override: NodeOverride): void {
  const all = getOverrides();
  all[nodeId] = { ...all[nodeId], ...override };
  localStorage.setItem(OVERRIDES_KEY, JSON.stringify(all));
}

export function clearOverride(nodeId: string): void {
  const all = getOverrides();
  delete all[nodeId];
  localStorage.setItem(OVERRIDES_KEY, JSON.stringify(all));
}

// ─── Added nodes ───────────────────────────────────────────────────────────────

export function getAddedNodes(): AddedNodeDef[] {
  if (typeof window === 'undefined') return [];
  const raw = localStorage.getItem(ADDED_NODES_KEY);
  return raw ? (JSON.parse(raw) as AddedNodeDef[]) : [];
}

export function addNode(data: Omit<AddedNodeDef, 'id'>): AddedNodeDef {
  const all = getAddedNodes();
  const node: AddedNodeDef = {
    ...data,
    id: `added-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  };
  all.push(node);
  localStorage.setItem(ADDED_NODES_KEY, JSON.stringify(all));
  return node;
}

export function removeAddedNode(id: string): void {
  const all = getAddedNodes().filter((n) => n.id !== id);
  localStorage.setItem(ADDED_NODES_KEY, JSON.stringify(all));
}

export function updateAddedNode(id: string, data: Partial<Omit<AddedNodeDef, 'id' | 'afterNodeId'>>): void {
  const all = getAddedNodes().map((n) => (n.id === id ? { ...n, ...data } : n));
  localStorage.setItem(ADDED_NODES_KEY, JSON.stringify(all));
}
