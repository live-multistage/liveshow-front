import { describe, expect, it } from 'vitest';
import * as sass from 'sass';
import { resolve } from 'node:path';

// Expected values are copied from packages/design-tokens/src/tokens.ts (that package is not importable from this repo).
// When a token changes there, update _variables.scss and this table together.
const SPACE = { xs: 4, sm: 8, md: 12, headerGap: 14, lg: 16, xl: 24, xxl: 32, section: 36, xxxl: 48, l1: 64, l2: 96, l3: 128 };
const RADIUS = { sm: 6, md: 10, lg: 16, full: 999 };
const SHADOW = { none: 'none', card: '0 12px 32px rgba(0, 0, 0, 0.45)', glow: '0 0 48px rgba(255, 46, 158, 0.28)' };
const TYPO = {
  hero: { size: [52, 40, 34], weight: 800, tracking: -0.035, lineHeight: 1 },
  display: { size: [34, 30, 28], weight: 800, tracking: -0.035, lineHeight: 1.05 },
  xxl: { size: [28, 24, 22], weight: 800, tracking: -0.02, lineHeight: 1.1 },
  xl: { size: [22, 20, 18], weight: 700, tracking: -0.02, lineHeight: 1.2 },
  lg: { size: [18, 18, 16], weight: 500, tracking: 0, lineHeight: 1.5 },
  md: { size: [16, 16, 15], weight: 400, tracking: 0, lineHeight: 1.5 },
  sm: { size: [14, 14, 14], weight: 400, tracking: 0, lineHeight: 1.5 },
  label: { size: [11, 11, 10], weight: 700, tracking: 0.16, lineHeight: 1.2 },
} as const;

const stylesDir = resolve(process.cwd(), 'src/styles');

// Dumps the token maps as custom properties so the test reads what Sass actually computes.
const dump = `
@use 'variables' as v;
:root {
  @each $k, $val in v.$space { --space-#{$k}: #{$val}; }
  @each $k, $val in v.$radius { --radius-#{$k}: #{$val}; }
  @each $k, $val in v.$shadow { --shadow-#{$k}: #{$val}; }
  @each $k, $m in v.$typo { @each $f, $val in $m { --typo-#{$k}-#{$f}: #{$val}; } }
}`;
const css = sass.compileString(dump, { loadPaths: [stylesDir] }).css;
const read = (name: string) => css.match(new RegExp(`--${name}: ([^;]+);`))?.[1];

describe('_variables.scss mirrors packages/design-tokens', () => {
  it.each(Object.entries(SPACE))('space %s', (k, v) => expect(read(`space-${k}`)).toBe(v === 0 ? '0' : `${v}px`));
  it('space 0 is available for the page builder', () => expect(read('space-0')).toBe('0'));
  it.each(Object.entries(RADIUS))('radius %s', (k, v) => expect(read(`radius-${k}`)).toBe(`${v}px`));
  it('radius none is available for the page builder', () => expect(read('radius-none')).toBe('0'));
  it.each(Object.entries(SHADOW))('shadow %s', (k, v) => expect(read(`shadow-${k}`)).toBe(v));
  it.each(Object.entries(TYPO))('typo %s', (k, t) => {
    expect(read(`typo-${k}-size-desktop`)).toBe(`${t.size[0]}px`);
    expect(read(`typo-${k}-size-tablet`)).toBe(`${t.size[1]}px`);
    expect(read(`typo-${k}-size-mobile`)).toBe(`${t.size[2]}px`);
    expect(read(`typo-${k}-weight`)).toBe(String(t.weight));
    expect(Number.parseFloat(read(`typo-${k}-tracking`) ?? 'NaN')).toBe(t.tracking);
    expect(read(`typo-${k}-line-height`)).toBe(String(t.lineHeight));
  });
});
