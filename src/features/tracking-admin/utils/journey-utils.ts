const pad = (n: number) => String(n).padStart(2, '0');

export function formatGap(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000));
  return total >= 60 ? `${Math.floor(total / 60)}m ${pad(total % 60)}s` : `${total}s`;
}

/** Step number per item; items without a node (identify) are not steps. */
export function stepLabels(items: { node: string | null }[]): (number | null)[] {
  let n = 0;
  return items.map((item) => (item.node === null ? null : ++n));
}
