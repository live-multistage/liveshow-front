'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { LiveFrame, TrackingMessageType } from '@live-show/api-contracts';
import { config } from '@/config';
import { tokenStore } from '@/lib/auth/token-store';

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
          const receivedAt = new Date().toISOString();
          const appendIndex = appendCounterRef.current++;
          const key = frame.status === 'accepted' ? frame.message.messageId : `${receivedAt}-${appendIndex}`;
          setFrames((prev) => [{ ...frame, receivedAt, key }, ...prev].slice(0, MAX_FRAMES));
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

  const clear = useCallback(() => {
    setFrames([]);
    setDropped(0);
  }, []);

  return { frames, dropped, status, clear };
}
