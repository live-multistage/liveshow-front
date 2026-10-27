import { describe, it, expect } from 'vitest';
import { reorderStreams, sortStreamsByPosition } from './reorder-streams';
import type { StreamResponse } from '../types/stream.types';

const s = (id: string, position: number, createdAt: string): StreamResponse => ({
  id, eventId: 'e', programId: null, title: id, status: 'READY', position, createdAt, updatedAt: createdAt,
});

describe('sortStreamsByPosition', () => {
  it('orders by position, ties by creation (every legacy stream is position 0)', () => {
    const list = [s('b', 0, '2026-01-02'), s('c', 1, '2026-01-01'), s('a', 0, '2026-01-01')];
    expect(sortStreamsByPosition(list).map((x) => x.id)).toEqual(['a', 'b', 'c']);
  });
});

describe('reorderStreams', () => {
  it('normalizes positions and returns only the streams that move', () => {
    const list = [s('a', 0, '2026-01-01'), s('b', 0, '2026-01-02'), s('c', 0, '2026-01-03')];
    // c moves above b: a(0) stays, c -> 1, b -> 2 (result is in new list order)
    expect(reorderStreams(list, 'c', -1)).toEqual([
      { id: 'c', position: 1 },
      { id: 'b', position: 2 },
    ]);
  });

  it('is a no-op at the edges', () => {
    const list = [s('a', 0, '2026-01-01'), s('b', 1, '2026-01-02')];
    expect(reorderStreams(list, 'a', -1)).toEqual([]);
    expect(reorderStreams(list, 'b', 1)).toEqual([]);
    expect(reorderStreams(list, 'missing', 1)).toEqual([]);
  });
});
