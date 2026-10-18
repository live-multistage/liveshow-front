// src/features/chat/hooks/use-mention-autocomplete.ts
'use client';

import { useCallback, useId, useState, type KeyboardEvent } from 'react';
import type { ChatParticipant } from '@live-show/api-contracts';
import { activeMentionQuery, insertMention, type ActiveMention } from '../utils/mentions';
import { useChatParticipants } from './use-chat-participants';

interface Options {
  eventId: string;
  streamId: string | null;
  value: string;
  onValueChange: (value: string, caret: number) => void;
  // false when the viewer can't read/write the chat: never opens, never queries.
  enabled?: boolean;
}

// Combobox state for the chat composer (role="combobox" + role="listbox").
// The input owns the text; this owns which mention is being typed and which
// suggestion is active.
export function useMentionAutocomplete({ eventId, streamId, value, onValueChange, enabled = true }: Options) {
  const [tracked, setTracked] = useState<ActiveMention | null>(null);
  // Esc dismisses this exact mention; typing changes the query and re-opens.
  const [dismissed, setDismissed] = useState<ActiveMention | null>(null);
  const [caret, setCaret] = useState(0);
  const [activeIndex, setActiveIndex] = useState(0);
  const listboxId = useId();
  const isDismissed = tracked !== null && dismissed?.start === tracked.start && dismissed.query === tracked.query;
  const mention = enabled && !isDismissed ? tracked : null;
  const participants = useChatParticipants(eventId, streamId, mention?.query ?? null);

  const open = mention !== null;
  const options: ChatParticipant[] = open ? (participants.data ?? []) : [];
  const optionId = useCallback((index: number) => `${listboxId}-opt-${index}`, [listboxId]);

  const track = useCallback((nextValue: string, nextCaret: number) => {
    setCaret(nextCaret);
    setTracked(activeMentionQuery(nextValue, nextCaret));
    setActiveIndex(0);
  }, []);

  const close = useCallback(() => setDismissed(tracked), [tracked]);

  const select = useCallback(
    (option: ChatParticipant) => {
      if (!mention) return;
      const next = insertMention(value, mention, caret, option.username);
      setTracked(null);
      onValueChange(next.value, next.caret);
    },
    [mention, value, caret, onValueChange],
  );

  const onKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (!open) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        close();
        return;
      }
      if (options.length === 0) return;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex((i) => (i + 1) % options.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex((i) => (i - 1 + options.length) % options.length);
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        select(options[Math.min(activeIndex, options.length - 1)]);
      }
    },
    [open, options, activeIndex, select, close],
  );

  return {
    open,
    query: mention?.query ?? '',
    options,
    activeIndex,
    loading: open && participants.isFetching && options.length === 0,
    empty: open && !participants.isFetching && participants.isSuccess && options.length === 0,
    listboxId,
    optionId,
    activeOptionId: open && options.length > 0 ? optionId(activeIndex) : undefined,
    track,
    select,
    close,
    onKeyDown,
  };
}
