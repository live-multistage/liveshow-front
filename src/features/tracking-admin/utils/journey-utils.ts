const pad = (n: number) => String(n).padStart(2, '0');

export function formatGap(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000));
  return total >= 60 ? `${Math.floor(total / 60)}m ${pad(total % 60)}s` : `${total}s`;
}

/**
 * Step number per item; items without a node (identify) are not steps, and consecutive
 * items with the same node (e.g. a reload of the same route) share one step — the same
 * collapse rule the Sankey applies.
 */
export function stepLabels(items: { node: string | null }[]): (number | null)[] {
  let n = 0;
  let last: string | null = null;
  return items.map(({ node }) => {
    if (node === null) return null;
    if (node !== last) n++;
    last = node;
    return n;
  });
}
