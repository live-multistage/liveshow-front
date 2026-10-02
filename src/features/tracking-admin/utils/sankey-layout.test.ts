import { describe, expect, it } from 'vitest';
import type { PathsReport } from '@live-show/api-contracts';
import { layoutSankey } from './sankey-layout';

const SIZE = { width: 600, height: 300, nodeWidth: 12, nodeGap: 10 };

const report: PathsReport = {
  sessions: 10,
  columns: [
    { offset: 0, nodes: [{ key: 'anchor', sessions: 10 }] },
    { offset: 1, nodes: [{ key: 'a', sessions: 6 }, { key: '__exit__', sessions: 4 }] },
  ],
  links: [
    { fromOffset: 0, from: 'anchor', to: 'a', sessions: 6 },
    { fromOffset: 0, from: 'anchor', to: '__exit__', sessions: 4 },
  ],
};

describe('layoutSankey', () => {
  it('returns an empty layout for an empty report', () => {
    expect(layoutSankey({ sessions: 0, columns: [], links: [] }, SIZE)).toEqual({ nodes: [], links: [] });
  });

  it('spreads columns from the left edge to the right edge', () => {
    const { nodes } = layoutSankey(report, SIZE);
    expect(nodes.find((n) => n.key === 'anchor')!.x).toBe(0);
    expect(nodes.find((n) => n.key === 'a')!.x).toBe(SIZE.width - SIZE.nodeWidth);
  });

  it('centers a single column', () => {
    const single = { sessions: 3, columns: [{ offset: 0, nodes: [{ key: 'x', sessions: 3 }] }], links: [] };
    expect(layoutSankey(single, SIZE).nodes[0].x).toBe((SIZE.width - SIZE.nodeWidth) / 2);
  });

  it('sizes nodes proportionally and fits the tallest column', () => {
    const { nodes } = layoutSankey(report, SIZE);
    const a = nodes.find((n) => n.key === 'a')!;
    const exit = nodes.find((n) => n.key === '__exit__')!;
    expect(a.height / exit.height).toBeCloseTo(6 / 4);
    expect(exit.y + exit.height).toBeLessThanOrEqual(SIZE.height + 1e-9);
    expect(exit.y).toBeCloseTo(a.y + a.height + SIZE.nodeGap);
  });

  it('stacks outgoing bands inside the source node without overlap', () => {
    const { nodes, links } = layoutSankey(report, SIZE);
    const anchor = nodes.find((n) => n.key === 'anchor')!;
    expect(links.reduce((sum, l) => sum + l.thickness, 0)).toBeCloseTo(anchor.height);
    expect(links[0].path.startsWith(`M${anchor.x + SIZE.nodeWidth},`)).toBe(true);
  });
});
