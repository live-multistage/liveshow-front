import { describe, expect, it } from 'vitest';
import fixture from '../../../../../../shared/api-contracts/src/pages/page-tree-fixture.json';
import { ELEMENT_TYPES, countElements, validatePageTreeV2, walkElements, type PageDocumentV2, type PageElement } from '@live-show/api-contracts';
import { buildLayerRows, errorKeysOf } from './layers';

const doc = fixture as unknown as PageDocumentV2;
const typeLabel = (t: string) => `L:${t}`;
const base = { collapsed: new Set<string>(), breakpoint: 'desktop' as const, errorKeys: new Set<string>(), typeLabel };

describe('buildLayerRows (fixture with the 19 types)', () => {
  it('one row per element; iconList/faq items are not rows', () => {
    const rows = buildLayerRows(doc.content, base);
    expect(rows).toHaveLength(countElements(doc));
    expect(new Set(rows.map((r) => r.type))).toEqual(new Set(ELEMENT_TYPES));
    expect(rows[0].depth).toBe(0);
  });

  it('collapsing hides the subtree', () => {
    const [section] = doc.content;
    const collapsed = new Set([(section.props as { id: string }).id]);
    const rows = buildLayerRows(doc.content, { ...base, collapsed });
    expect(rows.filter((r) => r.depth === 0 && r.type === 'section')[0].collapsed).toBe(true);
    expect(rows.length).toBeLessThan(countElements(doc));
  });

  it('name: props.name wins, else type label plus a text snippet', () => {
    const content = [{ type: 'section', props: { id: 's', name: 'Abertura', items: [
      { type: 'heading', props: { id: 'h', text: 'Um título bem comprido que passa do limite', tag: 'h2' } },
      { type: 'divider', props: { id: 'd' } },
    ] } }] as unknown as PageElement[];
    expect(buildLayerRows(content, base).map((r) => r.name)).toEqual(['Abertura', 'L:heading · Um título bem comprido q…', 'L:divider']);
  });

  it('marks T·C overrides, hidden at the current breakpoint and the move capabilities', () => {
    const content = [{ type: 'section', props: { id: 's', hidden: { mobile: true }, style: { desktop: {}, tablet: { gap: 'sm' }, mobile: { gap: 'sm' } }, items: [
      { type: 'columns', props: { id: 'cs', items: [{ type: 'column', props: { id: 'c', items: [{ type: 'heading', props: { id: 'h', text: 'x', tag: 'h2' } }] } }] } },
      { type: 'divider', props: { id: 'd' } },
    ] } }] as unknown as PageElement[];
    const mobile = Object.fromEntries(buildLayerRows(content, { ...base, breakpoint: 'mobile' }).map((r) => [r.id, r]));
    expect(mobile.s.overrides).toBe('T·C');
    expect(mobile.s.hiddenHere).toBe(true);
    expect(buildLayerRows(content, base).find((r) => r.id === 's')!.hiddenHere).toBe(false);
    expect(mobile.cs.canUp).toBe(false);
    expect(mobile.cs.canDown).toBe(true);
    expect(mobile.cs.canOutdent).toBe(false); // a section parent cannot be under the page root as columns
    expect(mobile.h.canOutdent).toBe(false); // columns only take columns
    expect(mobile.d.canOutdent).toBe(false); // heading/divider cannot sit at the page root
    expect(mobile.s.saveable && mobile.cs.saveable && mobile.c.saveable && !mobile.h.saveable).toBe(true);
  });

  it('an error inside a nested element propagates to every ancestor, up to the section', () => {
    const bad = JSON.parse(JSON.stringify(doc)) as PageDocumentV2;
    let victim: PageElement | undefined;
    walkElements(bad, (el) => { if (!victim && el.type === 'heading') victim = el; });
    (victim!.props as { text: string }).text = '';
    const issues = validatePageTreeV2(bad);
    expect(issues.length).toBeGreaterThan(0);
    const rows = buildLayerRows(bad.content, { ...base, errorKeys: errorKeysOf(issues) });
    expect(rows.find((r) => r.id === (victim!.props as { id: string }).id)!.error).toBe(true);
    expect(rows[0].error).toBe(true);
  });
});
