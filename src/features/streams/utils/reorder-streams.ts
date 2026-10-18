import type { StreamResponse } from '../types/stream.types';

// Viewer order of an event's transmissions. Ties (every stream created before
// ordering existed sits at 0) fall back to creation order — the same order
// the API returns.
export function sortStreamsByPosition(streams: StreamResponse[]): StreamResponse[] {
  return [...streams].sort((a, b) => a.position - b.position || a.createdAt.localeCompare(b.createdAt));
}

// Moves one stream up (-1) or down (+1) and renumbers the list 0..n-1.
// Returns only the streams whose position actually changes.
export function reorderStreams(
  streams: StreamResponse[],
  streamId: string,
  direction: -1 | 1,
): Array<{ id: string; position: number }> {
  const ordered = sortStreamsByPosition(streams);
  const from = ordered.findIndex((s) => s.id === streamId);
  const to = from + direction;
  if (from < 0 || to < 0 || to >= ordered.length) return [];
  [ordered[from], ordered[to]] = [ordered[to], ordered[from]];
  return ordered
    .map((s, position) => ({ id: s.id, position, before: s.position }))
    .filter(({ position, before }) => position !== before)
    .map(({ id, position }) => ({ id, position }));
}
