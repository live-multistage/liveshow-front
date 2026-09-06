'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { CHAT_ERROR_CODES, REACTION_EMOJIS } from '@live-show/api-contracts';
import type { ChatMe, ChatMessage as ContractChatMessage, ReactionEmoji } from '@live-show/api-contracts';
import { tokenStore } from '@/lib/auth/token-store';
import { normalizeError } from '@/lib/http/errors';
import { useAuth } from '@/features/account/hooks/use-auth';
import { chatService } from '../services/chat.service';
import { chatKeys } from '../queries/chat.keys';
import type { ChatMessage } from '../types/chat.types';

const AVATAR_COLORS = ['#46d6d8', '#9b7bff', '#7fe0a0', '#ff7a4d', '#bba6ff', '#ffd166'];
const MAX_MESSAGES = 500;
// EventSource's own default retry interval is ~3s; matched here so a dead
// SSE endpoint (with a healthy refresh route) can't turn into a tight
// refresh->connect->error busy-loop. Mirrors use-notifications-stream.ts.
const RECONNECT_DELAY_MS = 3000;

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '??';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function decorate(message: ContractChatMessage): ChatMessage {
  return {
    ...message,
    authorInitials: initialsFromName(message.authorName),
    authorColor: AVATAR_COLORS[hashString(message.authorName) % AVATAR_COLORS.length],
  };
}

function emptyReactionCounts(): Record<ReactionEmoji, number> {
  return REACTION_EMOJIS.reduce(
    (acc, emoji) => ({ ...acc, [emoji]: 0 }),
    {} as Record<ReactionEmoji, number>,
  );
}

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

export type ChatStatus = 'connecting' | 'live' | 'reconnecting';

// ChatDock/ReactionBar (T7's files, kept untouched) import this from here.
export { REACTION_EMOJIS };

export function useChat(eventId: string | null) {
  const { user } = useAuth();
  const t = useTranslations('chat');

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [reactionCounts, setReactionCounts] = useState<Record<ReactionEmoji, number>>(emptyReactionCounts);
  const [me, setMe] = useState<ChatMe | null>(null);
  const [status, setStatus] = useState<ChatStatus>('connecting');

  const sourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seededEventIdRef = useRef<string | null>(null);

  const recentQuery = useQuery({
    queryKey: chatKeys.recent(eventId ?? ''),
    queryFn: () => chatService.recent(eventId as string),
    staleTime: Infinity,
    enabled: eventId !== null,
  });

  // Recent-messages bootstrap seeds local state exactly once per eventId —
  // afterwards `messages`/`me` are owned by the SSE stream (and mutations),
  // not by the query, so a background refetch can't clobber live updates.
  useEffect(() => {
    if (!recentQuery.data || seededEventIdRef.current === eventId) return;
    seededEventIdRef.current = eventId;
    setMessages(recentQuery.data.messages.map(decorate));
    setMe(recentQuery.data.me);
  }, [eventId, recentQuery.data]);

  // Resets the connecting/live/reconnecting indicator whenever the caller
  // switches which event's chat this hook is bound to.
  useEffect(() => {
    setStatus('connecting');
  }, [eventId]);

  useEffect(() => {
    // No event to chat about (chat disabled, or not resolved yet) — never
    // open an SSE connection, never hit the service. See Task 7 addendum.
    if (eventId === null) return;
    let cancelled = false;

    function connect() {
      const token = tokenStore.get();
      const source = new EventSource(chatService.streamUrl(eventId, token));
      sourceRef.current = source;

      source.onopen = () => {
        if (!cancelled) setStatus('live');
      };

      source.addEventListener('message', (event) => {
        try {
          const message = JSON.parse((event as MessageEvent<string>).data) as ContractChatMessage;
          setMessages((prev) => {
            if (prev.some((m) => m.id === message.id)) return prev;
            const next = [...prev, decorate(message)];
            return next.length > MAX_MESSAGES ? next.slice(next.length - MAX_MESSAGES) : next;
          });
        } catch {
          // Malformed frame — ignore, next event will still arrive fine.
        }
      });

      source.addEventListener('message.deleted', (event) => {
        try {
          const { messageId } = JSON.parse((event as MessageEvent<string>).data) as { messageId: string };
          setMessages((prev) => prev.filter((m) => m.id !== messageId));
        } catch {
          // ignore
        }
      });

      source.addEventListener('reactions', (event) => {
        try {
          const { counts } = JSON.parse((event as MessageEvent<string>).data) as {
            counts: Record<ReactionEmoji, number>;
          };
          setReactionCounts(counts);
        } catch {
          // ignore
        }
      });

      source.addEventListener('muted', (event) => {
        try {
          const { userId, muted } = JSON.parse((event as MessageEvent<string>).data) as {
            userId: string;
            muted: boolean;
          };
          if (userId !== user?.id) return;
          setMe((prev) => (prev ? { ...prev, isMuted: muted, canWrite: !muted } : prev));
        } catch {
          // ignore
        }
      });

      // The token in the URL is only valid for 15 minutes and EventSource's
      // native retry would otherwise keep reconnecting with that same dead
      // token — so on error, refresh first (when logged in) and reconnect
      // with the new one. Anonymous viewers just retry after the delay.
      source.onerror = () => {
        source.close();
        if (cancelled) return;
        setStatus('reconnecting');
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
        }, RECONNECT_DELAY_MS);
      };
    }

    connect();

    return () => {
      cancelled = true;
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      sourceRef.current?.close();
      sourceRef.current = null;
    };
  }, [eventId, user?.id]);

  const sendMessageMutation = useMutation({
    mutationFn: (body: string) => chatService.send(eventId as string, body),
    onError: (error) => {
      const appError = normalizeError(error);
      if (appError.code === CHAT_ERROR_CODES.MUTED) {
        setMe((prev) => (prev ? { ...prev, isMuted: true, canWrite: false } : prev));
        return;
      }
      if (appError.code === CHAT_ERROR_CODES.RATE_LIMITED) {
        toast.error(t('rateLimited'));
        return;
      }
      toast.error(appError.message);
    },
  });

  const sendMessage = useCallback(
    (body: string) => {
      const trimmed = body.trim();
      if (!trimmed || eventId === null) return;
      sendMessageMutation.mutate(trimmed);
    },
    [sendMessageMutation, eventId],
  );

  const react = useCallback(
    (emoji: ReactionEmoji) => {
      if (eventId === null) return;
      setReactionCounts((prev) => ({ ...prev, [emoji]: prev[emoji] + 1 }));
      chatService.react(eventId, emoji).catch((error: unknown) => {
        // Fire-and-forget: a dropped reaction isn't worth surfacing to the
        // viewer, the next `reactions` snapshot from the stream corrects it.
        console.error('[chat] react failed', error);
      });
    },
    [eventId],
  );

  const deleteMessageMutation = useMutation({
    mutationFn: (messageId: string) => chatService.deleteMessage(eventId as string, messageId),
    onError: (error: unknown) => toast.error(normalizeError(error).message),
  });
  const deleteMessage = useCallback(
    (messageId: string) => {
      if (eventId === null) return;
      deleteMessageMutation.mutate(messageId);
    },
    [deleteMessageMutation, eventId],
  );

  const muteUserMutation = useMutation({
    mutationFn: (userId: string) => chatService.mute(eventId as string, userId),
    onError: (error: unknown) => toast.error(normalizeError(error).message),
  });
  const muteUser = useCallback(
    (userId: string) => {
      if (eventId === null) return;
      muteUserMutation.mutate(userId);
    },
    [muteUserMutation, eventId],
  );

  const unmuteUserMutation = useMutation({
    mutationFn: (userId: string) => chatService.unmute(eventId as string, userId),
    onError: (error: unknown) => toast.error(normalizeError(error).message),
  });
  const unmuteUser = useCallback(
    (userId: string) => {
      if (eventId === null) return;
      unmuteUserMutation.mutate(userId);
    },
    [unmuteUserMutation, eventId],
  );

  const totalReactions = useMemo(
    () => Object.values(reactionCounts).reduce((sum, count) => sum + count, 0),
    [reactionCounts],
  );

  return {
    messages,
    sendMessage,
    reactionCounts,
    totalReactions,
    react,
    me,
    status,
    deleteMessage,
    muteUser,
    unmuteUser,
  };
}
