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

// Keys are namespaced by project type so each type has its own independent set of edits.
function overridesKey(type: string) {
  return `sop_process_overrides_${type}`;
}
function addedNodesKey(type: string) {
  return `sop_process_added_nodes_${type}`;
}

// ─── Node overrides ────────────────────────────────────────────────────────────

export function getOverrides(type: string): Record<string, NodeOverride> {
  if (typeof window === 'undefined') return {};
  const raw = localStorage.getItem(overridesKey(type));
  return raw ? (JSON.parse(raw) as Record<string, NodeOverride>) : {};
}

export function saveOverride(nodeId: string, override: NodeOverride, type: string): void {
  const all = getOverrides(type);
  all[nodeId] = { ...all[nodeId], ...override };
  localStorage.setItem(overridesKey(type), JSON.stringify(all));
}

export function clearOverride(nodeId: string, type: string): void {
  const all = getOverrides(type);
  delete all[nodeId];
  localStorage.setItem(overridesKey(type), JSON.stringify(all));
}

// ─── Added nodes ───────────────────────────────────────────────────────────────

export function getAddedNodes(type: string): AddedNodeDef[] {
  if (typeof window === 'undefined') return [];
  const raw = localStorage.getItem(addedNodesKey(type));
  return raw ? (JSON.parse(raw) as AddedNodeDef[]) : [];
}

export function addNode(data: Omit<AddedNodeDef, 'id'>, type: string): AddedNodeDef {
  const all = getAddedNodes(type);
  const node: AddedNodeDef = {
    ...data,
    id: `added-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  };
  all.push(node);
  localStorage.setItem(addedNodesKey(type), JSON.stringify(all));
  return node;
}

export function removeAddedNode(id: string, type: string): void {
  const all = getAddedNodes(type).filter((n) => n.id !== id);
  localStorage.setItem(addedNodesKey(type), JSON.stringify(all));
}

export function updateAddedNode(id: string, data: Partial<Omit<AddedNodeDef, 'id' | 'afterNodeId'>>, type: string): void {
  const all = getAddedNodes(type).map((n) => (n.id === id ? { ...n, ...data } : n));
  localStorage.setItem(addedNodesKey(type), JSON.stringify(all));
}
