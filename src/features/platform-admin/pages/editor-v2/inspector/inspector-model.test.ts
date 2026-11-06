import { describe, expect, it } from 'vitest';
import {
  ELEMENT_TYPES, STYLE_KEYS_BY_TYPE, validatePageTreeV2, type PageDocumentV2, type PageElement,
} from '@live-show/api-contracts';
import {
  effectiveStyle, fieldOf, groupIssues, inheritedFrom, ownsKey, styleKeyGroups, withoutStyleKey, withStyleValue,
} from './inspector-model';

const ID = '11111111-1111-4111-8111-111111111111';
const ID2 = '22222222-2222-4222-8222-222222222222';
const heading = (style?: object) => ({ id: ID, text: 'Oi', tag: 'h2', ...(style ? { style } : {}) });

describe('responsive style', () => {
  it('desktop writes style.desktop and keeps the other breakpoints untouched', () => {
    expect(withStyleValue(heading(), 'desktop', 'align', 'center').style).toEqual({ desktop: { align: 'center' } });
  });

  it('mobile writes style.mobile and creates the required desktop base', () => {
    expect(withStyleValue(heading(), 'mobile', 'align', 'end').style).toEqual({ desktop: {}, mobile: { align: 'end' } });
  });

  it('removing the last override drops the breakpoint object', () => {
    const props = withStyleValue(heading({ desktop: { align: 'start' } }), 'tablet', 'align', 'end');
    expect(withoutStyleKey(props, 'tablet', 'align').style).toEqual({ desktop: { align: 'start' } });
  });

  it('inherits desktop -> tablet -> mobile', () => {
    const props = heading({ desktop: { align: 'start', typo: 'xl' }, tablet: { align: 'center' }, mobile: { typo: 'md' } });
    expect(effectiveStyle(props, 'mobile')).toEqual({ align: 'center', typo: 'md' });
    expect(ownsKey(props, 'mobile', 'typo')).toBe(true);
    expect(ownsKey(props, 'mobile', 'align')).toBe(false);
    expect(inheritedFrom(props, 'mobile', 'align')).toBe('tablet');
    expect(inheritedFrom(props, 'mobile', 'gap')).toBe('desktop');
  });

  it('changing cols drops a ratio of the same breakpoint that no longer fits', () => {
    const props = { id: ID, style: { desktop: { cols: 2, ratio: '2-1' } } };
    expect(withStyleValue(props, 'desktop', 'cols', 3).style).toEqual({ desktop: { cols: 3 } });
    expect(withStyleValue(props, 'desktop', 'cols', 2).style).toEqual({ desktop: { cols: 2, ratio: '2-1' } });
  });
});

describe('style groups', () => {
  it.each(ELEMENT_TYPES)('%s: every contract key lands in exactly one group', (type) => {
    const keys = styleKeyGroups(type).flatMap((g) => g.keys);
    expect([...keys].sort()).toEqual([...STYLE_KEYS_BY_TYPE[type]].sort());
  });
});

describe('issues', () => {
  const text = (id: string, props: object): PageElement => ({ type: 'button', props: { id, label: 'Ir', href: '/x', ...props } } as PageElement);
  const doc = (...els: PageElement[]): PageDocumentV2 => ({
    schemaVersion: 2, context: { type: 'none' }, root: { props: {} },
    content: [{ type: 'section', props: { id: '99999999-9999-4999-8999-999999999999', items: els } }],
  } as PageDocumentV2);

  it('keys the issues of the document by element and field', () => {
    const issues = validatePageTreeV2(doc(text(ID, { href: 'javascript:x' }), text(ID2, { anchor: 'Bad Anchor' })));
    const byElement = groupIssues(issues);
    expect(byElement.get(ID)?.map((i) => i.path)).toEqual(['href']);
    expect(byElement.get(ID2)?.map((i) => i.path)).toEqual(['anchor']);
  });

  it('reads the field after the last "props" segment', () => {
    expect(fieldOf({ segments: ['content', 0, 'props', 'items', 1, 'props', 'style', 'mobile', 'shadow'] })).toBe('style.mobile.shadow');
    expect(fieldOf({ segments: ['content', 0, 'props', 'items', 2] })).toBe('items.2');
  });
});
