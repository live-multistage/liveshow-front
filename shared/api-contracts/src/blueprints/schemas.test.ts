import { test, expect } from 'vitest';
import { blueprintGraphSchema } from './schemas';

const graph = {
  schemaVersion: 1,
  nodes: [
    { id: 't', node: 'orders.paid', version: 1, config: { dedupeKey: 'purchase:{{t.eventId}}:{{t.userId}}' } },
    { id: 'end', node: 'core.end', version: 1, config: {} },
  ],
  edges: [{ from: 't', to: 'end' }],
};

test('accepts a well-formed graph', () => {
  expect(blueprintGraphSchema.safeParse(graph).success).toBe(true);
});

test('rejects duplicate node ids and edges to unknown nodes', () => {
  const dup = { ...graph, nodes: [...graph.nodes, { id: 't', node: 'core.end', version: 1, config: {} }] };
  expect(blueprintGraphSchema.safeParse(dup).success).toBe(false);
  const dangling = { ...graph, edges: [{ from: 't', to: 'nope' }] };
  expect(blueprintGraphSchema.safeParse(dangling).success).toBe(false);
});

test('rejects more than 50 nodes and invalid ports', () => {
  const many = { ...graph, nodes: Array.from({ length: 51 }, (_, i) => ({ id: `n${i}`, node: 'core.end', version: 1, config: {} })), edges: [] };
  expect(blueprintGraphSchema.safeParse(many).success).toBe(false);
  expect(blueprintGraphSchema.safeParse({ ...graph, edges: [{ from: 't', to: 'end', port: '1bad' }] }).success).toBe(false);
  expect(blueprintGraphSchema.safeParse({ ...graph, edges: [{ from: 't', to: 'end', port: 'has space' }] }).success).toBe(false);
});

test('accepts valid port names', () => {
  expect(blueprintGraphSchema.safeParse({ ...graph, edges: [{ from: 't', to: 'end', port: 'next' }] }).success).toBe(true);
  expect(blueprintGraphSchema.safeParse({ ...graph, edges: [{ from: 't', to: 'end', port: 'error' }] }).success).toBe(true);
});
