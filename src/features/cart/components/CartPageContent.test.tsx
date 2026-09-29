vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
vi.mock('@/shared/hooks/use-navigate', () => ({ useNavigate: () => ({ push: vi.fn() }) }));
// useCartQuery (via cart.queries.ts) reads useAuth internally, even though the
// component itself no longer does.
vi.mock('@/features/account/hooks/use-auth', () => ({ useAuth: () => ({ isLoggedIn: false, isLoading: false }) }));
vi.mock('@/features/checkout/services/checkout.service', () => ({
  checkoutService: { previewCartCoupon: vi.fn() },
}));
vi.mock('@/features/cart/services/cart.service', () => ({
  cartService: { remove: vi.fn() },
}));
vi.mock('@live-show/analytics-sdk/react', () => ({
  TrackFeature: ({ children }: { children: React.ReactNode }) => children,
}));

// vi.mock is hoisted above module-level consts, so the factory can't close over
// a plain `const toast`/`track` (TDZ: "Cannot access '...' before initialization").
// vi.hoisted lifts the value with the mock.
const { toast, track } = vi.hoisted(() => ({ toast: { info: vi.fn(), success: vi.fn() }, track: vi.fn() }));
vi.mock('sonner', () => ({ toast }));
vi.mock('@/lib/analytics/tracking', () => ({ useAnalytics: () => ({ track }) }));

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CartPageContent } from './CartPageContent';
import { checkoutService } from '@/features/checkout/services/checkout.service';
import { cartService } from '@/features/cart/services/cart.service';
import type { CartView } from '@/features/cart/services/cart.service';

const cart: CartView = {
  items: [
    {
      eventId: 'evt-1',
      eventTitle: 'Show BRL',
      eventImage: null,
      ticketProductId: 'tp-1',
      ticketName: 'Pista',
      price: 100,
      currency: 'BRL',
      capabilities: [],
      camerasLimit: null,
      organizationId: 'org-1',
      organizationName: 'Org',
    },
  ],
  totals: { subtotal: 100, lines: [], total: 100 },
};

function renderPage(couponsEnabled?: boolean) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <CartPageContent initialCart={cart} couponsEnabled={couponsEnabled} />
    </QueryClientProvider>,
  );
}

describe('CartPageContent — coupon gate', () => {
  beforeEach(() => {
    toast.info.mockClear();
    track.mockClear();
    sessionStorage.clear();
  });

  it('renders the coupon input by default', () => {
    renderPage();
    expect(screen.getByLabelText('promoLabel')).toBeInTheDocument();
  });

  it('hides the coupon block when couponsEnabled is false', () => {
    renderPage(false);
    expect(screen.queryByLabelText('promoLabel')).not.toBeInTheDocument();
  });

  it('clears a stale coupon and toasts when couponsEnabled is off', () => {
    sessionStorage.setItem('cart:coupon', JSON.stringify({ code: 'STALE10' }));

    renderPage(false);

    expect(sessionStorage.getItem('cart:coupon')).toBeNull();
    expect(toast.info).toHaveBeenCalledWith('couponsDisabledCleared');
  });

  it('does not toast when there was nothing to clear', () => {
    renderPage(false);
    expect(toast.info).not.toHaveBeenCalled();
  });
});

describe('CartPageContent — tracking', () => {
  beforeEach(() => {
    toast.info.mockClear();
    track.mockClear();
    sessionStorage.clear();
    vi.mocked(checkoutService.previewCartCoupon).mockReset();
  });

  it('fires cart_viewed once with the SSR-seeded cart totals', () => {
    renderPage();
    expect(track).toHaveBeenCalledWith('cart_viewed', { itemCount: 1, totalCents: 10000 });
    expect(track.mock.calls.filter(([name]) => name === 'cart_viewed')).toHaveLength(1);
  });

  it('fires coupon_applied with the discount converted to cents on success', async () => {
    vi.mocked(checkoutService.previewCartCoupon).mockResolvedValue({
      couponId: 'c-1',
      discountType: 'FIXED_AMOUNT',
      discountAmount: 10.5,
      discountValue: 10.5,
      orgIds: ['org-1'],
      eventId: null,
      eligibleEventIds: ['evt-1'],
    });

    renderPage();
    await userEvent.type(screen.getByLabelText('promoLabel'), 'SAVE10');
    await userEvent.click(screen.getByText('APLICAR'));

    await screen.findByText(/SAVE10/);
    expect(track).toHaveBeenCalledWith('coupon_applied', { code: 'SAVE10', discountCents: 1050 });
  });

  it('fires coupon_rejected with the server error code on failure', async () => {
    vi.mocked(checkoutService.previewCartCoupon).mockRejectedValue({
      response: { data: { code: 'COUPON_EXPIRED', message: 'Cupom expirado' } },
    });

    renderPage();
    await userEvent.type(screen.getByLabelText('promoLabel'), 'OLD10');
    await userEvent.click(screen.getByText('APLICAR'));

    await screen.findByText('Cupom expirado');
    expect(track).toHaveBeenCalledWith('coupon_rejected', { code: 'OLD10', reason: 'COUPON_EXPIRED' });
  });

  it('fires cart_item_removed with the post-removal cart size', async () => {
    vi.mocked(cartService.remove).mockResolvedValue({ items: [], totals: { subtotal: 0, lines: [], total: 0 } });

    renderPage();
    await userEvent.click(screen.getByLabelText('Remover Show BRL'));

    await vi.waitFor(() =>
      expect(track.mock.calls).toContainEqual(['cart_item_removed', { eventId: 'evt-1', cartSize: 0 }]),
    );
  });
});
