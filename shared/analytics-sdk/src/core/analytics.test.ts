import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createAnalytics } from './analytics';
import { memoryStore } from './storage';

const setup = (consent: 'granted' | 'denied' | null) => {
  const send = vi.fn().mockResolvedValue('ok');
  const store = memoryStore();
  const a = createAnalytics({ writeKey: 'wk', endpoint: 'https://api', consent, transport: { send }, store, flushAt: 1 });
  return { a, send, store };
};

const sentBatch = (send: ReturnType<typeof vi.fn>) => send.mock.calls.flatMap((c) => c[0].batch);

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

  it('reuses a previously persisted sho_aid across reloads when consent starts null', async () => {
    document.cookie = 'sho_aid=existing-aid; Path=/';
    const first = setup(null);
    first.a.trackUntyped('home_viewed');
    first.a.setConsent('granted'); await first.a.flush();
    const sent = first.send.mock.calls.flatMap((c) => c[0].batch);
    expect(sent.map((m: any) => m.anonymousId)).toEqual(['existing-aid']);

    const reload = setup(null); // new page load
    reload.a.setConsent('granted');
    expect(reload.a.anonymousId).toBe('existing-aid');
    expect(document.cookie).toContain('sho_aid=existing-aid');
  });

  it('adopts an id persisted after construction and rewrites held messages on grant', async () => {
    const { a, send } = setup(null);
    a.trackUntyped('home_viewed');
    localStorage.setItem('sho_aid', 'other-tab-aid');
    a.setConsent('granted'); await a.flush();
    const [held] = send.mock.calls.flatMap((c) => c[0].batch);
    expect(held.anonymousId).toBe('other-tab-aid');
  });

  it('reset before grant keeps the rotated id instead of the persisted one', () => {
    document.cookie = 'sho_aid=existing-aid; Path=/';
    const { a } = setup(null);
    a.reset();
    const rotated = a.anonymousId;
    a.setConsent('granted');
    expect(rotated).not.toBe('existing-aid');
    expect(a.anonymousId).toBe(rotated);
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

describe('identify dedup across reloads', () => {
  beforeEach(() => {
    document.cookie = 'sho_aid=; Max-Age=0';
    document.cookie = 'sho_uid=; Max-Age=0';
    localStorage.clear();
  });

  it('does not resend identify for the same userId across reloads', async () => {
    const send1 = vi.fn().mockResolvedValue('ok');
    const a1 = createAnalytics({ writeKey: 'wk', endpoint: 'e', consent: 'granted', transport: { send: send1 }, flushAt: 1 });
    a1.identify('user-a');
    await a1.flush();
    expect(sentBatch(send1).filter((m: any) => m.type === 'identify')).toHaveLength(1);

    // simulate a page reload: fresh analytics instance, same browser storage
    const send2 = vi.fn().mockResolvedValue('ok');
    const a2 = createAnalytics({ writeKey: 'wk', endpoint: 'e', consent: 'granted', transport: { send: send2 }, flushAt: 1 });
    a2.identify('user-a');
    await a2.flush();
    expect(sentBatch(send2).filter((m: any) => m.type === 'identify')).toHaveLength(0);
  });

  it('resends identify when the user changes (A → B) after reset', async () => {
    const send = vi.fn().mockResolvedValue('ok');
    const a = createAnalytics({ writeKey: 'wk', endpoint: 'e', consent: 'granted', transport: { send }, flushAt: 1 });
    a.identify('user-a');
    a.reset();
    a.identify('user-b');
    await a.flush();
    const identifies = sentBatch(send).filter((m: any) => m.type === 'identify');
    expect(identifies).toHaveLength(2);
    expect(identifies[1].userId).toBe('user-b');
  });

  it('does not resend identify for the same userId when consent starts null then grants', async () => {
    localStorage.setItem('sho_uid', 'user-a');
    const send = vi.fn().mockResolvedValue('ok');
    const store = memoryStore();
    const a = createAnalytics({ writeKey: 'wk', endpoint: 'e', consent: null, transport: { send }, store, flushAt: 1 });
    a.identify('user-a');
    a.setConsent('granted');
    await a.flush();
    expect(sentBatch(send).filter((m: any) => m.type === 'identify')).toHaveLength(0);

    a.reset();
    a.identify('user-b');
    await a.flush();
    expect(sentBatch(send).filter((m: any) => m.type === 'identify')).toHaveLength(1);
  });

  it('clears the persisted identified user on denied', () => {
    const a = createAnalytics({ writeKey: 'wk', endpoint: 'e', consent: 'granted', transport: { send: vi.fn() } });
    a.identify('user-a');
    expect(localStorage.getItem('sho_uid')).toBe('user-a');
    a.setConsent('denied');
    expect(localStorage.getItem('sho_uid')).toBeNull();
    expect(document.cookie).not.toContain('sho_uid');
  });
});

describe('session continuity across reloads (consent starts null)', () => {
  beforeEach(() => { document.cookie = 'sho_aid=; Max-Age=0'; localStorage.clear(); });

  const MINUTE = 60 * 1000;
  const reload = (storedAt: number, now: number) => {
    const send = vi.fn().mockResolvedValue('ok');
    const store = memoryStore();
    store.set('sho_sid', 'stored-sid');
    store.set('sho_sid_at', String(storedAt));
    const a = createAnalytics({ writeKey: 'wk', endpoint: 'e', consent: null, transport: { send }, store, flushAt: 1, now: () => now });
    return { a, send, store };
  };

  it('adopts a fresh persisted session on grant and rewrites held messages', async () => {
    const now = 1_000_000_000;
    const { a, send, store } = reload(now - 5 * MINUTE, now);
    a.trackUntyped('home_viewed');
    a.setConsent('granted'); await a.flush();
    expect(sentBatch(send).map((m: any) => m.context.sessionId)).toEqual(['stored-sid']);
    expect(a.sessionId).toBe('stored-sid');
    expect(store.get('sho_sid')).toBe('stored-sid');
  });

  it('starts a new session when the persisted one is idle for more than 30 minutes', async () => {
    const now = 1_000_000_000;
    const { a, send, store } = reload(now - 31 * MINUTE, now);
    a.trackUntyped('home_viewed');
    a.setConsent('granted'); await a.flush();
    const [sent] = sentBatch(send);
    expect(sent.context.sessionId).not.toBe('stored-sid');
    expect(store.get('sho_sid')).toBe(sent.context.sessionId);
  });

  it('reset before grant keeps the rotated session', () => {
    const now = 1_000_000_000;
    const { a } = reload(now - MINUTE, now);
    a.reset();
    const rotated = a.sessionId;
    a.setConsent('granted');
    expect(a.sessionId).toBe(rotated);
    expect(rotated).not.toBe('stored-sid');
  });
});

describe('denied clears persisted identity', () => {
  beforeEach(() => { document.cookie = 'sho_aid=; Max-Age=0'; localStorage.clear(); Object.defineProperty(navigator, 'globalPrivacyControl', { value: undefined, configurable: true }); });
  afterEach(() => { Object.defineProperty(navigator, 'globalPrivacyControl', { value: undefined, configurable: true }); });

  // no injected store: exercises the real localStorage-backed persistence
  const expectIdentityCleared = () => {
    expect(document.cookie).not.toContain('sho_aid');
    for (const k of ['sho_aid', 'sho_sid', 'sho_sid_at', 'sho_q']) expect(localStorage.getItem(k)).toBeNull();
  };

  it('granted → denied removes sho_aid cookie + localStorage and session/queue keys', () => {
    const send = vi.fn().mockResolvedValue('retry');
    const a = createAnalytics({ writeKey: 'wk', endpoint: 'e', consent: 'granted', transport: { send }, flushAt: 100 });
    a.trackUntyped('a1');
    expect(document.cookie).toContain('sho_aid');
    for (const k of ['sho_aid', 'sho_sid', 'sho_sid_at', 'sho_q']) expect(localStorage.getItem(k)).not.toBeNull();
    a.setConsent('denied');
    expectIdentityCleared();
  });

  it('constructing under GPC clears identity persisted by an earlier grant', () => {
    document.cookie = 'sho_aid=old-aid; Path=/';
    localStorage.setItem('sho_aid', 'old-aid');
    localStorage.setItem('sho_sid', 'old-sid'); localStorage.setItem('sho_sid_at', '1'); localStorage.setItem('sho_q', '[]');
    Object.defineProperty(navigator, 'globalPrivacyControl', { value: true, configurable: true });
    createAnalytics({ writeKey: 'wk', endpoint: 'e', consent: null, transport: { send: vi.fn() } });
    expectIdentityCleared();
  });

  it('constructing with consent null keeps the persisted identity', () => {
    document.cookie = 'sho_aid=old-aid; Path=/';
    createAnalytics({ writeKey: 'wk', endpoint: 'e', consent: null, transport: { send: vi.fn() }, store: memoryStore() });
    expect(document.cookie).toContain('sho_aid=old-aid');
  });
});

describe('page url sanitization', () => {
  afterEach(() => history.replaceState(null, '', '/'));

  it('applies the sanitizeUrl option to every message', async () => {
    history.replaceState(null, '', '/invitations/tok-1?token=x');
    const send = vi.fn().mockResolvedValue('ok');
    const sanitizeUrl = (url: URL) => { url.pathname = '/invitations/:token'; return url; };
    const a = createAnalytics({ writeKey: 'wk', endpoint: 'e', consent: 'granted', transport: { send }, store: memoryStore(), flushAt: 1, sanitizeUrl });
    a.page(); await a.flush();
    const [m] = sentBatch(send);
    expect(m.context.page.path).toBe('/invitations/:token');
    expect(JSON.stringify(m)).not.toMatch(/tok-1|token=x/);
  });
});
