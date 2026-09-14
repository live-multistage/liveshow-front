import { describe, expect, it } from 'vitest';
import type { BlueprintGraph } from '@live-show/api-contracts';
import { EMPTY_STATE, type EditorState, graphToState, stateToGraph } from '../useEditorGraph';
import { refOf } from '../expr-builders';
import { TOUR_STEPS, type TourContext, findChain, firstIncompleteStep } from './tourSteps';

function fullGraph(triggerId: string): BlueprintGraph {
  const t = triggerId;
  return {
    schemaVersion: 1,
    nodes: [
      { id: t, node: 'wishlist.itemAdded', version: 1, config: { dedupeKey: `saved-24h:{{${t}.eventId}}:{{${t}.userId}}` } },
      { id: 'd', node: 'core.delay', version: 1, config: { duration: '24h' } },
      { id: 's', node: 'wishlist.stillSaved', version: 1, config: { userId: refOf(t, 'userId'), eventId: refOf(t, 'eventId') } },
      { id: 'a', node: 'ticketing.hasAccess', version: 1, config: { userId: refOf(t, 'userId'), eventId: refOf(t, 'eventId') } },
      { id: 'e', node: 'events.byId', version: 1, config: { eventId: refOf(t, 'eventId') } },
      {
        id: 'c',
        node: 'core.condition',
        version: 1,
        config: {
          expression: {
            and: [
              { eq: [refOf('s', 'saved'), true] },
              { eq: [refOf('a', 'hasAccess'), false] },
              { eq: [refOf('e', 'status'), 'PUBLISHED'] },
              { gt: [refOf('e', 'startsAt'), 'now'] },
            ],
          },
        },
      },
      {
        id: 'n',
        node: 'notifications.inApp',
        version: 1,
        config: {
          recipient: refOf(t, 'userId'), type: 'RECOMMENDATION', title: 'Ainda pensando em {{e.title}}?',
          message: 'Ainda dá tempo de garantir seu ingresso.', link: '/events/{{e.slug}}',
        },
      },
      { id: 'end1', node: 'core.end', version: 1, config: {} },
      { id: 'end2', node: 'core.end', version: 1, config: {} },
    ],
    edges: [
      { from: t, to: 'd' }, { from: 'd', to: 's' }, { from: 's', to: 'a' }, { from: 'a', to: 'e' }, { from: 'e', to: 'c' },
      { from: 'c', to: 'n', port: 'true' }, { from: 'n', to: 'end1' }, { from: 'c', to: 'end2', port: 'false' },
    ],
  };
}

const ctxFor = (state: EditorState, overrides: Partial<TourContext> = {}): TourContext => ({
  state, analysisOk: null, published: false, active: false, ...overrides,
});

const step = (id: number) => TOUR_STEPS.find((s) => s.id === id)!;

describe('TOUR_STEPS', () => {
  it('has one entry per step id 0-8 in order', () => {
    expect(TOUR_STEPS.map((s) => s.id)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it('step 0 always passes', () => {
    expect(step(0).check(ctxFor(EMPTY_STATE))).toBe(true);
  });

  it.each([1, 2, 3, 4, 5, 6, 7])('step %i passes on the complete correct graph', (id) => {
    const state = graphToState(fullGraph('t'));
    expect(step(id).check(ctxFor(state))).toBe(true);
  });

  it.each([1, 2, 3, 4, 5, 6, 7])('step %i also passes when the trigger id is t1', (id) => {
    const state = graphToState(fullGraph('t1'));
    expect(step(id).check(ctxFor(state))).toBe(true);
  });

  it('step 1 fails when dedupeKey is missing', () => {
    const graph = fullGraph('t');
    graph.nodes[0] = { ...graph.nodes[0], config: {} };
    expect(step(1).check(ctxFor(graphToState(graph)))).toBe(false);
  });

  it('step 2 fails when duration does not match the pattern', () => {
    const graph = fullGraph('t');
    graph.nodes[1] = { ...graph.nodes[1], config: { duration: '1 day' } };
    expect(step(2).check(ctxFor(graphToState(graph)))).toBe(false);
  });

  it('step 3 fails when userId references the wrong node', () => {
    const graph = fullGraph('t');
    graph.nodes[2] = { ...graph.nodes[2], config: { userId: refOf('d', 'userId'), eventId: refOf('t', 'eventId') } };
    expect(step(3).check(ctxFor(graphToState(graph)))).toBe(false);
  });

  it('step 4 fails when the node is missing entirely', () => {
    const graph = fullGraph('t');
    graph.nodes = graph.nodes.filter((n) => n.id !== 'a');
    graph.edges = graph.edges.filter((e) => e.from !== 'a' && e.to !== 'a');
    expect(step(4).check(ctxFor(graphToState(graph)))).toBe(false);
  });

  it('step 6 fails when a rule is missing', () => {
    const graph = fullGraph('t');
    const condition = graph.nodes.find((n) => n.id === 'c')!;
    condition.config = { expression: { and: [{ eq: [refOf('s', 'saved'), true] }] } };
    expect(step(6).check(ctxFor(graphToState(graph)))).toBe(false);
  });

  it('step 7 fails on the wrong port (true wired to a bare end, no notification)', () => {
    const graph = fullGraph('t');
    graph.edges = graph.edges.map((e) => (e.from === 'c' && e.port === 'true' ? { from: 'c', to: 'end1', port: 'true' } : e));
    expect(step(7).check(ctxFor(graphToState(graph)))).toBe(false);
  });

  it('step 7 fails when "se falso" is not wired to an End', () => {
    const graph = fullGraph('t');
    graph.edges = graph.edges.filter((e) => !(e.from === 'c' && e.port === 'false'));
    expect(step(7).check(ctxFor(graphToState(graph)))).toBe(false);
  });

  it('step 7 fails when both branches share the same End node', () => {
    const graph = fullGraph('t');
    graph.edges = graph.edges.map((e) => (e.from === 'c' && e.port === 'false' ? { from: 'c', to: 'end1', port: 'false' } : e));
    expect(step(7).check(ctxFor(graphToState(graph)))).toBe(false);
  });

  it('step 8 requires a clean analysis and a published version', () => {
    expect(step(8).check(ctxFor(EMPTY_STATE, { analysisOk: null, published: false }))).toBe(false);
    expect(step(8).check(ctxFor(EMPTY_STATE, { analysisOk: false, published: true }))).toBe(false);
    expect(step(8).check(ctxFor(EMPTY_STATE, { analysisOk: true, published: false }))).toBe(false);
    expect(step(8).check(ctxFor(EMPTY_STATE, { analysisOk: true, published: true }))).toBe(true);
    expect(step(8).check(ctxFor(EMPTY_STATE, { analysisOk: true, published: true, active: false }))).toBe(true);
  });

  it('firstIncompleteStep reports the first failing step', () => {
    expect(firstIncompleteStep(ctxFor(EMPTY_STATE))).toBe(1);
    expect(firstIncompleteStep(ctxFor(graphToState(fullGraph('t'))))).toBe(8);
    expect(firstIncompleteStep(ctxFor(graphToState(fullGraph('t')), { analysisOk: true, published: true }))).toBe(8);
  });

  it('findChain returns null when the chain is broken', () => {
    const graph = fullGraph('t');
    graph.edges = graph.edges.filter((e) => !(e.from === 'd' && e.to === 's'));
    const state = graphToState(graph);
    expect(findChain(state, ['wishlist.itemAdded', 'core.delay', 'wishlist.stillSaved'])).toBeNull();
  });

  describe('autoApply chained from an empty state', () => {
    let state: EditorState = EMPTY_STATE;
    for (const id of [1, 2, 3, 4, 5, 6, 7]) {
      const applied = step(id).autoApply!(state);
      state = applied;
    }

    it.each([1, 2, 3, 4, 5, 6, 7])('check %i passes after chaining autoApply 1-7', (id) => {
      expect(step(id).check(ctxFor(state))).toBe(true);
    });

    it('produces a graph with valid node ids', () => {
      const graph = stateToGraph(state);
      const NODE_ID = /^[A-Za-z0-9_-]{1,64}$/;
      expect(graph.nodes.length).toBeGreaterThan(0);
      for (const n of graph.nodes) expect(n.id).toMatch(NODE_ID);
      const ids = new Set(graph.nodes.map((n) => n.id));
      expect(ids.size).toBe(graph.nodes.length);
    });

    it('is idempotent: re-running autoApply on an already-correct step keeps it passing', () => {
      const reapplied = step(3).autoApply!(state);
      expect(step(3).check(ctxFor(reapplied))).toBe(true);
      expect(step(7).check(ctxFor(reapplied))).toBe(true);
    });
  });
});

describe('autoApply step by step ("Fazer por mim" one step at a time)', () => {
  it('extends the chain the user already built instead of rebuilding it', () => {
    let state: EditorState = EMPTY_STATE;
    for (const step of TOUR_STEPS.slice(1, 8)) {
      state = step.autoApply!(state);
      const ctx: TourContext = { state, analysisOk: null, published: false, active: false };
      expect(step.check(ctx)).toBe(true);
    }
    const keys = state.nodes.map((n) => n.node).sort();
    expect(keys.filter((k) => k === 'wishlist.itemAdded')).toHaveLength(1);
    expect(keys.filter((k) => k === 'core.delay')).toHaveLength(1);
    expect(keys.filter((k) => k === 'core.condition')).toHaveLength(1);
    expect(state.nodes).toHaveLength(9);
    expect(firstIncompleteStep({ state, analysisOk: null, published: false, active: false })).toBe(8);
  });
});
