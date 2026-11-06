import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import fixture from '../../../../../shared/api-contracts/src/pages/page-tree-fixture.json';
import { ELEMENT_SLOT_RULES, ELEMENT_TYPES, pageDraftV2Schema, validatePageTreeV2, walkElements, type ElementType, type PageDocumentV2, type PageElement } from '@live-show/api-contracts';
import { fromPuckData } from './puck-data';
import { createPuckConfig } from './puck-config';

const config = createPuckConfig((type) => `rótulo:${type}`);
const components = config.components as Record<string, { render?: unknown; label?: string; fields?: Record<string, { type: string; allow?: string[] }>; defaultProps?: Record<string, unknown> }>;

describe('puck config', () => {
  it('the page root zone only accepts sections', () => {
    const renderDropZone = vi.fn(() => null);
    const root = config.root as { render: (props: unknown) => unknown };
    root.render({ puck: { renderDropZone } });
    expect(renderDropZone).toHaveBeenCalledWith({ zone: 'root:default-zone', allow: ['section'] });
  });

  it('has the 19 element types with PT-BR labels', () => {
    expect(Object.keys(components).sort()).toEqual([...ELEMENT_TYPES].sort());
    expect(components.heading.label).toBe('rótulo:heading');
  });

  it.each(ELEMENT_TYPES)('%s: items is a slot that allows exactly what the nesting table says', (type: ElementType) => {
    const rule = ELEMENT_SLOT_RULES[type];
    const items = components[type].fields?.items;
    if (!rule) return expect(items?.type).not.toBe('slot');
    expect(items?.type).toBe('slot');
    expect([...(items?.allow ?? [])].sort()).toEqual([...rule].sort());
  });

  it('inserts columns with valid default props: two columns, no h1 by default', () => {
    const items = components.columns.defaultProps?.items as { type: string }[];
    expect(items.map((i) => i.type)).toEqual(['column', 'column']);
  });

  // Puck fills `props.id` of every node it creates; the test does the same with a counter.
  const withIds = (node: { type: string; props: Record<string, unknown> }, next: () => string): unknown => ({
    type: node.type,
    props: {
      ...node.props,
      id: next(),
      ...(ELEMENT_SLOT_RULES[node.type as ElementType]
        ? { items: (node.props.items as typeof node[]).map((child) => withIds(child, next)) }
        : {}),
    },
  });

  it.each(ELEMENT_TYPES.filter((type) => type !== 'section'))('%s: default props pass the draft schema inside a valid parent', (type: ElementType) => {
    let n = 0;
    const next = () => `00000000-0000-4000-8000-${String(++n).padStart(12, '0')}`;
    const node = { type, props: components[type].defaultProps as Record<string, unknown> };
    const inColumns = type === 'column';
    const parent = inColumns ? { type: 'columns', props: { items: [node] } } : { type: 'section', props: { items: [node] } };
    const section = inColumns ? { type: 'section', props: { items: [parent] } } : parent;
    const doc = fromPuckData({ root: { props: {} }, content: [withIds(section, next)] } as never);
    const parsed = pageDraftV2Schema.safeParse(doc);
    expect(parsed.success ? [] : parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`)).toEqual([]);
  });

  it('a new event rail is born with a title, so it starts without a "required" error', () => {
    const section = { type: 'section', props: { id: '00000000-0000-4000-8000-000000000001', items: [{ type: 'eventRail', props: { ...components.eventRail.defaultProps, id: '00000000-0000-4000-8000-000000000002' } }] } };
    const doc = fromPuckData({ root: { props: {} }, content: [section] } as never);
    expect(validatePageTreeV2(doc).filter((i) => i.elementId === '00000000-0000-4000-8000-000000000002')).toEqual([]);
  });
});

describe('render of the 19 types with the fixture props (arrays filled)', () => {
  const byType = new Map<string, PageElement>();
  walkElements((fixture as unknown as PageDocumentV2).content, (el) => { if (!byType.has(el.type)) byType.set(el.type, el); });

  it.each(ELEMENT_TYPES)('%s renders without throwing', (type: ElementType) => {
    const element = byType.get(type) as PageElement;
    const { items, ...rest } = element.props as unknown as Record<string, unknown>;
    // Puck hands slot types a component in `items`; content types keep their array.
    const props = ELEMENT_SLOT_RULES[type] ? { ...rest, items: () => null } : { ...rest, items };
    const Render = components[type].render as unknown as React.ComponentType<Record<string, unknown>>;
    expect(() => render(<Render {...props} puck={{ metadata: undefined }} />)).not.toThrow();
  });

  it('faq and iconList show their content items', () => {
    const faq = byType.get('faq')!.props as unknown as { items: { question: string }[] };
    const list = byType.get('iconList')!.props as unknown as { items: string[] };
    const Faq = components.faq.render as unknown as React.ComponentType<Record<string, unknown>>;
    const List = components.iconList.render as unknown as React.ComponentType<Record<string, unknown>>;
    render(<><Faq {...faq} puck={{}} /><List {...list} puck={{}} /></>);
    expect(screen.getByText(faq.items[0].question)).toBeTruthy();
    expect(screen.getByText(list.items[0])).toBeTruthy();
  });
});
