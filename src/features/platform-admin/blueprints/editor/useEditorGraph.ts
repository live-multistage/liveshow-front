'use client';

import { useMemo, useReducer } from 'react';
import type {
  BlueprintAnalysisError, BlueprintCatalogEntry, BlueprintEdge, BlueprintGraph, BlueprintOutputField,
} from '@live-show/api-contracts';

export type Port = string;
export interface XY { x: number; y: number }
export interface EditorNode { id: string; node: string; version: number; config: Record<string, unknown>; position: XY }
export interface EditorState {
  nodes: EditorNode[];
  edges: BlueprintEdge[];
  selectedId: string | null;
  // dirty = revision !== savedRevision, so an edit made while a save is in
  // flight keeps the graph dirty after that save resolves.
  revision: number;
  savedRevision: number;
  // Bumped on every 'load' action (not reset by graphToState). Lets the
  // Inspector key its per-node drafts on "which graph load" in addition to
  // node id, so switching to a version with the same node ids doesn't leave
  // a stale ConditionBuilder/WaitUntilBuilder draft on screen.
  loadId: number;
}

export type EditorAction =
  | { type: 'load'; graph: BlueprintGraph | null; selectedId?: string | null }
  | { type: 'add'; entry: Pick<BlueprintCatalogEntry, 'key' | 'version' | 'kind'>; position?: XY }
  | { type: 'move'; id: string; position: XY }
  | { type: 'connect'; from: string; to: string; port?: Port }
  | { type: 'disconnect'; edge: BlueprintEdge }
  | { type: 'remove'; id: string }
  | { type: 'duplicate'; id: string }
  | { type: 'rename'; id: string; newId: string }
  | { type: 'setConfig'; id: string; field: string; value: unknown }
  | { type: 'select'; id: string | null }
  | { type: 'saved'; revision: number };

export const EMPTY_STATE: EditorState = { nodes: [], edges: [], selectedId: null, revision: 0, savedRevision: 0, loadId: 0 };

const COL = 240;
const ROW = 120;
// Same rule as the orchestrator analyzer (domain/analyzer.ts NODE_ID).
const NODE_ID = /^[A-Za-z0-9_-]{1,64}$/;

// Prefixes follow the orchestrator fixtures (t, e1, w, c, n, m, end…).
const PREFIX: Record<string, string> = {
  'core.end': 'end', 'core.condition': 'c', 'core.waitUntil': 'w', 'events.byId': 'e', 'wishlist.stillSaved': 's',
  'ticketing.hasAccess': 'a', 'notifications.inApp': 'n', 'mailing.sendEmail': 'm', 'account.profile': 'p',
  'http.request': 'h', 'core.delay': 'd',
};

export const catalogKey = (key: string, version: number) => `${key}@${version}`;
export const isDirty = (s: EditorState) => s.revision !== s.savedRevision;

function prefixFor(entry: Pick<BlueprintCatalogEntry, 'key' | 'kind'>): string {
  if (entry.kind === 'trigger') return 't';
  return PREFIX[entry.key] ?? (entry.key.split('.').pop() ?? 'n').charAt(0).toLowerCase();
}

export function nextNodeId(prefix: string, taken: Set<string>): string {
  if (prefix === 't' && !taken.has('t')) return 't';
  let n = 1;
  while (taken.has(`${prefix}${n}`)) n += 1;
  return `${prefix}${n}`;
}

/** Longest-path layering from the roots; bounded so a cyclic import still lays out. */
function autoLayout(graph: BlueprintGraph): Map<string, XY> {
  const depth = new Map(graph.nodes.map((n) => [n.id, 0]));
  for (let i = 0; i < graph.nodes.length; i += 1) {
    for (const e of graph.edges) {
      const d = (depth.get(e.from) ?? 0) + 1;
      if (d > (depth.get(e.to) ?? 0) && d < graph.nodes.length) depth.set(e.to, d);
    }
  }
  const rows = new Map<number, number>();
  const out = new Map<string, XY>();
  for (const n of graph.nodes) {
    const col = depth.get(n.id) ?? 0;
    const row = rows.get(col) ?? 0;
    rows.set(col, row + 1);
    out.set(n.id, { x: col * COL, y: row * ROW });
  }
  return out;
}

export function graphToState(graph: BlueprintGraph | null, selectedId: string | null = null): EditorState {
  if (!graph) return EMPTY_STATE;
  const layout = autoLayout(graph);
  return {
    ...EMPTY_STATE,
    nodes: graph.nodes.map((n) => ({
      id: n.id, node: n.node, version: n.version, config: n.config, position: n.position ?? (layout.get(n.id) as XY),
    })),
    edges: graph.edges.map((e) => (e.port ? { from: e.from, to: e.to, port: e.port } : { from: e.from, to: e.to })),
    selectedId: selectedId && graph.nodes.some((n) => n.id === selectedId) ? selectedId : null,
  };
}

export function stateToGraph(state: EditorState): BlueprintGraph {
  return {
    schemaVersion: 1,
    nodes: state.nodes.map(({ id, node, version, config, position }) => ({
      id, node, version, config, position: { x: Math.round(position.x), y: Math.round(position.y) },
    })),
    edges: state.edges.map((e) => (e.port ? { from: e.from, to: e.to, port: e.port } : { from: e.from, to: e.to })),
  };
}

function reachableFrom(edges: BlueprintEdge[], start: string): Set<string> {
  const seen = new Set<string>([start]);
  const stack = [start];
  while (stack.length) {
    const id = stack.pop() as string;
    for (const e of edges) if (e.from === id && !seen.has(e.to)) { seen.add(e.to); stack.push(e.to); }
  }
  return seen;
}

function reaches(edges: BlueprintEdge[], from: string, to: string): boolean {
  return reachableFrom(edges, from).has(to);
}

function renameRefs(value: unknown, from: string, to: string): unknown {
  if (typeof value === 'string') return value.replace(new RegExp(`\\{\\{(\\s*)${from}\\.`, 'g'), `{{$1${to}.`);
  if (Array.isArray(value)) return value.map((v) => renameRefs(v, from, to));
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, renameRefs(v, from, to)]));
  }
  return value;
}

const bump = (s: EditorState, patch: Partial<EditorState>): EditorState => ({ ...s, ...patch, revision: s.revision + 1 });

export function editorReducer(state: EditorState, action: EditorAction): EditorState {
  switch (action.type) {
    case 'load':
      return { ...graphToState(action.graph, action.selectedId ?? null), loadId: state.loadId + 1 };
    case 'select':
      return { ...state, selectedId: action.id };
    case 'saved':
      return { ...state, savedRevision: action.revision };
    case 'add': {
      const id = nextNodeId(prefixFor(action.entry), new Set(state.nodes.map((n) => n.id)));
      const last = state.nodes[state.nodes.length - 1];
      const position = action.position ?? (last ? { x: last.position.x + COL, y: last.position.y } : { x: 0, y: 0 });
      const node: EditorNode = { id, node: action.entry.key, version: action.entry.version, config: {}, position };
      return bump(state, { nodes: [...state.nodes, node], selectedId: id });
    }
    case 'move': {
      const current = state.nodes.find((n) => n.id === action.id);
      if (!current || (current.position.x === action.position.x && current.position.y === action.position.y)) return state;
      return bump(state, { nodes: state.nodes.map((n) => (n.id === action.id ? { ...n, position: action.position } : n)) });
    }
    case 'connect': {
      const { from, to } = action;
      const port = action.port;
      if (from === to || reaches(state.edges, to, from)) return state;
      // A node has one outgoing edge per port (none = the single "next"), so a
      // new connection from an occupied port replaces the old one.
      const kept = state.edges.filter((e) => !(e.from === from && e.port === port));
      return bump(state, { edges: [...kept, port ? { from, to, port } : { from, to }] });
    }
    case 'disconnect': {
      const { edge } = action;
      const edges = state.edges.filter((e) => !(e.from === edge.from && e.to === edge.to && e.port === edge.port));
      return edges.length === state.edges.length ? state : bump(state, { edges });
    }
    case 'remove':
      return bump(state, {
        nodes: state.nodes.filter((n) => n.id !== action.id),
        edges: state.edges.filter((e) => e.from !== action.id && e.to !== action.id),
        selectedId: state.selectedId === action.id ? null : state.selectedId,
      });
    case 'duplicate': {
      const source = state.nodes.find((n) => n.id === action.id);
      if (!source) return state;
      const id = nextNodeId(source.id.replace(/\d+$/, '') || 'n', new Set(state.nodes.map((n) => n.id)));
      const copy: EditorNode = {
        ...source, id, config: structuredClone(source.config), position: { x: source.position.x + 30, y: source.position.y + 30 },
      };
      return bump(state, { nodes: [...state.nodes, copy], selectedId: id });
    }
    case 'rename': {
      const { id, newId } = action;
      if (id === newId || !NODE_ID.test(newId) || state.nodes.some((n) => n.id === newId)) return state;
      return bump(state, {
        nodes: state.nodes.map((n) => ({
          ...n, id: n.id === id ? newId : n.id, config: renameRefs(n.config, id, newId) as Record<string, unknown>,
        })),
        edges: state.edges.map((e) => ({ ...e, from: e.from === id ? newId : e.from, to: e.to === id ? newId : e.to })),
        selectedId: state.selectedId === id ? newId : state.selectedId,
      });
    }
    case 'setConfig': {
      const { id, field, value } = action;
      return bump(state, {
        nodes: state.nodes.map((n) => {
          if (n.id !== id) return n;
          const config = { ...n.config };
          if (value === undefined) delete config[field];
          else config[field] = value;
          return { ...n, config };
        }),
      });
    }
  }
}

export interface AvailableField {
  nodeId: string; nodeLabel: string; field: string; path: string[]; out: BlueprintOutputField; depth: number;
}

export function portsOfEntry(entry: BlueprintCatalogEntry): { name: string; optional: boolean }[] | null {
  return entry.ports ? entry.ports.map((name) => ({ name, optional: entry.optionalPorts?.includes(name) ?? false })) : null;
}

/**
 * Mirrors the orchestrator analyzer's port-visibility rule: a port-scoped
 * output of `source` is visible to `viewerId` only if `viewerId` is reachable
 * from that port's edge target, and not also reachable from any of
 * `source`'s other port edges (excludes nodes past a diamond re-join).
 */
function visibleViaPort(edges: BlueprintEdge[], source: string, port: string, viewerId: string): boolean {
  const portEdges = edges.filter((e) => e.from === source && e.port);
  const mine = portEdges.find((e) => e.port === port);
  if (!mine || !reachableFrom(edges, mine.to).has(viewerId)) return false;
  return !portEdges.some((e) => e.port !== port && reachableFrom(edges, e.to).has(viewerId));
}

function collectFields(
  viewerId: string, edges: BlueprintEdge[], sourceId: string, nodeLabel: string,
  field: string, spec: BlueprintOutputField, path: string[], out: AvailableField[],
): void {
  if (spec.port && !visibleViaPort(edges, sourceId, spec.port, viewerId)) return;
  out.push({ nodeId: sourceId, nodeLabel, field, path, out: spec, depth: path.length });
  if (typeof spec.type === 'object' && spec.type !== null && 'object' in spec.type) {
    for (const [key, sub] of Object.entries(spec.type.object)) {
      collectFields(viewerId, edges, sourceId, nodeLabel, field, sub, [...path, key], out);
    }
  }
}

/**
 * Outputs a node can reference: its ancestors' (the analyzer narrows this to
 * nodes on every path), or — for a trigger's dedupeKey — the trigger's own.
 * Object outputs are flattened: one entry per leaf AND per object/list node,
 * so a picker can offer either the whole object/list or a nested leaf.
 */
export function availableFields(state: EditorState, catalog: Map<string, BlueprintCatalogEntry>, nodeId: string): AvailableField[] {
  const self = state.nodes.find((n) => n.id === nodeId);
  if (!self) return [];
  const selfEntry = catalog.get(catalogKey(self.node, self.version));
  const ids = new Set<string>();
  if (selfEntry?.kind === 'trigger') ids.add(nodeId);
  else {
    const stack = [nodeId];
    while (stack.length) {
      const id = stack.pop() as string;
      for (const e of state.edges) if (e.to === id && !ids.has(e.from)) { ids.add(e.from); stack.push(e.from); }
    }
  }
  const result: AvailableField[] = [];
  for (const n of state.nodes) {
    if (!ids.has(n.id)) continue;
    const entry = catalog.get(catalogKey(n.node, n.version));
    if (!entry) continue;
    for (const [field, spec] of Object.entries(entry.outputs)) {
      collectFields(nodeId, state.edges, n.id, entry.label, field, spec, [], result);
    }
  }
  return result;
}

export function errorCountByNode(errors: BlueprintAnalysisError[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const e of errors) if (e.nodeId) counts.set(e.nodeId, (counts.get(e.nodeId) ?? 0) + 1);
  return counts;
}

export function useEditorGraph() {
  const [state, dispatch] = useReducer(editorReducer, EMPTY_STATE);
  const graph = useMemo(() => stateToGraph(state), [state]);
  return { state, dispatch, graph, dirty: isDirty(state) };
}
