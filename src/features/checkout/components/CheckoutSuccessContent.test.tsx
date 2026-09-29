let search = new URLSearchParams();
vi.mock('next/navigation', () => ({ useSearchParams: () => search }));
vi.mock('@/features/advertisements', () => ({ AdBanner: () => null }));

const { track } = vi.hoisted(() => ({ track: vi.fn() }));
vi.mock('@/lib/analytics/tracking', () => ({ useAnalytics: () => ({ track }) }));

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { CheckoutSuccessContent } from './CheckoutSuccessContent';

describe('CheckoutSuccessContent — tracking', () => {
  beforeEach(() => {
    track.mockClear();
    search = new URLSearchParams();
  });

  it('fires checkout_success_viewed once with the order id', () => {
    search = new URLSearchParams({ orderId: 'order-7' });

    render(<CheckoutSuccessContent />);

    expect(track).toHaveBeenCalledWith('checkout_success_viewed', { orderId: 'order-7' });
    expect(track.mock.calls.filter(([name]) => name === 'checkout_success_viewed')).toHaveLength(1);
  });

  it('does not fire without an order id', () => {
    render(<CheckoutSuccessContent />);
    expect(track).not.toHaveBeenCalled();
  });
});
