vi.mock('../queries/get-my-orders', () => ({ useMyOrdersQuery: vi.fn() }));
vi.mock('@/features/account', () => ({ useAuth: vi.fn() }));

import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import type { OrderView } from '@live-show/api-contracts';
import { useTickets } from './use-tickets';
import { useMyOrdersQuery } from '../queries/get-my-orders';
import { useAuth } from '@/features/account';

const mockedOrders = vi.mocked(useMyOrdersQuery);
const mockedAuth = vi.mocked(useAuth);

function event(id: string, title: string) {
  return {
    id,
    slug: null,
    title,
    status: 'FINISHED',
    startsAt: '2026-01-01T00:00:00.000Z',
    endsAt: '2026-01-01T02:00:00.000Z',
    thumbnailUrl: null,
    bannerUrl: null,
    venue: null,
    city: null,
  };
}

const orders: OrderView[] = [
  {
    id: 'order-1',
    code: '#LS-000001',
    status: 'PAID',
    currency: 'BRL',
    subtotal: 10000,
    discountAmount: 0,
    feeAmount: 0,
    totalAmount: 10000,
    couponCode: null,
    paymentId: 'pay-1',
    createdAt: '2026-08-01T00:00:00.000Z',
    expiresAt: null,
    lines: [
      {
        id: 'line-1',
        eventId: 'evt-1',
        ticketProductId: 'tp-1',
        productName: 'Pista',
        unitPrice: 10000,
        discountAmount: 0,
        lineTotal: 10000,
        capabilities: ['LIVE_VIEW'],
        camerasLimit: null,
        event: event('evt-1', 'Show Um'),
      },
    ],
  },
  {
    id: 'order-2',
    code: '#LS-000002',
    status: 'PAID',
    currency: 'BRL',
    subtotal: 8000,
    discountAmount: 0,
    feeAmount: 0,
    totalAmount: 8000,
    couponCode: null,
    paymentId: 'pay-2',
    createdAt: '2026-08-02T00:00:00.000Z',
    expiresAt: null,
    lines: [
      {
        id: 'line-2',
        eventId: 'evt-2',
        ticketProductId: 'tp-2',
        productName: 'VIP',
        unitPrice: 5000,
        discountAmount: 0,
        lineTotal: 5000,
        capabilities: ['REPLAY_VIEW'],
        camerasLimit: null,
        event: event('evt-2', 'Show Dois'),
      },
      {
        id: 'line-3',
        eventId: 'evt-3',
        ticketProductId: 'tp-3',
        productName: 'Camarote',
        unitPrice: 3000,
        discountAmount: 0,
        lineTotal: 3000,
        capabilities: [],
        camerasLimit: null,
        // A vanished/self-healed line has no event — must be dropped, not
        // rendered as a broken ticket card.
        event: null,
      },
    ],
  },
];

describe('useTickets', () => {
  it('flattens orders x lines into tickets, dropping lines without an event', () => {
    mockedAuth.mockReturnValue({ isLoggedIn: true, isLoading: false } as ReturnType<typeof useAuth>);
    mockedOrders.mockReturnValue({
      data: orders,
      isLoading: false,
    } as ReturnType<typeof useMyOrdersQuery>);

    const { result } = renderHook(() => useTickets());

    expect(result.current.tickets).toHaveLength(2);
    expect(result.current.tickets.map((t) => t.orderLineId)).toEqual(['line-1', 'line-2']);
    expect(result.current.tickets[1]).toMatchObject({
      orderId: 'order-2',
      orderLineId: 'line-2',
      ticketProductName: 'VIP',
      totalAmount: 5000,
      purchasedAt: '2026-08-02T00:00:00.000Z',
    });
  });
});
