'use client';

import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { config } from '@/config';
import { tokenStore } from '@/lib/auth/token-store';
import { useAuth } from '@/features/account/hooks/use-auth';
import { notificationKeys } from '../queries/get-notifications';
import type { NotificationResponse } from '../types/notification.types';

async function refreshAccessToken(): Promise<string | null> {
  try {
    const res = await fetch('/api/auth/refresh', { method: 'POST' });
    if (!res.ok) return null;
    const data = await res.json() as { accessToken: string };
    tokenStore.set(data.accessToken);
    return data.accessToken;
  } catch {
    return null;
  }
}

export function useNotificationsStream() {
  const { isLoggedIn } = useAuth();
  const queryClient = useQueryClient();
  const sourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!isLoggedIn) return;

    let cancelled = false;

    function connect(token: string) {
      const source = new EventSource(`${config.apiUrl}/notifications/stream?token=${token}`);
      sourceRef.current = source;

      source.onmessage = (event) => {
        const notification = JSON.parse(event.data) as NotificationResponse;
        queryClient.invalidateQueries({ queryKey: notificationKeys.all });
        toast(notification.title, { description: notification.message });
      };

      // The token in the URL is only valid for 15 minutes (see
      // jwt-token.service.ts) and EventSource's native retry would
      // otherwise keep reconnecting with that same dead token — so on
      // error, refresh first and reconnect with the new one.
      source.onerror = () => {
        source.close();
        if (cancelled) return;
        void refreshAccessToken().then((token) => {
          if (!cancelled && token) connect(token);
        });
      };
    }

    const initialToken = tokenStore.get();
    if (initialToken) connect(initialToken);

    return () => {
      cancelled = true;
      sourceRef.current?.close();
      sourceRef.current = null;
    };
  }, [isLoggedIn, queryClient]);
}
