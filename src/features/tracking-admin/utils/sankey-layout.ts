import type { PathsReport } from '@live-show/api-contracts';

export interface SankeySize { width: number; height: number; nodeWidth: number; nodeGap: number }
export interface LaidOutNode { key: string; offset: number; sessions: number; x: number; y: number; width: number; height: number }
export interface LaidOutLink {
  fromOffset: number; from: string; to: string; sessions: number;
  thickness: number; path: string;
}
export interface SankeyLayout { nodes: LaidOutNode[]; links: LaidOutLink[] }

const nodeId = (offset: number, key: string) => `${offset}|${key}`;

// Columns are fixed by offset, so no iterative relaxation is needed: one
// scale (sessions → px) fits the tallest column, nodes stack top-down in
// the order the API returns them, and link bands stack inside their source
// and target nodes in target/source order.
export function layoutSankey(report: PathsReport, size: SankeySize): SankeyLayout {
  const { columns } = report;
  if (columns.length === 0) return { nodes: [], links: [] };

  const { width, height, nodeWidth, nodeGap } = size;
  const scale = Math.min(
    ...columns.map((c) => {
      const total = c.nodes.reduce((sum, n) => sum + n.sessions, 0);
      return total === 0 ? Infinity : (height - nodeGap * (c.nodes.length - 1)) / total;
    }),
  );
  const k = Number.isFinite(scale) ? scale : 0;
  const columnX = (i: number) =>
    columns.length === 1 ? (width - nodeWidth) / 2 : (i * (width - nodeWidth)) / (columns.length - 1);

  const nodes: LaidOutNode[] = [];
  const byId = new Map<string, LaidOutNode>();
  columns.forEach((column, i) => {
    let y = 0;
    for (const n of column.nodes) {
      const node = { key: n.key, offset: column.offset, sessions: n.sessions, x: columnX(i), y, width: nodeWidth, height: n.sessions * k };
      nodes.push(node);
      byId.set(nodeId(column.offset, n.key), node);
      y += node.height + nodeGap;
    }
  });

  const outUsed = new Map<string, number>();
  const inUsed = new Map<string, number>();
  const positioned = report.links
    .map((l) => ({ l, src: byId.get(nodeId(l.fromOffset, l.from)), tgt: byId.get(nodeId(l.fromOffset + 1, l.to)) }))
    .filter((p): p is { l: typeof p.l; src: LaidOutNode; tgt: LaidOutNode } => !!p.src && !!p.tgt)
    .sort((a, b) => a.src.y - b.src.y || a.tgt.y - b.tgt.y);

  const links = positioned.map(({ l, src, tgt }) => {
    const thickness = l.sessions * k;
    const srcKey = nodeId(src.offset, src.key);
    const tgtKey = nodeId(tgt.offset, tgt.key);
    const y0 = src.y + (outUsed.get(srcKey) ?? 0) + thickness / 2;
    const y1 = tgt.y + (inUsed.get(tgtKey) ?? 0) + thickness / 2;
    outUsed.set(srcKey, (outUsed.get(srcKey) ?? 0) + thickness);
    inUsed.set(tgtKey, (inUsed.get(tgtKey) ?? 0) + thickness);
    const x0 = src.x + nodeWidth;
    const x1 = tgt.x;
    const xm = (x0 + x1) / 2;
    return { ...l, thickness, path: `M${x0},${y0} C${xm},${y0} ${xm},${y1} ${x1},${y1}` };
  });

  return { nodes, links };
}
