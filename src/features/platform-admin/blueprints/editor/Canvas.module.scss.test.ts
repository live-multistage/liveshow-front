import path from 'node:path';
import { compile } from 'sass';
import { describe, expect, it } from 'vitest';

// reset.scss gives every <svg> `max-width: 100%`. React Flow renders each edge
// as an <svg> inside a zero-width `.react-flow__edges` div, so that cap
// collapses the edge to width 0 and the SVG spec disables its rendering:
// connections existed in state but no line was ever drawn.
describe('Canvas.module.scss', () => {
  it('lifts the global svg max-width cap for React Flow edges', () => {
    const css = compile(path.join(__dirname, 'Canvas.module.scss')).css;
    expect(css).toMatch(/\.react-flow__edges svg\)?\s*\{[^}]*max-width:\s*none/);
  });

  it('keeps the plain (<=2 port) card fixed at 72px; only .stacked grows via calc(46px + ...)', () => {
    const css = compile(path.join(__dirname, 'Canvas.module.scss')).css;
    expect(css).toMatch(/\.card\s*\{[^}]*min-height:\s*72px/);
    expect(css).not.toMatch(/\.card\s*\{[^}]*calc\(46px/);
    expect(css).toMatch(/\.stacked\s*\{[^}]*calc\(46px/);
  });
});
