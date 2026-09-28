import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MessageQueue } from './queue';
import { memoryStore, browserStore } from './storage';
import type { Transport } from './transport';

const msg = (i: number) => ({ type: 'track', event: 'e', messageId: `m${i}`, anonymousId: 'a', timestamp: 't', context: { library: { name: 'x', version: '1' }, sessionId: 's' } }) as any;

describe('MessageQueue', () => {
  beforeEach(() => vi.useFakeTimers());
  const mk = (send: Transport['send'], extra = {}) =>
    new MessageQueue({ writeKey: 'wk', transport: { send }, flushAt: 3, flushIntervalMs: 5000, maxQueued: 5, store: memoryStore(), random: () => 1, ...extra });

  it('flushes when flushAt is reached', async () => {
    const send = vi.fn().mockResolvedValue('ok');
    const q = mk(send);
    q.enqueue(msg(1)); q.enqueue(msg(2)); expect(send).not.toHaveBeenCalled();
    q.enqueue(msg(3)); await vi.runOnlyPendingTimersAsync();
    expect(send).toHaveBeenCalledTimes(1);
    expect(send.mock.calls[0][0].batch).toHaveLength(3);
    expect(q.size).toBe(0);
  });

  it('flushes on interval', async () => {
    const send = vi.fn().mockResolvedValue('ok');
    const q = mk(send); q.enqueue(msg(1));
    await vi.advanceTimersByTimeAsync(5000);
    expect(send).toHaveBeenCalledTimes(1);
  });

  it('keeps messages and backs off on retry', async () => {
    const send = vi.fn().mockResolvedValueOnce('retry').mockResolvedValue('ok');
    const q = mk(send); q.enqueue(msg(1));
    await q.flush();
    expect(q.size).toBe(1);
    await vi.advanceTimersByTimeAsync(1000);
    expect(send).toHaveBeenCalledTimes(2);
    expect(q.size).toBe(0);
  });

  it('drops batch on drop result', async () => {
    const q = mk(vi.fn().mockResolvedValue('drop')); q.enqueue(msg(1));
    await q.flush(); expect(q.size).toBe(0);
  });

  it('caps queue by dropping oldest', () => {
    const q = mk(vi.fn(), { flushAt: 100 });
    for (let i = 0; i < 7; i++) q.enqueue(msg(i));
    expect(q.size).toBe(5);
  });

  it('persists and restores from store', () => {
    const store = memoryStore();
    const a = mk(vi.fn(), { flushAt: 100, store }); a.enqueue(msg(1)); a.stop();
    const b = mk(vi.fn(), { flushAt: 100, store });
    expect(b.size).toBe(1);
  });

  it('memory-only when store is null and clear() wipes persisted copy', () => {
    const store = memoryStore();
    const q = mk(vi.fn(), { flushAt: 100, store });
    q.enqueue(msg(1)); q.clear();
    expect(store.get('sho_q')).toBeNull(); expect(q.size).toBe(0);
    q.setStore(null); q.enqueue(msg(2));
    expect(store.get('sho_q')).toBeNull();
  });

  it('keepalive flush respects 60KB body cap', async () => {
    const send = vi.fn().mockResolvedValue('ok');
    const q = mk(send, { flushAt: 100, maxQueued: 100 });
    const big = (i: number) => ({ ...msg(i), properties: { p: 'x'.repeat(20_000) } });
    q.enqueue(big(1)); q.enqueue(big(2)); q.enqueue(big(3)); q.enqueue(big(4));
    await q.flush({ keepalive: true });
    expect(JSON.stringify(send.mock.calls[0][0]).length).toBeLessThanOrEqual(60 * 1024);
    expect(send.mock.calls[0][1]).toEqual({ keepalive: true });
  });

  it('setFlushPolicy(Infinity, null) holds messages: no size-triggered or timer-triggered send', async () => {
    const send = vi.fn().mockResolvedValue('ok');
    const q = mk(send, { flushAt: 3 });
    q.setFlushPolicy({ flushAt: Infinity, flushIntervalMs: null });
    q.enqueue(msg(1)); q.enqueue(msg(2)); q.enqueue(msg(3)); q.enqueue(msg(4));
    await vi.advanceTimersByTimeAsync(60000);
    expect(send).not.toHaveBeenCalled();
    expect(q.size).toBe(4);
  });

  it('enqueue does not throw when localStorage.setItem throws after construction', () => {
    const store = browserStore(); // construction probe succeeds against real jsdom localStorage
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('quota exceeded', 'QuotaExceededError');
    });
    const q = mk(vi.fn(), { store });
    expect(() => q.enqueue(msg(1))).not.toThrow();
    expect(q.size).toBe(1);
    vi.restoreAllMocks();
  });

  it('carries the failed attempt\'s keepalive flag into the scheduled retry', async () => {
    const send = vi.fn().mockResolvedValueOnce('retry').mockResolvedValue('ok');
    const q = mk(send);
    q.enqueue(msg(1));
    await q.flush({ keepalive: true });
    await vi.advanceTimersByTimeAsync(1000);
    expect(send).toHaveBeenCalledTimes(2);
    expect(send.mock.calls[1][1]).toEqual({ keepalive: true });
  });
});
