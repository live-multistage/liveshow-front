import type { Json, TrackingContext, TrackingMessage } from '@live-show/api-contracts';
import type { TrackingPlan } from '../generated/tracking-plan';
import { buildContext } from './context';
import { effectiveConsent, type ConsentState } from './consent';
import {
  loadSession,
  nextSession,
  persistAnonymousId,
  persistSession,
  readPersistedAnonymousId,
  resolveAnonymousId,
  type SessionState,
} from './identity';
import { MessageQueue } from './queue';
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

  const initialEffective = getEffective();
  let currentStore: KeyValueStore | null = initialEffective === 'granted' ? (o.store ?? browserStore()) : null;

  // Reuse the id persisted by an earlier grant even while consent is unresolved — otherwise
  // every page load (consent undefined→null→granted) mints and persists a fresh id.
  let anonymousId = resolveAnonymousId();
  let rotatedByReset = false;
  if (initialEffective === 'granted') persistAnonymousId(anonymousId);

  let userId: string | undefined;
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
    const context = buildContext(session.id);
    const base = {
      messageId: randomUUID(),
      anonymousId,
      timestamp: new Date(nowFn()).toISOString(),
      context: campaign ? { ...context, campaign } : context,
      ...(userId ? { userId } : {}),
    };
    return { ...base, ...variant } as TrackingMessage;
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
        // another tab may have granted (and persisted) since construction; a reset() keeps its new id
        if (!rotatedByReset) anonymousId = readPersistedAnonymousId() ?? anonymousId;
        persistAnonymousId(anonymousId);
        queue.setStore(currentStore);
        queue.setFlushPolicy({ flushAt: flushAtOpt, flushIntervalMs: flushIntervalMsOpt });
        persistSession(currentStore, session);
        if (holding.length) {
          for (const m of holding) queue.enqueue(m.anonymousId === heldId ? { ...m, anonymousId } : m);
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

function createInertAnalytics<P extends Record<string, object>>(): Analytics<P> {
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
