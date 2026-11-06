import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import * as sass from 'sass';
import { describe, expect, it } from 'vitest';
import { ELEMENT_TYPES, STYLE_KEYS_BY_TYPE } from '@live-show/api-contracts';
import { styleClassKeys, styleClassNames, STYLE_VALUES } from './style-classes';

describe('styleClassKeys', () => {
  it('maps desktop, tablet and mobile to base, t- and m- families', () => {
    expect(
      styleClassKeys('section', { desktop: { pt: 'l1' }, tablet: { pt: 'xl' }, mobile: { pt: 'md', pb: 'sm' } }),
    ).toEqual(['pt-l1', 't-pt-xl', 'm-pt-md', 'm-pb-sm']);
  });

  it('ignores keys the element type does not accept', () => {
    expect(styleClassKeys('heading', { desktop: { typo: 'hero', pt: 'l1', bg: { kind: 'color', token: 'bg' } } as never })).toEqual(['ty-hero']);
  });

  it('ignores values outside the token enum, including injection attempts', () => {
    const evil = { typo: 'hero" onclick="x', color: 'red', align: 'left', my: '100px', __proto__: { typo: 'hero' } };
    expect(styleClassKeys('heading', { desktop: evil as never })).toEqual([]);
    expect(styleClassKeys('section', { desktop: { bg: { kind: 'color', token: 'url(x)' } } as never })).toEqual([]);
  });

  it('handles bg, cols, ratio, aspect and booleans', () => {
    expect(styleClassKeys('section', { desktop: { bg: { kind: 'gradient', token: 'glow' } } })).toEqual(['bg-g-glow']);
    expect(styleClassKeys('column', { desktop: { bg: { kind: 'color', token: 'surface' } } })).toEqual(['bg-c-surface']);
    expect(styleClassKeys('section', { desktop: { bg: { kind: 'image', url: 'https://x.io/a.png', scrim: 'default' } } })).toEqual(['bg-image']);
    expect(styleClassKeys('columns', { desktop: { cols: 3, ratio: '1-2-1' }, mobile: { cols: 1 } })).toEqual(['cols-3', 'ratio-1-2-1', 'm-cols-1']);
    expect(styleClassKeys('image', { desktop: { aspect: '16:9' } })).toEqual(['as-16-9']);
    expect(styleClassKeys('button', { desktop: { full: true }, mobile: { full: false } })).toEqual(['full-1', 'm-full-0']);
  });

  it('tolerates a missing style', () => {
    expect(styleClassKeys('divider', undefined)).toEqual([]);
  });

  it('adds one hide class per hidden breakpoint', () => {
    expect(styleClassKeys('text', undefined, { tablet: true, mobile: true })).toEqual(['hide-t', 'hide-m']);
    expect(styleClassKeys('text', undefined, { desktop: true })).toEqual(['hide-d']);
  });
});

describe('styleClassNames', () => {
  it('returns one entry per recognised class', () => {
    expect(styleClassNames('section', { desktop: { pt: 'l1', gap: 'md' } }, { mobile: true })).toHaveLength(3);
  });
});

describe('style.module.scss', () => {
  const file = resolve(process.cwd(), 'src/features/pages-public/elements/style/style.module.scss');
  const css = sass.compile(file).css;

  it('defines a class for every key and value the renderers can emit', () => {
    const missing: string[] = [];
    for (const type of ELEMENT_TYPES) {
      for (const key of STYLE_KEYS_BY_TYPE[type]) {
        const sample = STYLE_VALUES[key];
        const values = key === 'bg'
          ? [{ kind: 'color', token: 'bg' }, { kind: 'gradient', token: 'duo' }, { kind: 'image', url: 'https://x.io/a.png', scrim: 'default' }]
          : [...sample];
        for (const value of values) {
          const keys = styleClassKeys(type, { desktop: { [key]: value }, tablet: { [key]: value }, mobile: { [key]: value } } as never);
          for (const k of keys) if (!new RegExp(`\\.${k}(?![\\w-])`).test(css)) missing.push(k);
        }
      }
    }
    expect(missing).toEqual([]);
  });

  it('scopes tablet and mobile families to the page container', () => {
    expect(css).toMatch(/@container page \(max-width: 1023px\)/);
    expect(css).toMatch(/@container page \(max-width: 639px\)/);
    expect(readFileSync(file, 'utf8')).not.toMatch(/style=|dangerouslySetInnerHTML/);
  });
});
