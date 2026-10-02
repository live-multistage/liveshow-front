import { PATH_NODE, type PathMatch, type PathsReport } from '@live-show/api-contracts';

const SYNTHETIC_LABEL_KEY: Record<string, string> = {
  [PATH_NODE.exit]: 'reports.paths.nodeExit',
  [PATH_NODE.start]: 'reports.paths.nodeStart',
  [PATH_NODE.other]: 'reports.paths.nodeOther',
};

export const isSyntheticNode = (key: string) => key in SYNTHETIC_LABEL_KEY;

/** Human label for a node key: synthetic buckets are translated, `page:/x` shows `/x`. */
export function pathNodeLabel(key: string, t: (key: string) => string): string {
  const syntheticKey = SYNTHETIC_LABEL_KEY[key];
  if (syntheticKey) return t(syntheticKey);
  return key.startsWith('page:') ? key.slice('page:'.length) : key;
}

/** Total sessions behind a node (1 match) or band (2 matches) selection. */
export function matchSessions(report: PathsReport, match: PathMatch[]): number {
  if (match.length === 1) {
    const [{ offset, node }] = match;
    const found = report.columns.find((c) => c.offset === offset)?.nodes.find((n) => n.key === node);
    return found?.sessions ?? 0;
  }
  const [from, to] = match;
  const link = report.links.find((l) => l.fromOffset === from.offset && l.from === from.node && l.to === to.node);
  return link?.sessions ?? 0;
}
