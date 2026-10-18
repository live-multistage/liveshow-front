'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAddToCartMutation, useCartQuery } from '@/features/cart';
import { useClaimFreeTicketMutation } from '../mutations/free-ticket.mutations';
import type { LockedStreamOffer } from '../types/live.types';

const pendingKey = (eventId: string) => `showon:unlock-stream:${eventId}`;

// sessionStorage can throw (private mode, blocked storage): the purchase still
// works, the player just won't jump to the new transmission on its own.
// An abandoned checkout must not yank the player to a stream bought much later.
const PENDING_TTL_MS = 30 * 60_000;

function readPending(eventId: string): string | null {
  try {
    const raw = sessionStorage.getItem(pendingKey(eventId));
    if (!raw) return null;
    const { id, at } = JSON.parse(raw) as { id?: string; at?: number };
    if (id && typeof at === 'number' && Date.now() - at < PENDING_TTL_MS) return id;
    sessionStorage.removeItem(pendingKey(eventId));
    return null;
  } catch {
    return null;
  }
}

function writePending(eventId: string, streamId: string | null): void {
  try {
    if (streamId) sessionStorage.setItem(pendingKey(eventId), JSON.stringify({ id: streamId, at: Date.now() }));
    else sessionStorage.removeItem(pendingKey(eventId));
  } catch {
    // see readPending
  }
}

// "Liberar evento completo" (amendment 2026-10-18): buys the offer's product
// and, once a playback payload grants the bought transmission, switches the
// player to it. The intent survives the same-tab trip to checkout; no other
// change of the granted list moves the viewer (Review Focus 2).
export function useStreamUnlock({
  eventId,
  streams,
  setActiveStreamId,
  enabled = true,
}: {
  eventId: string;
  streams: ReadonlyArray<{ id: string }>;
  setActiveStreamId: (streamId: string) => void;
  // False (channel, nothing for sale) keeps the cart query from mounting.
  enabled?: boolean;
}) {
  const router = useRouter();
  const addToCart = useAddToCartMutation();
  const claimFree = useClaimFreeTicketMutation(eventId);
  const { data: cart } = useCartQuery(undefined, enabled);
  const [pendingId, setPendingId] = useState<string | null>(() => readPending(eventId));

  const grantedKey = streams.map((s) => s.id).join(',');
  useEffect(() => {
    if (!pendingId || !streams.some((s) => s.id === pendingId)) return;
    setActiveStreamId(pendingId);
    writePending(eventId, null);
    setPendingId(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed on the granted ids, not the array identity
  }, [grantedKey, pendingId]);

  const remember = (streamId: string | null) => {
    writePending(eventId, streamId);
    setPendingId(streamId);
  };

  const unlock = (locked: LockedStreamOffer) => {
    const { ticketProductId, priceCents } = locked.offer;
    remember(locked.id);
    const onError = () => remember(null);
    if (priceCents === 0) {
      // ALREADY_OWNED: the claim hook refetches playback; keep the pending
      // switch so the player moves to the stream the viewer already holds.
      claimFree.mutate(ticketProductId, { onError: (err) => err.code !== 'ALREADY_OWNED' && onError() });
      return;
    }
    if (cart?.items.some((i) => i.ticketProductId === ticketProductId)) {
      router.push('/checkout');
      return;
    }
    addToCart.mutate(ticketProductId, { onSuccess: () => router.push('/checkout'), onError });
  };

  return { unlock, pending: addToCart.isPending || claimFree.isPending };
}
