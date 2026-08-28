vi.mock('../queries/get-order-history', () => ({ useOrderHistoryQuery: vi.fn() }));

import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import type { OrderView } from '@live-show/api-contracts';
import { PurchasesPageContent } from './PurchasesPageContent';
import { useOrderHistoryQuery } from '../queries/get-order-history';

const mockedOrders = vi.mocked(useOrderHistoryQuery);

const order: OrderView = {
  id: 'order-1',
  code: '#LS-000001',
  status: 'PAID',
  currency: 'BRL',
  subtotal: 15000,
  discountAmount: 0,
  feeAmount: 0,
  totalAmount: 15000,
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
      capabilities: [],
      camerasLimit: null,
      event: {
        id: 'evt-1',
        slug: 'show-1',
        title: 'Show Um',
        status: 'FINISHED',
        startsAt: '2026-01-01T00:00:00.000Z',
        endsAt: '2026-01-01T02:00:00.000Z',
        thumbnailUrl: null,
        bannerUrl: null,
        venue: null,
        city: null,
      },
    },
    {
      id: 'line-2',
      eventId: 'evt-2',
      ticketProductId: 'tp-2',
      productName: 'VIP',
      unitPrice: 5000,
      discountAmount: 0,
      lineTotal: 5000,
      capabilities: [],
      camerasLimit: null,
      event: {
        id: 'evt-2',
        slug: 'show-2',
        title: 'Show Dois',
        status: 'FINISHED',
        startsAt: '2026-01-02T00:00:00.000Z',
        endsAt: '2026-01-02T02:00:00.000Z',
        thumbnailUrl: null,
        bannerUrl: null,
        venue: null,
        city: null,
      },
    },
  ],
};

describe('PurchasesPageContent', () => {
  it('renders both product names for an order with 2 lines and the order total once', () => {
    mockedOrders.mockReturnValue({
      data: [order],
      isLoading: false,
      isError: false,
    } as ReturnType<typeof useOrderHistoryQuery>);

    render(<PurchasesPageContent />);

    expect(screen.getByText('Pista')).toBeInTheDocument();
    expect(screen.getByText('VIP')).toBeInTheDocument();

    const card = screen.getByTestId('order-order-1');
    expect(within(card).getAllByText('R$ 150,00')).toHaveLength(1);
  });
});
