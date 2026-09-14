import { describe, expect, it } from 'vitest';
import type { BlueprintGraph } from '@live-show/api-contracts';
import buyers from './__fixtures__/reminder-buyers.json';
import savers from './__fixtures__/reminder-savers.json';
import { CATALOG_MAP } from './__fixtures__/catalog';
import {
  EMPTY_STATE, availableFields, editorReducer, errorCountByNode, graphToState, isDirty, nextNodeId, outputsOfNode, portsOfNode, stateToGraph,
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

describe('portsOfNode', () => {
  it('maps declared ports with their optionality (falls back to entry.ports for a non-dynamic node)', () => {
    expect(portsOfNode(entry('test.http'), {})).toEqual([{ name: 'next', optional: false }, { name: 'error', optional: true }]);
  });

  it('hardcodes core.condition ports regardless of entry.ports', () => {
    const condition = entry('core.condition');
    expect(portsOfNode({ ...condition, ports: ['next', 'error'], optionalPorts: ['error'] }, {}))
      .toEqual([{ name: 'true', optional: false }, { name: 'false', optional: false }]);
  });

  it('returns null for an entry without ports', () => {
    expect(portsOfNode(entry('events.byId'), {})).toBeNull();
  });

  it('forEach always exposes each/done', () => {
    expect(portsOfNode(entry('core.forEach'), {})).toEqual([{ name: 'each', optional: false }, { name: 'done', optional: false }]);
  });

  it('switch derives one port per distinct case plus default, skipping non-objects and duplicates', () => {
    const ports = portsOfNode(entry('core.switch'), {
      cases: [{ match: 'A', port: 'a' }, { match: 'B', port: 'b' }, { match: 'C', port: 'a' }, null],
    });
    expect(ports).toEqual([{ name: 'a', optional: false }, { name: 'b', optional: false }, { name: 'default', optional: false }]);
  });

  it('switch with no cases yields only default', () => {
    expect(portsOfNode(entry('core.switch'), {})).toEqual([{ name: 'default', optional: false }]);
  });

  it('keeps a port for a case whose match does not parse (mirrors the orchestrator: only the port matters here)', () => {
    const ports = portsOfNode(entry('core.switch'), {
      cases: [{ match: null, port: 'legacy' }, { match: 'A', port: 'a' }],
    });
    expect(ports).toEqual([{ name: 'legacy', optional: false }, { name: 'a', optional: false }, { name: 'default', optional: false }]);
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

  it('assigns ids from PREFIX for real catalog keys not covered by the fixture catalog', () => {
    const s = run(EMPTY_STATE,
      { type: 'add', entry: { key: 'http.request', version: 1, kind: 'action' } },
      { type: 'add', entry: { key: 'core.delay', version: 1, kind: 'core' } });
    expect(s.nodes.map((n) => n.id)).toEqual(['h1', 'd1']);
  });

  it('assigns the f/sw prefixes to forEach/switch nodes', () => {
    const s = run(EMPTY_STATE, { type: 'add', entry: entry('core.forEach') }, { type: 'add', entry: entry('core.switch') },
      { type: 'add', entry: entry('core.forEach') });
    expect(s.nodes.map((n) => n.id)).toEqual(['f1', 'sw1', 'f2']);
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

  it('connect keeps one edge per (from, port) for any string port, leaving other ports untouched', () => {
    let s = run(EMPTY_STATE, { type: 'add', entry: entry('orders.paid') }, { type: 'add', entry: entry('test.http') },
      { type: 'add', entry: entry('core.end') }, { type: 'add', entry: entry('core.end') });
    const h = s.nodes[1].id;
    s = run(s, { type: 'connect', from: 't', to: h }, { type: 'connect', from: h, to: 'end1', port: 'next' },
      { type: 'connect', from: h, to: 'end2', port: 'error' });
    expect(s.edges).toEqual([{ from: 't', to: h }, { from: h, to: 'end1', port: 'next' }, { from: h, to: 'end2', port: 'error' }]);

    // Reconnecting the "error" port to a new target replaces only that port's edge.
    s = run(s, { type: 'connect', from: h, to: 'end1', port: 'error' });
    expect(s.edges).toEqual([{ from: 't', to: h }, { from: h, to: 'end1', port: 'next' }, { from: h, to: 'end1', port: 'error' }]);
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

describe('availableFields with ports and nested object outputs', () => {
  // t -> h(test.http) -[next]-> c ; h -[error]-> err. Both branches re-join at
  // j (c -[true]-> j ; err -> j), then j -> end. Mirrors the analyzer's
  // test.http fixture (Task 4): status/body/partner are unported, error is
  // port-scoped to "error".
  const httpGraph: BlueprintGraph = {
    schemaVersion: 1,
    nodes: [
      { id: 't', node: 'orders.paid', version: 1, config: {}, position: { x: 0, y: 0 } },
      { id: 'h', node: 'test.http', version: 1, config: {}, position: { x: 100, y: 0 } },
      { id: 'c', node: 'core.condition', version: 1, config: {}, position: { x: 200, y: 0 } },
      { id: 'err', node: 'core.end', version: 1, config: {}, position: { x: 200, y: 100 } },
      { id: 'j', node: 'core.waitUntil', version: 1, config: {}, position: { x: 300, y: 50 } },
      { id: 'end', node: 'core.end', version: 1, config: {}, position: { x: 400, y: 50 } },
    ],
    edges: [
      { from: 't', to: 'h' }, { from: 'h', to: 'c', port: 'next' }, { from: 'h', to: 'err', port: 'error' },
      { from: 'c', to: 'j', port: 'true' }, { from: 'err', to: 'j' }, { from: 'j', to: 'end' },
    ],
  };
  const s = graphToState(httpGraph);
  const refKeys = (nodeId: string) => availableFields(s, CATALOG_MAP, nodeId)
    .map((f) => `${f.nodeId}.${f.field}${f.path.length ? `.${f.path.join('.')}` : ''}`);

  it('includes unported outputs (flattening the partner object, and body as a json leaf) but excludes the error branch', () => {
    const list = refKeys('c');
    expect(list).toEqual(expect.arrayContaining(['h.status', 'h.partner', 'h.partner.name', 'h.body']));
    expect(list).not.toContain('h.error');
    expect(list).not.toContain('h.error.code');

    const partner = availableFields(s, CATALOG_MAP, 'c').find((f) => f.field === 'partner' && f.path.length === 0);
    const partnerName = availableFields(s, CATALOG_MAP, 'c').find((f) => f.path.join('.') === 'name');
    expect(partner?.depth).toBe(0);
    expect(partnerName?.depth).toBe(1);
    expect(availableFields(s, CATALOG_MAP, 'c').find((f) => f.field === 'body')?.out.type).toBe('json');
  });

  it('includes the error branch outputs only for a node reached through the error port', () => {
    const list = refKeys('err');
    expect(list).toEqual(expect.arrayContaining(['h.status', 'h.partner', 'h.partner.name', 'h.body', 'h.error', 'h.error.code', 'h.error.message']));
  });

  it('excludes the error branch at a node that converges from both branches (visibleViaPort must reject, not just require reachability)', () => {
    const list = refKeys('j');
    expect(list).toContain('h.status');
    expect(list.some((k) => k.startsWith('h.error'))).toBe(false);
  });
});

describe('outputsOfNode / availableFields for core.forEach', () => {
  // t(events.published) -> d(follows.artistFollowers) -> f(core.forEach, items: {{d.followers}})
  // -[each]-> each1 ; -[done]-> done1.
  const forEachGraph: BlueprintGraph = {
    schemaVersion: 1,
    nodes: [
      { id: 't', node: 'events.published', version: 1, config: {}, position: { x: 0, y: 0 } },
      { id: 'd', node: 'follows.artistFollowers', version: 1, config: { eventId: '{{t.eventId}}' }, position: { x: 100, y: 0 } },
      { id: 'f', node: 'core.forEach', version: 1, config: { items: '{{d.followers}}' }, position: { x: 200, y: 0 } },
      { id: 'each1', node: 'core.end', version: 1, config: {}, position: { x: 300, y: -50 } },
      { id: 'done1', node: 'core.end', version: 1, config: {}, position: { x: 300, y: 50 } },
    ],
    edges: [
      { from: 't', to: 'd' }, { from: 'd', to: 'f' },
      { from: 'f', to: 'each1', port: 'each' }, { from: 'f', to: 'done1', port: 'done' },
    ],
  };
  const s = graphToState(forEachGraph);
  const forEachEntry = entry('core.forEach');

  it('types item from the resolved list ref', () => {
    const outputs = outputsOfNode(forEachEntry, { items: '{{d.followers}}' }, s, CATALOG_MAP, 'f');
    expect(outputs.item.type).toEqual({ object: { userId: { type: 'uuid', class: 'INTERNAL', description: 'Seguidor' } } });
    expect(outputs.item.port).toBe('each');
    expect(outputs.index).toEqual({ type: 'number', class: 'INTERNAL', description: 'Posição (0-based)', port: 'each' });
  });

  it('falls back to static json outputs when items is missing or not a list ref', () => {
    expect(outputsOfNode(forEachEntry, {}, s, CATALOG_MAP, 'f').item.type).toBe('json');
    expect(outputsOfNode(forEachEntry, { items: 'not a ref' }, s, CATALOG_MAP, 'f').item.type).toBe('json');
    expect(outputsOfNode(forEachEntry, { items: '{{t.eventId}}' }, s, CATALOG_MAP, 'f').item.type).toBe('json');
  });

  it('exposes f.item.userId only to a node reached through the each port', () => {
    const eachFields = availableFields(s, CATALOG_MAP, 'each1');
    const item = eachFields.find((field) => field.nodeId === 'f' && field.field === 'item' && field.path.join('.') === 'userId');
    expect(item?.out.type).toBe('uuid');

    const doneFields = availableFields(s, CATALOG_MAP, 'done1');
    expect(doneFields.some((field) => field.nodeId === 'f' && field.field === 'item')).toBe(false);
  });

  it('propagates the PERSONAL class through to a resolved forEach item', () => {
    const contactsGraph: BlueprintGraph = {
      schemaVersion: 1,
      nodes: [
        { id: 't', node: 'events.published', version: 1, config: {}, position: { x: 0, y: 0 } },
        { id: 'c', node: 'account.contacts', version: 1, config: { userId: '{{t.eventId}}' }, position: { x: 100, y: 0 } },
        { id: 'f', node: 'core.forEach', version: 1, config: { items: '{{c.contacts}}' }, position: { x: 200, y: 0 } },
      ],
      edges: [{ from: 't', to: 'c' }, { from: 'c', to: 'f' }],
    };
    const cs = graphToState(contactsGraph);
    const outputs = outputsOfNode(forEachEntry, { items: '{{c.contacts}}' }, cs, CATALOG_MAP, 'f');
    expect(outputs.item.class).toBe('PERSONAL');
    expect(outputs.item.type).toEqual({ object: { email: { type: 'string', class: 'PERSONAL', description: 'E-mail do contato' } } });
  });

  it('does not hang on a cycle of forEach nodes referencing each other\'s item, falling back to static outputs', () => {
    // f1 -> f2 -> f1, each config.items pointing at the other's `item`.
    const cyclicGraph: BlueprintGraph = {
      schemaVersion: 1,
      nodes: [
        { id: 'f1', node: 'core.forEach', version: 1, config: { items: '{{f2.item}}' }, position: { x: 0, y: 0 } },
        { id: 'f2', node: 'core.forEach', version: 1, config: { items: '{{f1.item}}' }, position: { x: 100, y: 0 } },
      ],
      edges: [{ from: 'f1', to: 'f2', port: 'each' }, { from: 'f2', to: 'f1', port: 'each' }],
    };
    const cs = graphToState(cyclicGraph);
    const fields = availableFields(cs, CATALOG_MAP, 'f1');
    const item = fields.find((field) => field.nodeId === 'f2' && field.field === 'item' && field.path.length === 0);
    expect(item?.out.type).toBe('json');
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
