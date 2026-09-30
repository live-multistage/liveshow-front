'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { LiveFrame, TrackingMessageType } from '@live-show/api-contracts';
import { config } from '@/config';
import { tokenStore } from '@/lib/auth/token-store';
import { trackingAdminService } from '../services/tracking-admin.service';

export interface LiveFilter {
  sourceId?: string;
  type?: TrackingMessageType;
  event?: string;
  userId?: string;
  anonymousId?: string;
  status?: 'accepted' | 'rejected';
}

export type LiveStreamStatus = 'connecting' | 'open' | 'error';

// Frames as stored/rendered: stamped with the client's own receipt time
// (never drifts on re-render, unlike computing `Date.now()` at render time)
// and a stable list key. Accepted messages already carry a messageId; a
// rejected frame has none, so it gets one synthesized from receivedAt + the
// append order.
export type LiveStreamFrame = LiveFrame & { receivedAt: string; key: string };

const MAX_FRAMES = 500;
// Mirrors use-notifications-stream.ts / use-chat.ts: EventSource's own retry
// is ~3s, matched as the base backoff delay so a dead endpoint (with a
// healthy refresh route) can't turn into a tight busy-loop.
const BASE_RECONNECT_DELAY_MS = 3000;
const MAX_RECONNECT_DELAY_MS = 60_000;
const MAX_CONSECUTIVE_FAILURES = 5;

async function refreshAccessToken(): Promise<string | null> {
  try {
    const res = await fetch('/api/auth/refresh', { method: 'POST' });
    if (!res.ok) return null;
    const data = (await res.json()) as { accessToken: string };
    tokenStore.set(data.accessToken);
    return data.accessToken;
  } catch {
    return null;
  }
}

// Identifies a frame for dedupe across the SSE stream and the recent-frames
// backfill: an accepted message's own messageId, or (rejected has none) the
// raw payload + reason it failed on.
function dedupeKey(frame: LiveFrame): string {
  if (frame.kind === 'message' && frame.status === 'accepted') return frame.message.messageId;
  if (frame.kind === 'message' && frame.status === 'rejected') return JSON.stringify({ raw: frame.raw, reason: frame.reason });
  return '';
}

function buildStreamUrl(filter: LiveFilter, token: string | null): string {
  const params = new URLSearchParams();
  if (filter.sourceId) params.set('sourceId', filter.sourceId);
  if (filter.type) params.set('type', filter.type);
  if (filter.event) params.set('event', filter.event);
  if (filter.userId) params.set('userId', filter.userId);
  if (filter.anonymousId) params.set('anonymousId', filter.anonymousId);
  if (filter.status) params.set('status', filter.status);
  if (token) params.set('token', token);
  const query = params.toString();
  return `${config.apiUrl}/tracking/debugger/stream${query ? `?${query}` : ''}`;
}

export function useTrackingLiveStream(filter: LiveFilter, options: { paused: boolean }) {
  const [frames, setFrames] = useState<LiveStreamFrame[]>([]);
  const [dropped, setDropped] = useState(0);
  const [status, setStatus] = useState<LiveStreamStatus>('connecting');

  const sourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pausedRef = useRef(options.paused);
  pausedRef.current = options.paused;
  const appendCounterRef = useRef(0);

  // Only the filter's own values should trigger a reconnect (a new object on
  // every render must not).
  const filterKey = JSON.stringify(filter);

  useEffect(() => {
    let cancelled = false;
    let consecutiveFailures = 0;

    function connect() {
      setStatus('connecting');
      const source = new EventSource(buildStreamUrl(JSON.parse(filterKey) as LiveFilter, tokenStore.get()));
      sourceRef.current = source;

      source.onopen = () => {
        if (cancelled) return;
        consecutiveFailures = 0;
        setStatus('open');
      };

      source.onmessage = (event) => {
        try {
          const frame = JSON.parse(event.data) as LiveFrame;
          if (frame.kind === 'dropped') {
            setDropped((prev) => prev + frame.count);
            return;
          }
          if (pausedRef.current) return;
          setFrames((prev) => {
            // Same frame may already be in the list via the recent-frames
            // backfill (or, rarely, a stream reconnect replaying it). An
            // empty dedupe key (no messageId/raw+reason to key on) never
            // matches anything, so it's always appended.
            const dedupe = dedupeKey(frame);
            if (dedupe && prev.some((existing) => dedupeKey(existing) === dedupe)) return prev;
            const receivedAt = new Date().toISOString();
            const appendIndex = appendCounterRef.current++;
            const key = frame.status === 'accepted' ? frame.message.messageId : `${receivedAt}-${appendIndex}`;
            return [{ ...frame, receivedAt, key }, ...prev].slice(0, MAX_FRAMES);
          });
        } catch {
          // Malformed frame — ignore, the next one will still arrive fine.
        }
      };

      // Same reasoning as use-chat.ts: the token in the URL is short-lived,
      // so a bare EventSource retry would keep hammering it with a dead
      // token. Refresh once per failure streak, back off exponentially, and
      // give up scheduling further attempts after too many in a row.
      source.onerror = () => {
        source.close();
        if (cancelled) return;
        setStatus('error');
        consecutiveFailures += 1;
        if (consecutiveFailures > MAX_CONSECUTIVE_FAILURES) return;

        const delay = Math.min(
          BASE_RECONNECT_DELAY_MS * 2 ** (consecutiveFailures - 1),
          MAX_RECONNECT_DELAY_MS,
        );
        reconnectTimeoutRef.current = setTimeout(() => {
          if (cancelled) return;
          const currentToken = tokenStore.get();
          if (!currentToken) {
            connect();
            return;
          }
          void refreshAccessToken().then(() => {
            if (!cancelled) connect();
          });
        }, delay);
      };
    }

    connect();

    return () => {
      cancelled = true;
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      sourceRef.current?.close();
      sourceRef.current = null;
    };
  }, [filterKey]);

  // Backfill on mount and whenever the filter changes: the SSE stream has no
  // history, so without this the list starts empty on every reload.
  useEffect(() => {
    let cancelled = false;
    trackingAdminService
      .getRecentDebuggerFrames(JSON.parse(filterKey) as LiveFilter)
      .then((items) => {
        if (cancelled) return;
        setFrames((prev) => {
          const existingKeys = new Set(prev.map(dedupeKey));
          const additions: LiveStreamFrame[] = [];
          // Newest first, matching the list's own ordering.
          for (const frame of [...items].reverse()) {
            if (frame.kind !== 'message') continue; // the buffer never holds 'dropped' frames
            const key = dedupeKey(frame);
            if (existingKeys.has(key)) continue;
            existingKeys.add(key);
            const receivedAt = frame.status === 'accepted' ? frame.message.timestamp : new Date().toISOString();
            additions.push({ ...frame, receivedAt, key: key || `${receivedAt}-${appendCounterRef.current++}` });
          }
          return [...additions, ...prev].slice(0, MAX_FRAMES);
        });
      })
      .catch(() => {
        // A failed backfill must not break the live stream — it just stays empty.
      });
    return () => {
      cancelled = true;
    };
  }, [filterKey]);

  const clear = useCallback(() => {
    setFrames([]);
    setDropped(0);
  }, []);

  return { frames, dropped, status, clear };
}
