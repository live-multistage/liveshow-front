import { describe, expect, it } from 'vitest';
import fixture from '../../../../../../shared/api-contracts/src/pages/page-tree-fixture.json';
import {
  ELEMENT_SLOT_RULES, ELEMENT_TYPES, childrenOf, countElements, walkElements, type ElementType, type PageDocumentV2, type PageElement,
} from '@live-show/api-contracts';
import {
  canNest, cloneWithNewIds, idOf, insertAt, insertionPoint, locate, moveElement, ROOT_ZONE, setHiddenAt,
} from './tree-ops';

const doc = fixture as unknown as PageDocumentV2;
const content = doc.content as PageElement[];
const ids = (els: PageElement[]) => { const out: string[] = []; walkElements(els, (e) => void out.push(idOf(e))); return out; };
const byType = (type: ElementType) => { let found: PageElement | undefined; walkElements(content, (e) => { if (!found && e.type === type) found = e; }); return found!; };

const leaf = (id: string): PageElement => ({ type: 'divider', props: { id } } as PageElement);
const slot = (type: 'section' | 'columns' | 'column' | 'group', id: string, items: PageElement[] = []): PageElement => ({ type, props: { id, items } } as PageElement);

describe('canNest', () => {
  it.each(ELEMENT_TYPES)('%s as parent follows the slot table', (parent) => {
    ELEMENT_TYPES.forEach((child) => expect(canNest(parent, child)).toBe(!!ELEMENT_SLOT_RULES[parent]?.includes(child)));
  });
  it('the page root only takes sections', () => {
    expect(canNest(null, 'section')).toBe(true);
    expect(canNest(null, 'heading')).toBe(false);
  });
  it('columns take only columns; leaves take nothing', () => {
    expect(canNest('columns', 'column')).toBe(true);
    expect(canNest('columns', 'heading')).toBe(false);
    expect(canNest('heading', 'text')).toBe(false);
  });
});

describe('cloneWithNewIds (fixture with the 19 types)', () => {
  it('renews every id in the subtree and keeps the shape and the content arrays', () => {
    const before = ids(content);
    const copy = content.map((s) => cloneWithNewIds(s));
    const after = ids(copy);
    expect(after).toHaveLength(before.length);
    expect(after.filter((id) => before.includes(id))).toEqual([]);
    expect(new Set(after).size).toBe(after.length);
    expect(countElements(copy)).toBe(countElements(content));
    ELEMENT_TYPES.forEach((type) => {
      const original = byType(type);
      let cloned: PageElement | undefined;
      walkElements(copy, (e) => { if (!cloned && e.type === type) cloned = e; });
      const { id: _a, items: itemsA, ...restA } = original.props as Record<string, unknown>;
      const { id: _b, items: itemsB, ...restB } = cloned!.props as Record<string, unknown>;
      expect(restB).toEqual(restA);
      // iconList/faq `items` are content, not children: kept verbatim
      if (childrenOf(original).length === 0 && itemsA) expect(itemsB).toEqual(itemsA);
    });
  });
});

describe('insertionPoint', () => {
  const tree = [slot('section', 's1', [slot('columns', 'cs', [slot('column', 'c1', [leaf('d1')])])])];
  it('no selection: end of the page', () => {
    expect(insertionPoint(tree, null)).toEqual({ parentId: null, parentType: null, index: 1, zone: ROOT_ZONE });
  });
  it('slot element: inside, at the end', () => {
    expect(insertionPoint(tree, 'c1')).toEqual({ parentId: 'c1', parentType: 'column', index: 1, zone: 'c1:items' });
  });
  it('leaf: right after it, in its parent', () => {
    expect(insertionPoint(tree, 'd1')).toEqual({ parentId: 'c1', parentType: 'column', index: 1, zone: 'c1:items' });
  });
  it('top-level section selected: inside it', () => {
    expect(insertionPoint(tree, 's1').parentType).toBe('section');
  });
});

describe('insertionPoint climbing', () => {
  const tree = [slot('section', 's1', [slot('columns', 'cs', [slot('column', 'c1', [leaf('d1')])])])];
  it('a section goes after the top-level ancestor', () => {
    expect(insertionPoint(tree, 'd1', 'section')).toEqual({ parentId: null, parentType: null, index: 1, zone: ROOT_ZONE });
  });
  it('a column goes after the closest column, in its columns', () => {
    expect(insertionPoint(tree, 'd1', 'column')).toEqual({ parentId: 'cs', parentType: 'columns', index: 1, zone: 'cs:items' });
  });
  it('a widget stays in the closest slot that accepts it', () => {
    expect(insertionPoint(tree, 'cs', 'heading')).toEqual({ parentId: 's1', parentType: 'section', index: 1, zone: 's1:items' });
  });
  it('falls back to the closest candidate when nothing accepts the type', () => {
    expect(insertionPoint(tree, null, 'heading').parentType).toBeNull();
    expect(insertionPoint(tree, 'd1', 'columns' as ElementType).parentType).toBe('column');
  });
});

describe('insertAt / locate', () => {
  const tree = [slot('section', 's1', [leaf('a'), leaf('b')]), slot('section', 's2')];
  it('inserts at the page level and inside a parent', () => {
    expect(ids(insertAt(tree, null, 1, slot('section', 'n')))).toEqual(['s1', 'a', 'b', 'n', 's2']);
    expect(ids(insertAt(tree, 's1', 1, leaf('n')))).toEqual(['s1', 'a', 'n', 'b', 's2']);
  });
  it('locates parent and index', () => {
    expect(locate(tree, 'b')).toMatchObject({ index: 1, parent: { props: { id: 's1' } } });
    expect(locate(tree, 's2')).toMatchObject({ index: 1, parent: null });
    expect(locate(tree, 'zz')).toBeNull();
  });
});

describe('moveElement', () => {
  const tree = () => [slot('section', 's1', [leaf('a'), leaf('b'), slot('group', 'g', [])]), slot('section', 's2', [leaf('c')])];
  it('reorders inside the same parent (index is the slot before the removal)', () => {
    expect(ids(moveElement(tree(), 'a', 's1', 2)!)).toEqual(['s1', 'b', 'a', 'g', 's2', 'c']);
    expect(ids(moveElement(tree(), 'b', 's1', 0)!)).toEqual(['s1', 'b', 'a', 'g', 's2', 'c']);
  });
  it('changes parent', () => {
    expect(ids(moveElement(tree(), 'a', 's2', 1)!)).toEqual(['s1', 'b', 'g', 's2', 'c', 'a']);
  });
  it('refuses forbidden nesting and moving into its own subtree', () => {
    expect(moveElement(tree(), 's2', 's1', 0)).toBeNull();
    expect(moveElement(tree(), 'g', 'g', 0)).toBeNull();
    expect(moveElement(tree(), 'a', 'g', 0)).not.toBeNull();
  });
});

describe('setHiddenAt', () => {
  it('hides and shows at one breakpoint, dropping the empty map', () => {
    const tree = [slot('section', 's1')];
    const hidden = setHiddenAt(tree, 's1', 'mobile', true);
    expect((hidden[0].props as { hidden?: unknown }).hidden).toEqual({ mobile: true });
    const shown = setHiddenAt(hidden, 's1', 'mobile', false);
    expect('hidden' in shown[0].props).toBe(false);
  });
});
