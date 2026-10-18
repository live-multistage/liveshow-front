// src/features/chat/hooks/use-mention-autocomplete.ts
'use client';

import { useCallback, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react';
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

const fold = (text: string) => text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

// Results may still belong to a previous (debounced) query: keep only what matches the current one.
function matchesQuery(person: ChatParticipant, query: string): boolean {
  if (!query) return true;
  const q = fold(query);
  return fold(person.username).startsWith(q) || fold(person.displayName).includes(q);
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
  const trackedRef = useRef<ActiveMention | null>(null);
  const listboxId = useId();
  const isDismissed = tracked !== null && dismissed?.start === tracked.start && dismissed.query === tracked.query;
  const mention = enabled && !isDismissed ? tracked : null;
  const participants = useChatParticipants(eventId, streamId, mention?.query ?? null);

  const open = mention !== null;
  const data = participants.data;
  const query = mention?.query ?? '';
  const options = useMemo<ChatParticipant[]>(
    () => (open ? (data ?? []).filter((p) => matchesQuery(p, query)) : []),
    [open, data, query],
  );
  const current = Math.min(activeIndex, Math.max(options.length - 1, 0));
  const optionId = useCallback((index: number) => `${listboxId}-opt-${index}`, [listboxId]);

  const track = useCallback((nextValue: string, nextCaret: number) => {
    setCaret(nextCaret);
    const next = activeMentionQuery(nextValue, nextCaret);
    const prev = trackedRef.current;
    trackedRef.current = next;
    setTracked(next);
    if (next?.start !== prev?.start || next?.query !== prev?.query) setActiveIndex(0);
    // Deleting the mention, or typing a different one, lifts an Esc dismissal.
    setDismissed((d) => (d && next && d.start === next.start && d.query === next.query ? d : null));
  }, []);

  const close = useCallback(() => setDismissed(tracked), [tracked]);

  const select = useCallback(
    (option: ChatParticipant) => {
      if (!mention) return;
      const next = insertMention(value, mention, caret, option.username);
      trackedRef.current = null;
      setTracked(null);
      onValueChange(next.value, next.caret);
    },
    [mention, value, caret, onValueChange],
  );

  const onKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.nativeEvent?.isComposing || e.keyCode === 229) return;
      if (!open) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        close();
        return;
      }
      if (options.length === 0) return;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex((current + 1) % options.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex((current - 1 + options.length) % options.length);
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        select(options[current]);
      }
    },
    [open, options, current, select, close],
  );

  return {
    open,
    query,
    options,
    activeIndex: current,
    loading: open && participants.isFetching && options.length === 0,
    empty: open && !participants.isFetching && participants.isSuccess && options.length === 0,
    listboxId,
    optionId,
    activeOptionId: open && options.length > 0 ? optionId(current) : undefined,
    track,
    select,
    close,
    onKeyDown,
  };
}
