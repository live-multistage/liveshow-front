import { describe, expect, it } from 'vitest';
import { createPageBlockSchema, updatePageBlockSchema, validatePageBlockElement, PAGE_BLOCK_LIMITS } from './page-blocks';
import { PAGE_RESOLVE_DATA_MAX, resolvePageDataRequestSchema } from './schemas-v2';
import type { PageResolvedData, PublishDiff, FeaturedUnavailable, PublicPage } from './types';

const U = (n: number) => `${String(n).padStart(8, '0')}-3333-4333-8333-333333333333`;
const heading = (n: number, text = 'Oi') => ({ type: 'heading', props: { id: U(n), text, tag: 'h2' } });
const column = (n: number, ...items: unknown[]) => ({ type: 'column', props: { id: U(n), items } });
const columns = (n: number, ...items: unknown[]) => ({ type: 'columns', props: { id: U(n), items } });
const section = (n: number, ...items: unknown[]) => ({ type: 'section', props: { id: U(n), items } });
const rail = (n: number) => ({ type: 'eventRail', props: { id: U(n), title: 'Eventos', source: { kind: 'live' }, limit: 4 } });

describe('validatePageBlockElement', () => {
  it('accepts section, columns and column roots', () => {
    expect(validatePageBlockElement(section(1, heading(2)))).toEqual([]);
    expect(validatePageBlockElement(columns(1, column(2, heading(3))))).toEqual([]);
    expect(validatePageBlockElement(column(1, heading(2)))).toEqual([]);
  });

  it('rejects other root types', () => {
    expect(validatePageBlockElement(heading(1))).toHaveLength(1);
    expect(validatePageBlockElement(null)).toHaveLength(1);
  });

  it('reports inner issues relative to the block', () => {
    expect(validatePageBlockElement(column(1, heading(2, '')))).toEqual([
      { path: 'props.items[0].props.text', segments: ['props', 'items', 0, 'props', 'text'], elementId: U(2), message: 'Obrigatório.' },
    ]);
  });

  it('rejects too many elements', () => {
    const many = column(1, ...Array.from({ length: 200 }, (_, i) => heading(i + 2)));
    expect(validatePageBlockElement(many).some((i) => i.message.includes('200'))).toBe(true);
  });

  it('rejects oversized blocks', () => {
    const big = column(1, { type: 'text', props: { id: U(2), text: 'a'.repeat(PAGE_BLOCK_LIMITS.maxBytes) } });
    expect(validatePageBlockElement(big).some((i) => i.message === 'Bloco grande demais.')).toBe(true);
  });

  it('refuses elements whose id is a wrapper id', () => {
    const wrapperId = '00000000-0000-4000-8000-0000000000a1';
    const inner = { type: 'heading', props: { id: wrapperId, text: 'Oi', tag: 'h2' } };
    expect(validatePageBlockElement(column(1, inner))).toEqual(expect.arrayContaining([
      expect.objectContaining({ segments: ['props', 'items', 0, 'props', 'id'], message: 'ID reservado pelo sistema.' }),
    ]));
    expect(validatePageBlockElement({ type: 'section', props: { id: wrapperId, items: [] } })).toEqual([
      expect.objectContaining({ segments: ['props', 'id'], message: 'ID reservado pelo sistema.' }),
    ]);
  });

  it('stops walking very deep blocks without throwing', () => {
    let node: unknown = heading(2);
    for (let i = 0; i < 300; i++) node = { type: 'group', props: { id: U(i + 10), items: [node] } };
    const issues = validatePageBlockElement(column(1, node));
    expect(issues.some((i) => i.message.includes('Profundidade'))).toBe(true);
  });
});

describe('page block schemas', () => {
  it('trims and validates name', () => {
    const ok = createPageBlockSchema.safeParse({ name: '  Meu bloco ', element: section(1) });
    expect(ok.success && ok.data.name).toBe('Meu bloco');
    expect(createPageBlockSchema.safeParse({ name: ' ', element: section(1) }).success).toBe(false);
    expect(createPageBlockSchema.safeParse({ name: 'x'.repeat(61), element: section(1) }).success).toBe(false);
    expect(createPageBlockSchema.safeParse({ name: 'ok', element: heading(1) }).success).toBe(false);
  });

  it('update takes only a name', () => {
    expect(updatePageBlockSchema.safeParse({ name: 'Novo' }).success).toBe(true);
    expect(updatePageBlockSchema.safeParse({ name: '' }).success).toBe(false);
  });
});

describe('resolvePageDataRequestSchema', () => {
  it('accepts 1..20 data elements', () => {
    expect(resolvePageDataRequestSchema.safeParse({ elements: [rail(1)] }).success).toBe(true);
    expect(resolvePageDataRequestSchema.safeParse({ elements: [] }).success).toBe(false);
    expect(resolvePageDataRequestSchema.safeParse({ elements: Array.from({ length: PAGE_RESOLVE_DATA_MAX + 1 }, (_, i) => rail(i + 1)) }).success).toBe(false);
  });

  it('rejects other types and invalid props', () => {
    expect(resolvePageDataRequestSchema.safeParse({ elements: [heading(1)] }).success).toBe(false);
    expect(resolvePageDataRequestSchema.safeParse({ elements: [{ ...rail(1), props: { id: U(1) } }] }).success).toBe(false);
  });

  it('accepts featuredEvent and liveNow elements', () => {
    const featured = { type: 'featuredEvent', props: { id: U(1), eventId: U(2) } };
    const live = { type: 'liveNow', props: { id: U(3), limit: 4, emptyText: 'Nada ao vivo agora' } };
    expect(resolvePageDataRequestSchema.safeParse({ elements: [featured, live] }).success).toBe(true);
  });

  it('refuses a duplicate props.id, reporting the second element', () => {
    const live = { type: 'liveNow', props: { id: U(1), limit: 4, emptyText: 'Nada' } };
    const result = resolvePageDataRequestSchema.safeParse({ elements: [rail(1), live] });
    expect(result.success).toBe(false);
    expect(!result.success && result.error.issues.map((i) => i.path.join('.'))).toEqual(['elements.1.props.id']);
  });
});

describe('types', () => {
  it('shapes compile', () => {
    const resolved: PageResolvedData = { rails: {}, featured: {}, live: {} };
    const diff: PublishDiff = { added: 0, removed: 0, edited: 0, hidden: 0 };
    const err: FeaturedUnavailable = { code: 'FEATURED_UNAVAILABLE', elementId: U(1) };
    const r: PublicPage['resolved'] = resolved;
    expect([diff, err, r]).toHaveLength(3);
  });
});
