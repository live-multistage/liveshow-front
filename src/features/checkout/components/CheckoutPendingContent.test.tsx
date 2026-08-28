const mockRouter = { replace: vi.fn(), push: vi.fn() };
vi.mock('next/navigation', () => ({ useRouter: () => mockRouter }));

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { CheckoutPendingContent } from './CheckoutPendingContent';
import { useOrderQuery } from '../mutations/checkout.mutations';
import type { OrderStatus } from '../types/checkout.types';

vi.mock('../mutations/checkout.mutations', () => ({ useOrderQuery: vi.fn() }));

const mockedOrderQuery = vi.mocked(useOrderQuery);

function renderWithStatus(status: OrderStatus | undefined) {
  mockedOrderQuery.mockReturnValue({
    data: status ? { id: 'order-1', status } : undefined,
  } as unknown as ReturnType<typeof useOrderQuery>);
  render(<CheckoutPendingContent orderId="order-1" />);
}

describe('CheckoutPendingContent', () => {
  beforeEach(() => vi.clearAllMocks());

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
});
