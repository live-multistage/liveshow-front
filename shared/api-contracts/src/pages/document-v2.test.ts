import { describe, expect, it } from 'vitest';
import {
  BREAKPOINTS,
  COLOR_KEYS,
  ELEMENT_SLOT_RULES,
  ELEMENT_TYPES,
  PAGE_V2_LIMITS,
  SHADOW_KEYS,
  SPACE_KEYS,
  STYLE_KEYS_BY_TYPE,
  STYLE_VALUE_KEYS,
  TYPO_KEYS,
  VIDEO_ALLOWED_HOSTS,
  type ElementType,
  type PageDocumentV2,
} from './document-v2';

describe('element table', () => {
  it('has a slot rule and a style key list for every element type', () => {
    for (const type of ELEMENT_TYPES) {
      expect(ELEMENT_SLOT_RULES, type).toHaveProperty(type);
      expect(STYLE_KEYS_BY_TYPE, type).toHaveProperty(type);
    }
    expect(Object.keys(ELEMENT_SLOT_RULES)).toHaveLength(ELEMENT_TYPES.length);
    expect(Object.keys(STYLE_KEYS_BY_TYPE)).toHaveLength(ELEMENT_TYPES.length);
  });

  it('only allows known element types inside a slot and never nests sections', () => {
    for (const allowed of Object.values(ELEMENT_SLOT_RULES)) {
      for (const child of allowed ?? []) expect(ELEMENT_TYPES).toContain(child);
      expect(allowed ?? []).not.toContain('section');
    }
  });

  it('matches the SDD nesting table', () => {
    expect(ELEMENT_SLOT_RULES.columns).toEqual(['column']);
    expect(ELEMENT_SLOT_RULES.heading).toBeNull();
    expect(ELEMENT_SLOT_RULES.section).toContain('columns');
    expect(ELEMENT_SLOT_RULES.section).not.toContain('column');
    expect(ELEMENT_SLOT_RULES.column).not.toContain('column');
    expect(ELEMENT_SLOT_RULES.group).toContain('button');
    expect(ELEMENT_SLOT_RULES.group).not.toContain('group');
    expect(ELEMENT_SLOT_RULES.group).not.toContain('columns');
  });

  it('accepts only declared style value keys', () => {
    for (const keys of Object.values(STYLE_KEYS_BY_TYPE)) {
      for (const key of keys) expect(STYLE_VALUE_KEYS).toContain(key);
    }
  });
});

describe('limits and token enums', () => {
  it('uses the SDD limits', () => {
    expect(PAGE_V2_LIMITS).toMatchObject({ maxElements: 900, maxSections: 40, maxDepth: 6, maxBytes: 512 * 1024 });
  });

  it('exposes the token keys the document may reference', () => {
    expect(SPACE_KEYS).toEqual(['0', 'xs', 'sm', 'md', 'lg', 'xl', 'xxl', 'xxxl', 'l1', 'l2', 'l3']);
    expect(SHADOW_KEYS).toEqual(['none', 'card', 'glow']);
    expect(TYPO_KEYS).toEqual(['hero', 'display', 'xxl', 'xl', 'lg', 'md', 'sm', 'label']);
    expect(COLOR_KEYS).toContain('action');
    expect(BREAKPOINTS).toEqual(['desktop', 'tablet', 'mobile']);
  });

  it('lists only https video hosts without ports or paths', () => {
    for (const host of VIDEO_ALLOWED_HOSTS) expect(host).toMatch(/^[a-z0-9.-]+$/);
  });
});

describe('PageDocumentV2 type', () => {
  it('accepts a minimal tree', () => {
    const type: ElementType = 'section';
    const doc: PageDocumentV2 = {
      schemaVersion: 2,
      context: { type: 'none' },
      root: { props: {} },
      content: [{ type, props: { id: 'x', items: [] } }],
    };
    expect(doc.content[0]?.type).toBe('section');
  });
});
