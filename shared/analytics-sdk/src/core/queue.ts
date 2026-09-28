import { TRACKING_LIMITS, type TrackingMessage } from '@live-show/api-contracts';
import type { KeyValueStore } from './storage';
import type { SendResult, Transport } from './transport';

const STORAGE_KEY = 'sho_q';
const KEEPALIVE_MAX_BYTES = 60 * 1024; // fetch keepalive body cap is 64KB, leave headroom

export interface QueueOptions {
  writeKey: string;
  transport: Transport;
  flushAt: number;
  flushIntervalMs: number;
  maxQueued: number;
  store: KeyValueStore | null;
  now?: () => number;
  random?: () => number;
}

function byteSize(json: string): number {
  if (typeof Blob !== 'undefined') return new Blob([json]).size;
  return json.length;
}

export class MessageQueue {
  private writeKey: string;
  private transport: Transport;
  private flushAt: number;
  private flushIntervalMs: number | null;
  private maxQueued: number;
  private store: KeyValueStore | null;
  private now: () => number;
  private random: () => number;

  private queue: TrackingMessage[] = [];
  private timer: ReturnType<typeof setInterval> | null = null;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private inFlight = false;
  private attempt = 0;

  constructor(o: QueueOptions) {
    this.writeKey = o.writeKey;
    this.transport = o.transport;
    this.flushAt = o.flushAt;
    this.flushIntervalMs = o.flushIntervalMs;
    this.maxQueued = o.maxQueued;
    this.store = o.store;
    this.now = o.now ?? Date.now;
    this.random = o.random ?? Math.random;

    if (this.store) {
      const raw = this.store.get(STORAGE_KEY);
      if (raw) {
        try {
          this.queue = JSON.parse(raw) as TrackingMessage[];
        } catch {
          this.queue = [];
        }
      }
    }

    this.startTimer();
  }

  get size(): number {
    return this.queue.length;
  }

  enqueue(m: TrackingMessage): void {
    this.queue.push(m);
    if (this.queue.length > this.maxQueued) {
      this.queue.splice(0, this.queue.length - this.maxQueued);
    }
    this.persist();
    if (this.queue.length >= this.flushAt) {
      void this.flush();
    }
  }

  async flush(opts?: { keepalive?: boolean }): Promise<void> {
    if (this.inFlight || this.queue.length === 0) return;
    this.inFlight = true;
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }

    const keepalive = opts?.keepalive ?? false;
    const sentAt = new Date(this.now()).toISOString();
    const stamped = this.queue.map((m) => ({ ...m, sentAt }));
    const batch = this.selectBatch(stamped, keepalive);

    const result: SendResult = await this.transport.send({ writeKey: this.writeKey, batch }, { keepalive });

    if (result === 'ok' || result === 'drop') {
      this.queue.splice(0, batch.length);
      this.persist();
      this.attempt = 0;
    } else {
      const delay = Math.min(60000, 1000 * 2 ** this.attempt) * (0.5 + this.random() / 2);
      this.attempt += 1;
      this.retryTimer = setTimeout(() => {
        void this.flush({ keepalive });
      }, delay);
    }

    this.inFlight = false;

    // A threshold-triggered flush that arrived while this one was in-flight was a no-op
    // (see the inFlight guard above) and its intent would otherwise be lost. Re-check here
    // so messages enqueued during the in-flight window still go out promptly.
    if ((result === 'ok' || result === 'drop') && this.queue.length >= this.flushAt) {
      void this.flush();
    }
  }

  clear(): void {
    this.queue = [];
    if (this.store) this.store.remove(STORAGE_KEY);
  }

  setStore(s: KeyValueStore | null): void {
    this.store = s;
  }

  setFlushPolicy(p: { flushAt: number; flushIntervalMs: number | null }): void {
    this.flushAt = p.flushAt;
    this.flushIntervalMs = p.flushIntervalMs;
    this.startTimer();
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }
  }

  private startTimer(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer =
      this.flushIntervalMs != null
        ? setInterval(() => {
            void this.flush();
          }, this.flushIntervalMs)
        : null;
  }

  private persist(): void {
    if (!this.store) return;
    this.store.set(STORAGE_KEY, JSON.stringify(this.queue));
  }

  private selectBatch(stamped: TrackingMessage[], keepalive: boolean): TrackingMessage[] {
    const maxMessages = TRACKING_LIMITS.maxBatchMessages;
    const maxBytes = keepalive ? KEEPALIVE_MAX_BYTES : TRACKING_LIMITS.maxBatchBytes;
    const selected: TrackingMessage[] = [];

    for (const m of stamped) {
      if (selected.length >= maxMessages) break;
      const candidate = [...selected, m];
      const bytes = byteSize(JSON.stringify({ writeKey: this.writeKey, batch: candidate }));
      if (bytes > maxBytes) {
        if (selected.length === 0) selected.push(m); // must send at least one, even if oversized
        break;
      }
      selected.push(m);
    }

    return selected;
  }
}
