import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTrackingLiveStream } from './use-tracking-live-stream';
import { tokenStore } from '@/lib/auth/token-store';

class FakeEventSource {
  static instances: FakeEventSource[] = [];
  onopen: (() => void) | null = null;
  onerror: (() => void) | null = null;
  onmessage: ((e: { data: string }) => void) | null = null;
  closed = false;

  constructor(public url: string) {
    FakeEventSource.instances.push(this);
  }

  close() {
    this.closed = true;
  }

  emit(data: unknown) {
    this.onmessage?.({ data: JSON.stringify(data) });
  }
}

function latestSource(): FakeEventSource {
  const source = FakeEventSource.instances[FakeEventSource.instances.length - 1];
  if (!source) throw new Error('no EventSource created');
  return source;
}

describe('useTrackingLiveStream', () => {
  beforeEach(() => {
    FakeEventSource.instances = [];
    (globalThis as unknown as { EventSource: typeof FakeEventSource }).EventSource = FakeEventSource;
    tokenStore.clear();
  });

  it('appends incoming message frames newest-first, stamped with receivedAt and a stable key', () => {
    const { result } = renderHook(() => useTrackingLiveStream({}, { paused: false }));
    const source = latestSource();

    const frame = { kind: 'message', status: 'accepted', message: { type: 'track', event: 'a', messageId: 'm1' } };
    act(() => source.emit(frame));

    expect(result.current.frames).toHaveLength(1);
    expect(result.current.frames[0]).toMatchObject(frame);
    expect(result.current.frames[0].receivedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(result.current.frames[0].key).toBe('m1');
  });

  it('synthesizes a key from receivedAt + append order for rejected frames (no messageId)', () => {
    const { result } = renderHook(() => useTrackingLiveStream({}, { paused: false }));
    const source = latestSource();

    act(() => source.emit({ kind: 'message', status: 'rejected', reason: 'bad json', raw: '{', sourceId: 'web' }));

    expect(result.current.frames).toHaveLength(1);
    const [frame] = result.current.frames;
    expect(frame.key).toBe(`${frame.receivedAt}-0`);
  });

  it('caps the buffer at 500 frames, keeping the newest first', () => {
    const { result } = renderHook(() => useTrackingLiveStream({}, { paused: false }));
    const source = latestSource();

    act(() => {
      for (let i = 0; i < 510; i++) {
        source.emit({ kind: 'message', status: 'accepted', message: { type: 'track', event: `e${i}` } });
      }
    });

    expect(result.current.frames).toHaveLength(500);
    expect(result.current.frames[0]).toMatchObject({ message: { event: 'e509' } });
  });

  it('paused stops appending new frames but keeps the connection open', () => {
    const { result, rerender } = renderHook(
      ({ paused }: { paused: boolean }) => useTrackingLiveStream({}, { paused }),
      { initialProps: { paused: false } },
    );
    const source = latestSource();
    act(() => source.emit({ kind: 'message', status: 'accepted', message: { type: 'track', event: 'a' } }));
    expect(result.current.frames).toHaveLength(1);

    rerender({ paused: true });
    act(() => source.emit({ kind: 'message', status: 'accepted', message: { type: 'track', event: 'b' } }));

    expect(result.current.frames).toHaveLength(1);
    expect(source.closed).toBe(false);
  });

  it('dropped frames add their count to the dropped counter', () => {
    const { result } = renderHook(() => useTrackingLiveStream({}, { paused: false }));
    const source = latestSource();

    act(() => source.emit({ kind: 'dropped', count: 3 }));
    act(() => source.emit({ kind: 'dropped', count: 2 }));

    expect(result.current.dropped).toBe(5);
    expect(result.current.frames).toHaveLength(0);
  });

  it('clear() resets frames and dropped', () => {
    const { result } = renderHook(() => useTrackingLiveStream({}, { paused: false }));
    const source = latestSource();

    act(() => {
      source.emit({ kind: 'message', status: 'accepted', message: { type: 'track', event: 'a' } });
      source.emit({ kind: 'dropped', count: 4 });
    });
    expect(result.current.frames).toHaveLength(1);
    expect(result.current.dropped).toBe(4);

    act(() => result.current.clear());

    expect(result.current.frames).toHaveLength(0);
    expect(result.current.dropped).toBe(0);
  });

  it('status transitions connecting -> open -> error and reconnects on error', async () => {
    const { result } = renderHook(() => useTrackingLiveStream({}, { paused: false }));
    expect(result.current.status).toBe('connecting');

    const first = latestSource();
    act(() => first.onopen?.());
    expect(result.current.status).toBe('open');

    vi.useFakeTimers();
    act(() => first.onerror?.());
    expect(result.current.status).toBe('error');
    expect(first.closed).toBe(true);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000);
    });
    vi.useRealTimers();

    const second = latestSource();
    expect(second).not.toBe(first);
  });

  it('builds the stream URL from the filter and reconnects when it changes', () => {
    const { rerender } = renderHook(
      ({ filter }: { filter: { sourceId?: string } }) => useTrackingLiveStream(filter, { paused: false }),
      { initialProps: { filter: {} } },
    );
    const first = latestSource();
    expect(first.url).toContain('/tracking/debugger/stream');
    expect(first.url).not.toContain('sourceId');

    rerender({ filter: { sourceId: 'src-1' } });

    expect(first.closed).toBe(true);
    const second = latestSource();
    expect(second.url).toContain('sourceId=src-1');
  });
});
