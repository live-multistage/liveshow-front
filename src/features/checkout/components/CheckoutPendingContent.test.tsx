const mockRouter = { replace: vi.fn(), push: vi.fn() };
vi.mock('next/navigation', () => ({ useRouter: () => mockRouter }));

const { track } = vi.hoisted(() => ({ track: vi.fn() }));
vi.mock('@/lib/analytics/tracking', () => ({ useAnalytics: () => ({ track }) }));

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { CheckoutPendingContent } from './CheckoutPendingContent';
import { useOrderQuery } from '../mutations/checkout.mutations';
import type { OrderStatus } from '../types/checkout.types';

vi.mock('../mutations/checkout.mutations', () => ({ useOrderQuery: vi.fn() }));

const mockedOrderQuery = vi.mocked(useOrderQuery);

function renderWithStatus(status: OrderStatus | undefined, method?: string) {
  mockedOrderQuery.mockReturnValue({
    data: status ? { id: 'order-1', status } : undefined,
  } as unknown as ReturnType<typeof useOrderQuery>);
  render(<CheckoutPendingContent orderId="order-1" method={method} />);
}

describe('CheckoutPendingContent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    track.mockClear();
  });

  it('polls the order and stays put while it is PENDING', () => {
    renderWithStatus('PENDING');
    expect(mockedOrderQuery).toHaveBeenCalledWith('order-1');
    expect(mockRouter.replace).not.toHaveBeenCalled();
  });

  it('PAID → success, carrying the order id', () => {
    renderWithStatus('PAID');
    expect(mockRouter.replace).toHaveBeenCalledWith('/checkout/success?orderId=order-1');
  });

  it.each(['CANCELLED', 'EXPIRED'] as const)('%s → back to checkout', (status) => {
    renderWithStatus(status);
    expect(mockRouter.replace).toHaveBeenCalledWith('/checkout');
  });

  it('fires checkout_pending_viewed once, with the method carried from checkout', () => {
    renderWithStatus('PENDING', 'PIX');
    expect(track).toHaveBeenCalledWith('checkout_pending_viewed', { orderId: 'order-1', method: 'PIX' });
    expect(track.mock.calls.filter(([name]) => name === 'checkout_pending_viewed')).toHaveLength(1);
  });
});
