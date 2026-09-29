import type { Json, TrackingContext, TrackingMessage } from '@live-show/api-contracts';
import type { TrackingPlan } from '../generated/tracking-plan';
import { buildContext, type UrlSanitizer } from './context';
import { effectiveConsent, type ConsentState } from './consent';
import {
  clearPersistedIdentifiedUserId,
  clearPersistedIdentity,
  loadSession,
  nextSession,
  persistAnonymousId,
  persistIdentifiedUserId,
  persistSession,
  readFreshSession,
  readPersistedAnonymousId,
  readPersistedIdentifiedUserId,
  resolveAnonymousId,
  type SessionState,
} from './identity';
import { MessageQueue, QUEUE_STORAGE_KEY } from './queue';
import { browserStore, type KeyValueStore } from './storage';
import { createFetchTransport, type Transport } from './transport';
import { randomUUID } from './uuid';

export interface AnalyticsOptions {
  writeKey: string;
  endpoint: string;
  consent: ConsentState;
  getAuthToken?: () => string | null;
  flushAt?: number;
  flushIntervalMs?: number;
  transport?: Transport;
  store?: KeyValueStore;
  now?: () => number;
  /** Redacts secret path segments; query params other than utm_* are always dropped. */
  sanitizeUrl?: UrlSanitizer;
}

export interface Analytics<P extends Record<string, object> = TrackingPlan> {
  track<K extends keyof P & string>(event: K, properties: P[K]): void;
  trackUntyped(event: string, properties?: Record<string, Json>): void;
  page(name?: string, properties?: Record<string, Json>): void;
  identify(userId: string, traits?: Record<string, Json>): void;
  group(groupId: string, traits?: Record<string, Json>): void;
  alias(previousId: string): void;
  reset(): void;
  setConsent(state: ConsentState): void;
  setCampaign(campaign: TrackingContext['campaign']): void;
  flush(opts?: { keepalive?: boolean }): Promise<void>;
  readonly anonymousId: string;
  readonly sessionId: string;
}

// pending message cap while consent is null (spec: queue maxQueued 100 under null).
// Implemented as a holding array in front of the queue (which stays at maxQueued 1000)
// rather than a queue whose maxQueued changes shape mid-flight.
const HOLDING_CAP = 100;
const DEFAULT_FLUSH_AT = 20;
const DEFAULT_FLUSH_INTERVAL_MS = 5000;

type MessageVariant =
  | { type: 'track'; event: string; properties?: Record<string, Json> }
  | { type: 'page'; name?: string; properties?: Record<string, Json> }
  | { type: 'identify'; traits?: Record<string, Json> }
  | { type: 'group'; groupId: string; traits?: Record<string, Json> }
  | { type: 'alias'; previousId: string };

export function createAnalytics<P extends Record<string, object> = TrackingPlan>(
  o: AnalyticsOptions,
): Analytics<P> {
  if (typeof window === 'undefined') return createInertAnalytics<P>();

  const nowFn = o.now ?? Date.now;
  const flushAtOpt = o.flushAt ?? DEFAULT_FLUSH_AT;
  const flushIntervalMsOpt = o.flushIntervalMs ?? DEFAULT_FLUSH_INTERVAL_MS;
  const transport = o.transport ?? createFetchTransport({ endpoint: o.endpoint, getAuthToken: o.getAuthToken });

  let consentState: ConsentState = o.consent;
  const getEffective = (): ConsentState => effectiveConsent(consentState);

  // LGPD / spec: on denied, the queue and storage are cleared, not just left unsent.
  function clearPersistedState(): void {
    const store = o.store ?? browserStore();
    clearPersistedIdentity(store);
    store.remove(QUEUE_STORAGE_KEY);
  }

  const initialEffective = getEffective();
  if (initialEffective === 'denied') clearPersistedState();
  let currentStore: KeyValueStore | null = initialEffective === 'granted' ? (o.store ?? browserStore()) : null;

  // Reuse the id persisted by an earlier grant even while consent is unresolved — otherwise
  // every page load (consent undefined→null→granted) mints and persists a fresh id.
  let anonymousId = resolveAnonymousId();
  let rotatedByReset = false;
  if (initialEffective === 'granted') persistAnonymousId(anonymousId);

  let userId: string | undefined;
  // Survives reloads via the same cookie+localStorage pair as anonymousId, so a logged-in
  // user re-opening the site doesn't re-send identify on every page load. Reading is allowed
  // under any consent state (only writing is gated); when denied, clearPersistedState() above
  // already wiped it, so this reads back null.
  let lastIdentifiedUserId: string | null = readPersistedIdentifiedUserId();
  let session: SessionState = loadSession(currentStore, nowFn());
  if (currentStore) persistSession(currentStore, session);

  let holding: TrackingMessage[] = [];
  let campaign: TrackingContext['campaign'] | undefined;

  const queue = new MessageQueue({
    writeKey: o.writeKey,
    transport,
    flushAt: flushAtOpt,
    flushIntervalMs: flushIntervalMsOpt,
    maxQueued: 1000,
    store: currentStore,
    now: nowFn,
  });
  if (initialEffective !== 'granted') queue.setFlushPolicy({ flushAt: Infinity, flushIntervalMs: null });

  function touchSession(): void {
    session = nextSession(session, nowFn());
    if (currentStore) persistSession(currentStore, session);
  }

  function buildMessage(variant: MessageVariant): TrackingMessage {
    const context = buildContext(session.id, o.sanitizeUrl);
    const base = {
      messageId: randomUUID(),
      anonymousId,
      timestamp: new Date(nowFn()).toISOString(),
      context: campaign ? { ...context, campaign } : context,
      ...(userId ? { userId } : {}),
    };
    return { ...base, ...variant } as TrackingMessage;
  }

  function adoptPersistedIdentity(m: TrackingMessage, heldId: string, heldSessionId: string): TrackingMessage {
    const withAnon = m.anonymousId === heldId ? { ...m, anonymousId } : m;
    if (withAnon.context.sessionId !== heldSessionId) return withAnon;
    return { ...withAnon, context: { ...withAnon.context, sessionId: session.id } };
  }

  function deliver(effective: ConsentState, build: () => TrackingMessage): void {
    touchSession();
    const message = build();
    if (effective === null) {
      holding.push(message);
      if (holding.length > HOLDING_CAP) holding.shift();
      return;
    }
    queue.enqueue(message);
  }

  const api: Analytics<P> = {
    get anonymousId(): string {
      return anonymousId;
    },
    get sessionId(): string {
      return session.id;
    },
    track(event, properties) {
      api.trackUntyped(event, properties as unknown as Record<string, Json>);
    },
    trackUntyped(event, properties) {
      const effective = getEffective();
      if (effective === 'denied') return;
      deliver(effective, () => buildMessage({ type: 'track', event, properties }));
    },
    page(name, properties) {
      const effective = getEffective();
      if (effective === 'denied') return;
      deliver(effective, () => buildMessage({ type: 'page', name, properties }));
    },
    identify(userIdArg, traits) {
      const effective = getEffective();
      if (effective === 'denied') return;
      userId = userIdArg;
      if (userIdArg === lastIdentifiedUserId) return; // already identified in this browser
      lastIdentifiedUserId = userIdArg;
      if (currentStore) persistIdentifiedUserId(userIdArg);
      deliver(effective, () => buildMessage({ type: 'identify', traits }));
    },
    group(groupId, traits) {
      const effective = getEffective();
      if (effective === 'denied') return;
      deliver(effective, () => buildMessage({ type: 'group', groupId, traits }));
    },
    alias(previousId) {
      const effective = getEffective();
      if (effective === 'denied') return;
      deliver(effective, () => buildMessage({ type: 'alias', previousId }));
    },
    reset() {
      const effective = getEffective();
      if (effective === 'denied') return;
      void api.flush(); // flush pending under the old identity before rotating it
      anonymousId = randomUUID();
      rotatedByReset = true;
      userId = undefined;
      lastIdentifiedUserId = null;
      clearPersistedIdentifiedUserId();
      session = nextSession(null, nowFn());
      if (currentStore) {
        persistAnonymousId(anonymousId);
        persistSession(currentStore, session);
      }
    },
    setConsent(state) {
      consentState = state;
      const effective = getEffective();

      if (effective === 'granted') {
        currentStore = currentStore ?? o.store ?? browserStore();
        const heldId = anonymousId;
        const heldSessionId = session.id;
        // an earlier page load (or another tab) may have persisted an id/session; a reset() keeps its new ones
        if (!rotatedByReset) {
          anonymousId = readPersistedAnonymousId() ?? anonymousId;
          session = readFreshSession(currentStore, nowFn()) ?? session;
          // another tab may have identified since construction; adopt its id too
          lastIdentifiedUserId = readPersistedIdentifiedUserId() ?? lastIdentifiedUserId;
        }
        persistAnonymousId(anonymousId);
        queue.setStore(currentStore);
        queue.setFlushPolicy({ flushAt: flushAtOpt, flushIntervalMs: flushIntervalMsOpt });
        persistSession(currentStore, session);
        if (holding.length) {
          for (const m of holding) {
            // an identify for the now-adopted user was already sent (by this tab pre-grant
            // or another tab); drop it instead of replaying a duplicate.
            if (m.type === 'identify' && lastIdentifiedUserId && m.userId === lastIdentifiedUserId) continue;
            queue.enqueue(adoptPersistedIdentity(m, heldId, heldSessionId));
          }
          holding = [];
        }
        void queue.flush();
        return;
      }

      if (effective === 'denied') {
        holding = [];
        queue.clear();
        queue.stop();
        currentStore = null;
        queue.setStore(null);
        clearPersistedState();
        lastIdentifiedUserId = null;
        return;
      }

      // null: pause delivery without discarding what's already queued in memory
      currentStore = null;
      queue.setStore(null);
      queue.setFlushPolicy({ flushAt: Infinity, flushIntervalMs: null });
    },
    async flush(opts) {
      if (getEffective() !== 'granted') return;
      await queue.flush(opts);
    },
    setCampaign(c) {
      campaign = c;
    },
  };

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') void api.flush({ keepalive: true });
  });

  return api;
}

export function createInertAnalytics<P extends Record<string, object>>(): Analytics<P> {
  return {
    track: () => {},
    trackUntyped: () => {},
    page: () => {},
    identify: () => {},
    group: () => {},
    alias: () => {},
    reset: () => {},
    setConsent: () => {},
    setCampaign: () => {},
    flush: async () => {},
    anonymousId: '',
    sessionId: '',
  };
}
