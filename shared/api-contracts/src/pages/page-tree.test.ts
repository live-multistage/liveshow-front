import { describe, expect, it } from 'vitest';
import fixture from './page-tree-fixture.json';
import { ELEMENT_SLOT_RULES, ELEMENT_TYPES, type ElementType, type PageDocumentV2, type PageElement } from './document-v2';
import { childrenOf, countElements, mapElements, walkElements, withoutChildren } from './page-tree';
import { PAGE_BLOCK_ROOT_TYPES, validatePageBlockElement } from './page-blocks';
import { validatePageAgainstProfile } from './profiles';
import { validatePageTreeV2 } from './schemas-v2';

const doc = fixture as unknown as PageDocumentV2;

const all: PageElement[] = [];
walkElements(doc, (el) => void all.push(el));
const ofType = (type: ElementType) => all.find((e) => e.type === type)!;

// Content arrays (iconList.items, faq.items) look like children but are opaque data.
const CONTENT_ARRAY: Partial<Record<ElementType, unknown[]>> = {
  iconList: ['Um', 'Dois', 'Tres'],
  faq: [{ question: 'P1?', answer: 'R1' }, { question: 'P2?', answer: 'R2' }],
};

describe('page-tree fixture', () => {
  it('has exactly one element of each of the 19 types, and is a valid document', () => {
    expect(ELEMENT_TYPES).toHaveLength(19);
    expect(all.map((e) => e.type).sort()).toEqual([...ELEMENT_TYPES].sort());
    expect(validatePageTreeV2(doc)).toEqual([]);
  });
});

describe.each(ELEMENT_TYPES)('%s', (type) => {
  const el = ofType(type);
  const hasSlot = ELEMENT_SLOT_RULES[type] !== null;

  it('childrenOf returns children only for slot types', () => {
    const kids = childrenOf(el);
    if (!hasSlot) expect(kids).toEqual([]);
    else expect(kids).toBe((el.props as { items: PageElement[] }).items);
  });

  it('walkElements never visits content-array items', () => {
    const visited: unknown[] = [];
    walkElements([el], (e) => void visited.push(e));
    expect(visited.every((v) => (ELEMENT_TYPES as readonly string[]).includes((v as PageElement).type))).toBe(true);
    expect(visited).toHaveLength(countElements([el]));
  });

  it('mapElements keeps content arrays and rebuilds only slots', () => {
    const [mapped] = mapElements([el], (e) => ({ ...e }) as PageElement);
    expect(mapped).toEqual(el);
    expect(mapped).not.toBe(el);
    const content = CONTENT_ARRAY[type];
    if (content) expect((mapped.props as { items: unknown[] }).items).toEqual(content);
  });

  it('withoutChildren drops items only for slot types', () => {
    const bare = withoutChildren(el);
    if (hasSlot) expect('items' in bare.props).toBe(false);
    else expect(bare).toBe(el);
  });

  it('countElements counts the element and its descendants', () => {
    const descendants: PageElement[] = [];
    walkElements([el], (e) => void descendants.push(e));
    expect(countElements([el])).toBe(descendants.length);
    if (!hasSlot) expect(countElements([el])).toBe(1);
  });

  it('validates inside a valid document and the platform profile', () => {
    expect(validatePageTreeV2(doc)).toEqual([]);
    expect(validatePageAgainstProfile(doc, 'platform')).toEqual([]);
  });

  if ((PAGE_BLOCK_ROOT_TYPES as readonly string[]).includes(type)) {
    it('is a valid saved block', () => {
      expect(validatePageBlockElement(el)).toEqual([]);
    });
  }
});

describe('walkElements', () => {
  it('reports parent, index, depth and path', () => {
    const seen: { type: string; parent: string | null; index: number; depth: number; path: string }[] = [];
    walkElements(doc, (e, c) => void seen.push({ type: e.type, parent: c.parent?.type ?? null, index: c.index, depth: c.depth, path: c.path }));
    expect(seen[0]).toEqual({ type: 'section', parent: null, index: 0, depth: 1, path: 'content[0]' });
    expect(seen.find((s) => s.type === 'faq')).toMatchObject({ parent: 'column', index: 8, depth: 4, path: 'content[0].props.items[1].props.items[0].props.items[8]' });
  });

  it('does not descend when visit returns false', () => {
    let n = 0;
    walkElements(doc, () => { n += 1; return false; });
    expect(n).toBe(1);
  });

  it('tolerates malformed nodes', () => {
    expect(() => walkElements([null, 3, { type: 'section' }, { type: 'section', props: { items: 'x' } }] as unknown as PageElement[], () => undefined)).not.toThrow();
    expect(childrenOf({ type: 'toString', props: { items: [1] } } as unknown as PageElement)).toEqual([]);
  });
});
