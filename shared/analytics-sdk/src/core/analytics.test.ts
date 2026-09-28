import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createAnalytics } from './analytics';
import { memoryStore } from './storage';

const setup = (consent: 'granted' | 'denied' | null) => {
  const send = vi.fn().mockResolvedValue('ok');
  const store = memoryStore();
  const a = createAnalytics({ writeKey: 'wk', endpoint: 'https://api', consent, transport: { send }, store, flushAt: 1 });
  return { a, send, store };
};

describe('consent', () => {
  beforeEach(() => { document.cookie = 'sho_aid=; Max-Age=0'; localStorage.clear(); Object.defineProperty(navigator, 'globalPrivacyControl', { value: undefined, configurable: true }); });
  afterEach(() => { Object.defineProperty(navigator, 'globalPrivacyControl', { value: undefined, configurable: true }); });

  it('null: holds messages in memory, sends nothing, writes no cookie', async () => {
    const { a, send, store } = setup(null);
    a.trackUntyped('home_viewed'); await a.flush();
    expect(send).not.toHaveBeenCalled();
    expect(document.cookie).not.toContain('sho_aid');
    expect(store.get('sho_q')).toBeNull();
  });

  it('null → granted flushes held messages with the same anonymousId', async () => {
    const { a, send } = setup(null);
    a.trackUntyped('home_viewed');
    const anon = a.anonymousId;
    a.setConsent('granted'); await a.flush();
    const batch = send.mock.calls.flatMap((c) => c[0].batch);
    expect(batch.map((m: any) => m.event)).toContain('home_viewed');
    expect(batch[0].anonymousId).toBe(anon);
    expect(document.cookie).toContain(`sho_aid=${anon}`);
  });

  it('null → granted flushes held messages without an explicit flush() call', async () => {
    const send = vi.fn().mockResolvedValue('ok');
    const store = memoryStore();
    // flushAt above 1 so the assertion isolates setConsent's own flush call, not the
    // queue's enqueue-reaches-flushAt auto-trigger.
    const a = createAnalytics({ writeKey: 'wk', endpoint: 'https://api', consent: null, transport: { send }, store, flushAt: 5 });
    a.trackUntyped('home_viewed');
    a.setConsent('granted');
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(send).toHaveBeenCalled();
    const batch = send.mock.calls.flatMap((c) => c[0].batch);
    expect(batch.map((m: any) => m.event)).toContain('home_viewed');
  });

  it('null → denied discards held messages', async () => {
    const { a, send } = setup(null);
    a.trackUntyped('home_viewed'); a.setConsent('denied'); a.trackUntyped('x'); await a.flush();
    expect(send).not.toHaveBeenCalled();
  });

  it('granted → denied mid-session clears unsent queue and persisted copy', async () => {
    const send = vi.fn().mockResolvedValue('retry');
    const store = memoryStore();
    const a = createAnalytics({ writeKey: 'wk', endpoint: 'e', consent: 'granted', transport: { send }, store, flushAt: 100 });
    a.trackUntyped('a1');
    expect(store.get('sho_q')).not.toBeNull();
    a.setConsent('denied'); a.trackUntyped('a2'); await a.flush();
    expect(send).not.toHaveBeenCalled();
    expect(store.get('sho_q')).toBeNull();
  });

  it('GPC forces denied even when granted is passed', async () => {
    Object.defineProperty(navigator, 'globalPrivacyControl', { value: true, configurable: true });
    const { a, send } = setup('granted');
    a.trackUntyped('x'); await a.flush();
    expect(send).not.toHaveBeenCalled();
  });
});

describe('identity', () => {
  it('reset rotates anonymousId and session (shared computer)', () => {
    const { a } = setup('granted');
    a.identify('user-a');
    const [anon, sid] = [a.anonymousId, a.sessionId];
    a.reset();
    expect(a.anonymousId).not.toBe(anon);
    expect(a.sessionId).not.toBe(sid);
  });

  it('messages carry type-specific fields', async () => {
    const { a, send } = setup('granted');
    a.page(); a.identify('u1', { plan: 'x' }); a.group('org1'); a.alias('old');
    await a.flush();
    const types = send.mock.calls.flatMap((c) => c[0].batch).map((m: any) => m.type);
    expect(types).toEqual(['page', 'identify', 'group', 'alias']);
  });

  it('setCampaign attaches campaign to context on subsequent messages', async () => {
    const { a, send } = setup('granted');
    a.setCampaign({ source: 'newsletter', medium: 'email' });
    a.trackUntyped('home_viewed');
    await a.flush();
    const [message] = send.mock.calls.flatMap((c) => c[0].batch);
    expect(message.context.campaign).toEqual({ source: 'newsletter', medium: 'email' });
  });
});
