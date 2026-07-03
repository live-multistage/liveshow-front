'use client';

import { useCallback, useMemo, useState } from 'react';
import { useAuth } from '@/features/account/hooks/use-auth';
import type { ChatMessage, ReactionEmoji } from '../types/chat.types';

export const REACTION_EMOJIS: ReactionEmoji[] = ['💜', '🔥', '🤘', '👏', '✨'];

const AVATAR_COLORS = ['#46d6d8', '#9b7bff', '#7fe0a0', '#ff7a4d', '#bba6ff', '#ffd166'];

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

function emptyReactionCounts(): Record<ReactionEmoji, number> {
  return { '💜': 0, '🔥': 0, '🤘': 0, '👏': 0, '✨': 0 };
}

// Local-only chat: no network calls, state lives here for the lifetime of the
// player. `eventId` is unused today but kept in the signature so a future
// real-transport version of this hook (sockets/query) is a drop-in
// replacement — no call site needs to change when that lands.
export function useChat(eventId: string) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [reactionCounts, setReactionCounts] = useState<Record<ReactionEmoji, number>>(emptyReactionCounts);

  const sendMessage = useCallback((body: string) => {
    const trimmed = body.trim();
    if (!trimmed) return;
    const authorName = user?.displayName ?? 'Você';
    const message: ChatMessage = {
      id: crypto.randomUUID(),
      authorName,
      authorInitials: initialsFromName(authorName),
      authorColor: AVATAR_COLORS[hashString(authorName) % AVATAR_COLORS.length],
      body: trimmed,
      sentAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, message]);
  }, [user?.displayName]);

  const react = useCallback((emoji: ReactionEmoji) => {
    setReactionCounts((prev) => ({ ...prev, [emoji]: prev[emoji] + 1 }));
  }, []);

  const totalReactions = useMemo(
    () => Object.values(reactionCounts).reduce((sum, count) => sum + count, 0),
    [reactionCounts],
  );

  return { messages, sendMessage, reactionCounts, totalReactions, react };
}
