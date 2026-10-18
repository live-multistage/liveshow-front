import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { LockedStreamOffer } from '../types/live.types';

const state = vi.hoisted(() => ({
  push: vi.fn(),
  addToCart: vi.fn(),
  claim: vi.fn(),
  cartItems: [] as Array<{ ticketProductId: string }>,
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: state.push }) }));
vi.mock('@/features/cart', () => ({
  useAddToCartMutation: () => ({ mutate: state.addToCart, isPending: false }),
  useCartQuery: () => ({ data: { items: state.cartItems } }),
}));
vi.mock('../mutations/free-ticket.mutations', () => ({
  useClaimFreeTicketMutation: () => ({ mutate: state.claim, isPending: false }),
}));

import { useStreamUnlock } from './use-stream-unlock';

const locked = (priceCents = 4990): LockedStreamOffer => ({
  id: 's-full', title: 'Evento completo', position: 1, live: true,
  offer: { ticketProductId: 'tp-full', name: 'Evento completo', priceCents, currency: 'BRL' },
});
type Opts = { streams: Array<{ id: string }> };

beforeEach(() => {
  sessionStorage.clear();
  state.push.mockReset();
  state.addToCart.mockReset();
  state.claim.mockReset();
  state.cartItems = [];
});

describe('useStreamUnlock', () => {
  it('adds the offer to the cart and opens checkout', () => {
    state.addToCart.mockImplementation((_id: string, opts: { onSuccess: () => void }) => opts.onSuccess());
    const { result } = renderHook(() => useStreamUnlock({ eventId: 'evt-1', streams: [{ id: 's-cov' }], setActiveStreamId: vi.fn() }));

    act(() => result.current.unlock(locked()));

    expect(state.addToCart).toHaveBeenCalledWith('tp-full', expect.any(Object));
    expect(state.push).toHaveBeenCalledWith('/checkout');
  });

  it('goes straight to checkout when the offer is already in the cart', () => {
    state.cartItems = [{ ticketProductId: 'tp-full' }];
    const { result } = renderHook(() => useStreamUnlock({ eventId: 'evt-1', streams: [{ id: 's-cov' }], setActiveStreamId: vi.fn() }));

    act(() => result.current.unlock(locked()));

    expect(state.addToCart).not.toHaveBeenCalled();
    expect(state.push).toHaveBeenCalledWith('/checkout');
  });

  it('claims a free offer instead of using the cart', () => {
    const { result } = renderHook(() => useStreamUnlock({ eventId: 'evt-1', streams: [{ id: 's-cov' }], setActiveStreamId: vi.fn() }));

    act(() => result.current.unlock(locked(0)));

    expect(state.claim).toHaveBeenCalledWith('tp-full', expect.any(Object));
    expect(state.addToCart).not.toHaveBeenCalled();
    expect(state.push).not.toHaveBeenCalled();
  });

  it('switches to the bought transmission once a payload grants it, even after the trip to checkout', () => {
    const setActive = vi.fn();
    const before = renderHook(() => useStreamUnlock({ eventId: 'evt-1', streams: [{ id: 's-cov' }], setActiveStreamId: setActive }));
    act(() => before.result.current.unlock(locked()));
    before.unmount();

    const { rerender } = renderHook(
      ({ streams }: Opts) => useStreamUnlock({ eventId: 'evt-1', streams, setActiveStreamId: setActive }),
      { initialProps: { streams: [{ id: 's-cov' }] } },
    );
    expect(setActive).not.toHaveBeenCalled();

    rerender({ streams: [{ id: 's-cov' }, { id: 's-full' }] });

    expect(setActive).toHaveBeenCalledWith('s-full');
    expect(sessionStorage.length).toBe(0);
  });

  it('a granted-list change with nothing pending never moves the viewer', () => {
    const setActive = vi.fn();
    const { rerender } = renderHook(
      ({ streams }: Opts) => useStreamUnlock({ eventId: 'evt-1', streams, setActiveStreamId: setActive }),
      { initialProps: { streams: [{ id: 's-cov' }] } },
    );

    rerender({ streams: [{ id: 's-cov' }, { id: 's-vip' }] });

    expect(setActive).not.toHaveBeenCalled();
  });

  it('a failed cart add drops the pending switch', () => {
    state.addToCart.mockImplementation((_id: string, opts: { onError: () => void }) => opts.onError());
    const { result } = renderHook(() => useStreamUnlock({ eventId: 'evt-1', streams: [{ id: 's-cov' }], setActiveStreamId: vi.fn() }));

    act(() => result.current.unlock(locked()));

    expect(sessionStorage.length).toBe(0);
    expect(state.push).not.toHaveBeenCalled();
  });

  it('an already-owned claim keeps the pending switch so the refetch moves the viewer', () => {
    state.claim.mockImplementation((_id: string, opts: { onError: (e: { code: string }) => void }) => opts.onError({ code: 'ALREADY_OWNED' }));
    const { result } = renderHook(() => useStreamUnlock({ eventId: 'evt-1', streams: [{ id: 's-cov' }], setActiveStreamId: vi.fn() }));

    act(() => result.current.unlock(locked(0)));

    expect(JSON.parse(sessionStorage.getItem('showon:unlock-stream:evt-1')!).id).toBe('s-full');
  });

  it('a pending switch older than 30 minutes is dropped and never moves the viewer', () => {
    sessionStorage.setItem('showon:unlock-stream:evt-1', JSON.stringify({ id: 's-full', at: Date.now() - 31 * 60_000 }));
    const setActive = vi.fn();
    const { rerender } = renderHook(
      ({ streams }: Opts) => useStreamUnlock({ eventId: 'evt-1', streams, setActiveStreamId: setActive }),
      { initialProps: { streams: [{ id: 's-cov' }] } },
    );

    rerender({ streams: [{ id: 's-cov' }, { id: 's-full' }] });

    expect(setActive).not.toHaveBeenCalled();
    expect(sessionStorage.length).toBe(0);
  });
});
