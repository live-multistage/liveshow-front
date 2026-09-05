vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
vi.mock('@/shared/hooks/use-navigate', () => ({ useNavigate: () => ({ push: vi.fn() }) }));
vi.mock('@/features/account/hooks/use-auth', () => ({ useAuth: () => ({ user: null }) }));
vi.mock('@/features/checkout/services/checkout.service', () => ({
  checkoutService: { previewCartCoupon: vi.fn() },
}));

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CartPageContent } from './CartPageContent';
import type { CartView } from '../services/cart.service';

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
  it('renders the coupon input by default', () => {
    renderPage();
    expect(screen.getByLabelText('promoLabel')).toBeInTheDocument();
  });

  it('hides the coupon block when couponsEnabled is false', () => {
    renderPage(false);
    expect(screen.queryByLabelText('promoLabel')).not.toBeInTheDocument();
  });
});
