import { test, expect } from 'vitest';
import { blueprintGraphSchema, blueprintCatalogEntrySchema } from './schemas';

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

const entry = {
  key: 'system.event',
  version: 1,
  kind: 'trigger',
  label: 'Evento do sistema',
  description: 'Dispara a partir de um evento do sistema',
  config: { event: { kind: 'enum', values: ['user.registered'], required: true, description: 'Evento' } },
  outputs: {},
  event: '*',
  dynamicOutputs: 'byOption',
  dedupeKeyDefaults: { 'user.registered': 'signup:{{t.userId}}' },
  outputsByOption: {
    configKey: 'event',
    options: { 'user.registered': { userId: { type: 'uuid', class: 'INTERNAL', description: 'Id do usuário' } } },
  },
};

test('catalog entry with outputsByOption round-trips', () => {
  const r = blueprintCatalogEntrySchema.safeParse(entry);
  expect(r.success).toBe(true);
  expect(r.success && r.data).toEqual(entry);
});

test('catalog entry accepts multiEnum config field', () => {
  const multi = { kind: 'multiEnum', values: ['a', 'b'], maxItems: 20, required: false, description: 'Campos' };
  expect(blueprintCatalogEntrySchema.safeParse({ ...entry, config: { fields: multi } }).success).toBe(true);
  expect(blueprintCatalogEntrySchema.safeParse({ ...entry, config: { fields: { ...multi, maxItems: 'x' } } }).success).toBe(false);
});

test('rejects outputsByOption whose option map has a bad field class', () => {
  const bad = { ...entry, outputsByOption: { configKey: 'event', options: { x: { userId: { type: 'uuid', class: 'SECRET', description: 'd' } } } } };
  expect(blueprintCatalogEntrySchema.safeParse(bad).success).toBe(false);
});

test('catalog entry with dedupeKeyDefaults round-trips', () => {
  const r = blueprintCatalogEntrySchema.safeParse(entry);
  expect(r.success && r.data.dedupeKeyDefaults).toEqual({ 'user.registered': 'signup:{{t.userId}}' });
});

test('rejects dedupeKeyDefaults with a non-string value', () => {
  expect(blueprintCatalogEntrySchema.safeParse({ ...entry, dedupeKeyDefaults: { 'user.registered': 1 } }).success).toBe(false);
});
