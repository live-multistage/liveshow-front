import { describe, expect, it } from 'vitest';
import type { BlueprintGraph } from '@live-show/api-contracts';
import buyers from './__fixtures__/reminder-buyers.json';
import savers from './__fixtures__/reminder-savers.json';
import { CATALOG_MAP } from './__fixtures__/catalog';
import {
  EMPTY_STATE, availableFields, editorReducer, errorCountByNode, graphToState, isDirty, nextNodeId, stateToGraph,
  type EditorAction, type EditorState,
} from './useEditorGraph';

const stripPositions = (g: BlueprintGraph) => ({ ...g, nodes: g.nodes.map(({ position: _p, ...n }) => n) });
const run = (state: EditorState, ...actions: EditorAction[]) => actions.reduce(editorReducer, state);
const entry = (key: string) => CATALOG_MAP.get(`${key}@1`) as NonNullable<ReturnType<typeof CATALOG_MAP.get>>;

describe.each([['reminder-buyers', buyers], ['reminder-savers', savers]])('%s fixture round-trip', (_name, fixture) => {
  const graph = fixture as BlueprintGraph;

  it('serializes back to the input apart from added positions', () => {
    const out = stateToGraph(graphToState(graph));
    expect(stripPositions(out)).toEqual(graph);
    expect(out.nodes.every((n) => Number.isInteger(n.position?.x) && Number.isInteger(n.position?.y))).toBe(true);
  });

  it('keeps saved positions on a second load', () => {
    const once = stateToGraph(graphToState(graph));
    once.nodes[1].position = { x: 999, y: 7 };
    expect(stateToGraph(graphToState(once))).toEqual(once);
  });

  it('lays out columns by depth from the trigger', () => {
    const s = graphToState(graph);
    const x = (id: string) => s.nodes.find((n) => n.id === id)?.position.x ?? -1;
    expect(x('t')).toBe(0);
    expect(x('e1')).toBeGreaterThan(x('t'));
    expect(x('end')).toBeGreaterThan(x('m'));
  });
});

describe('nextNodeId', () => {
  it('uses bare t for the first trigger, numbered prefixes otherwise', () => {
    expect(nextNodeId('t', new Set())).toBe('t');
    expect(nextNodeId('t', new Set(['t']))).toBe('t1');
    expect(nextNodeId('e', new Set(['e1', 'e2']))).toBe('e3');
    expect(nextNodeId('end', new Set(['end']))).toBe('end1');
  });
});

describe('editorReducer', () => {
  it('adds nodes with generated unique ids and selects them', () => {
    const s = run(EMPTY_STATE, { type: 'add', entry: entry('orders.paid') }, { type: 'add', entry: entry('events.byId') },
      { type: 'add', entry: entry('events.byId') }, { type: 'add', entry: entry('core.condition'), position: { x: 5, y: 6 } },
      { type: 'add', entry: entry('core.end') });
    expect(s.nodes.map((n) => n.id)).toEqual(['t', 'e1', 'e2', 'c1', 'end1']);
    expect(s.nodes[3]).toMatchObject({ node: 'core.condition', version: 1, config: {}, position: { x: 5, y: 6 } });
    expect(s.selectedId).toBe('end1');
    expect(isDirty(s)).toBe(true);
  });

  it('connects, replaces an occupied port and refuses self-loops and cycles', () => {
    let s = run(EMPTY_STATE, { type: 'add', entry: entry('orders.paid') }, { type: 'add', entry: entry('core.condition') },
      { type: 'add', entry: entry('core.end') }, { type: 'add', entry: entry('core.end') });
    s = run(s, { type: 'connect', from: 't', to: 'c1' }, { type: 'connect', from: 'c1', to: 'end1', port: 'true' },
      { type: 'connect', from: 'c1', to: 'end2', port: 'false' });
    expect(s.edges).toEqual([{ from: 't', to: 'c1' }, { from: 'c1', to: 'end1', port: 'true' }, { from: 'c1', to: 'end2', port: 'false' }]);

    s = run(s, { type: 'connect', from: 'c1', to: 'end2', port: 'true' });
    expect(s.edges).toEqual([{ from: 't', to: 'c1' }, { from: 'c1', to: 'end2', port: 'false' }, { from: 'c1', to: 'end2', port: 'true' }]);

    expect(run(s, { type: 'connect', from: 'c1', to: 'c1' })).toBe(s);
    expect(run(s, { type: 'connect', from: 'end2', to: 't' })).toBe(s);
  });

  it('edits config and deletes a field set to undefined', () => {
    let s = run(EMPTY_STATE, { type: 'add', entry: entry('core.waitUntil') });
    s = run(s, { type: 'setConfig', id: 'w1', field: 'at', value: '{{e1.startsAt}} - 2h' }, { type: 'setConfig', id: 'w1', field: 'ifPast', value: 'end' });
    expect(s.nodes[0].config).toEqual({ at: '{{e1.startsAt}} - 2h', ifPast: 'end' });
    s = run(s, { type: 'setConfig', id: 'w1', field: 'at', value: undefined });
    expect(s.nodes[0].config).toEqual({ ifPast: 'end' });
  });

  it('load → add node → connect → edit config serializes to the expected graph', () => {
    const base: BlueprintGraph = {
      schemaVersion: 1,
      nodes: [
        { id: 't', node: 'orders.paid', version: 1, config: { dedupeKey: 'purchase:{{t.eventId}}' }, position: { x: 0, y: 0 } },
        { id: 'end', node: 'core.end', version: 1, config: {}, position: { x: 480, y: 0 } },
      ],
      edges: [],
    };
    const s = run(graphToState(base),
      { type: 'add', entry: entry('events.byId'), position: { x: 240.4, y: 0 } },
      { type: 'connect', from: 't', to: 'e1' }, { type: 'connect', from: 'e1', to: 'end' },
      { type: 'setConfig', id: 'e1', field: 'eventId', value: '{{t.eventId}}' });
    expect(stateToGraph(s)).toEqual({
      schemaVersion: 1,
      nodes: [
        base.nodes[0], base.nodes[1],
        { id: 'e1', node: 'events.byId', version: 1, config: { eventId: '{{t.eventId}}' }, position: { x: 240, y: 0 } },
      ],
      edges: [{ from: 't', to: 'e1' }, { from: 'e1', to: 'end' }],
    });
  });

  it('removes a node with its edges and clears the selection', () => {
    const s = run(graphToState(buyers as BlueprintGraph, 'n'), { type: 'remove', id: 'n' });
    expect(s.nodes.some((n) => n.id === 'n')).toBe(false);
    expect(s.edges.some((e) => e.from === 'n' || e.to === 'n')).toBe(false);
    expect(s.selectedId).toBeNull();
  });

  it('renames a node, rewriting edges and {{refs}} everywhere', () => {
    const s = run(graphToState(buyers as BlueprintGraph, 'e2'), { type: 'rename', id: 'e2', newId: 'ev' });
    const g = stateToGraph(s);
    expect(g.edges).toContainEqual({ from: 'ev', to: 'c' });
    expect(g.nodes.find((n) => n.id === 'c')?.config.expression).toEqual({ and: [{ eq: ['{{ev.status}}', 'PUBLISHED'] }, { gt: ['{{ev.startsAt}}', 'now'] }] });
    expect(g.nodes.find((n) => n.id === 'n')?.config.link).toBe('/events/{{ev.slug}}');
    expect(s.selectedId).toBe('ev');
  });

  it('ignores invalid or duplicate renames', () => {
    const s = graphToState(buyers as BlueprintGraph);
    expect(editorReducer(s, { type: 'rename', id: 'e2', newId: 'e1' })).toBe(s);
    expect(editorReducer(s, { type: 'rename', id: 'e2', newId: 'bad id' })).toBe(s);
  });

  it('duplicates with the same prefix, a cloned config and an offset', () => {
    const s = run(graphToState(buyers as BlueprintGraph), { type: 'duplicate', id: 'e2' });
    const copy = s.nodes[s.nodes.length - 1];
    expect(copy).toMatchObject({ id: 'e3', node: 'events.byId', config: { eventId: '{{t.eventId}}' } });
    expect(copy.config).not.toBe(s.nodes.find((n) => n.id === 'e2')?.config);
  });

  it('tracks dirty through revisions; an edit during a save keeps it dirty', () => {
    const s1 = run(EMPTY_STATE, { type: 'add', entry: entry('core.end') });
    const inFlight = s1.revision;
    const s2 = run(s1, { type: 'move', id: 'end1', position: { x: 10, y: 10 } }, { type: 'saved', revision: inFlight });
    expect(isDirty(s2)).toBe(true);
    expect(isDirty(run(s2, { type: 'saved', revision: s2.revision }))).toBe(false);
    expect(isDirty(run(s2, { type: 'saved', revision: s2.revision }, { type: 'select', id: 'end1' }))).toBe(false);
  });
});

describe('availableFields', () => {
  const s = graphToState(buyers as BlueprintGraph);

  it('lists ancestor outputs for a node', () => {
    const fields = availableFields(s, CATALOG_MAP, 'c').map((f) => `${f.nodeId}.${f.field}`);
    expect(fields).toContain('t.userId');
    expect(fields).toContain('e2.startsAt');
    expect(fields).not.toContain('n.title');
  });

  it('lists only its own outputs for a trigger (dedupeKey)', () => {
    expect(availableFields(s, CATALOG_MAP, 't').map((f) => f.field)).toEqual(['userId', 'eventId', 'orderId']);
  });
});

describe('errorCountByNode', () => {
  it('counts node-scoped analysis errors', () => {
    const counts = errorCountByNode([
      { nodeId: 'c', code: 'CONDITION_PORTS', message: 'x' }, { nodeId: 'c', code: 'INVALID_CONFIG', message: 'y' },
      { code: 'NO_TRIGGER', message: 'z' },
    ]);
    expect(counts).toEqual(new Map([['c', 2]]));
  });
});
