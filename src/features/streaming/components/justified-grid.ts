export const DEFAULT_ASPECT = 16 / 9;

export interface JustifiedCell {
  cameraId: string | null; // null = empty slot placeholder
  width: number;
  height: number;
}

export interface JustifiedRow {
  cells: JustifiedCell[];
  height: number;
  width: number; // sum of cell widths + inner gaps, for horizontal centering
}

// Justified-gallery layout for a fixed cols×rows grid: each row's height is
// picked so its cells (sized to their real aspect ratio) exactly fill the
// container width, THEN capped to that row's even share of the container
// height. The cap is what makes this different from a naive Flickr-style
// justifier — it guarantees total height never exceeds the container (no
// vertical scroll), at the cost of rows that are width-capped sometimes not
// reaching their full height budget (extra space shows as centered gaps,
// never overflow).
export function computeJustifiedRows(
  cameraIds: string[],
  aspectRatios: Record<string, number>,
  cols: number,
  rows: number,
  containerWidth: number,
  containerHeight: number,
  gap: number,
): JustifiedRow[] {
  if (containerWidth <= 0 || containerHeight <= 0 || cols <= 0 || rows <= 0) return [];

  const totalSlots = cols * rows;
  const slots: (string | null)[] = cameraIds.slice(0, totalSlots);
  while (slots.length < totalSlots) slots.push(null);

  const rowChunks: (string | null)[][] = [];
  for (let i = 0; i < slots.length; i += cols) rowChunks.push(slots.slice(i, i + cols));

  const numRows = rowChunks.length;
  const perRowHeightBudget = (containerHeight - (numRows - 1) * gap) / numRows;

  return rowChunks.map((chunk) => {
    const aspects = chunk.map((id) => (id ? (aspectRatios[id] ?? DEFAULT_ASPECT) : DEFAULT_ASPECT));
    const sumAspect = aspects.reduce((a, b) => a + b, 0);
    const rowInnerGap = (chunk.length - 1) * gap;
    const widthJustifiedHeight = (containerWidth - rowInnerGap) / sumAspect;
    const height = Math.max(0, Math.min(widthJustifiedHeight, perRowHeightBudget));

    const cells: JustifiedCell[] = chunk.map((cameraId, i) => ({
      cameraId,
      width: height * aspects[i],
      height,
    }));

    const width = cells.reduce((sum, c) => sum + c.width, 0) + rowInnerGap;
    return { cells, height, width };
  });
}
