vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: vi.fn() }) }));

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CartCheckoutPageContent } from './CartCheckoutPageContent';
import { checkoutService } from '../services/checkout.service';
import { usePaymentMethodsQuery } from '../mutations/checkout.mutations';
import { useAuth } from '@/features/account';
import { useCartQuery } from '@/features/cart';
import type { CartCheckoutSession } from '../types/checkout.types';
import type { PaymentMethod } from '../types/checkout.types';
import type { CartView } from '@/features/cart';

vi.mock('../services/checkout.service', () => ({
  checkoutService: {
    createCartSession: vi.fn(),
    previewCartCoupon: vi.fn(),
  },
}));
vi.mock('../mutations/checkout.mutations', () => ({
  usePaymentMethodsQuery: vi.fn(),
}));
vi.mock('@/features/account', () => ({ useAuth: vi.fn() }));
vi.mock('@/features/cart', () => ({
  useCartQuery: vi.fn(),
  CAPABILITY_LABELS: {},
}));
vi.mock('@/features/advertisements', () => ({ AdBanner: () => null }));

const mockedService = vi.mocked(checkoutService);
const mockedPaymentMethods = vi.mocked(usePaymentMethodsQuery);
const mockedAuth = vi.mocked(useAuth);
const mockedCart = vi.mocked(useCartQuery);

const method: PaymentMethod = {
  id: 'pm-1',
  displayName: 'Cartão',
  type: 'CREDIT_CARD',
  provider: 'STRIPE',
};

const cart: CartView = {
  items: [
    {
      eventId: 'evt-1',
      eventTitle: 'Show BRL',
      eventImage: null,
      ticketProductId: 'tp-1',
      ticketName: 'Pista',
      price: 100,
      capabilities: [],
      camerasLimit: null,
      organizationId: 'org-1',
      organizationName: 'Org',
    },
  ],
  totals: { subtotal: 100, lines: [], total: 100 },
};

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <CartCheckoutPageContent />
    </QueryClientProvider>,
  );
}

describe('CartCheckoutPageContent - sequential per-currency redirect', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    mockedAuth.mockReturnValue({ isLoggedIn: true, isLoading: false } as ReturnType<typeof useAuth>);
    mockedCart.mockReturnValue({ data: cart, isLoading: false } as ReturnType<typeof useCartQuery>);
    mockedPaymentMethods.mockReturnValue({
      data: [method],
      isLoading: false,
    } as ReturnType<typeof usePaymentMethodsQuery>);
    // jsdom doesn't implement navigation; stub it so we can assert the redirect target.
    Object.defineProperty(window, 'location', {
      value: { href: '' },
      writable: true,
    });
  });

  it('redirects to the first session and stashes the rest as pending', async () => {
    const sessions: CartCheckoutSession[] = [
      { url: 'https://stripe.test/session-brl', currency: 'BRL', amount: 100, orderIds: ['order-1'] },
      { url: 'https://stripe.test/session-usd', currency: 'USD', amount: 20, orderIds: ['order-2'] },
    ];
    mockedService.createCartSession.mockResolvedValue({ sessions });

    renderPage();

    await userEvent.click(screen.getByRole('radio', { name: /Cartão/i }));
    await userEvent.click(screen.getByRole('button', { name: /Pagar/i }));

    await vi.waitFor(() => expect(window.location.href).toBe('https://stripe.test/session-brl'));

    const pending = JSON.parse(sessionStorage.getItem('checkout:pendingSessions') ?? '[]');
    expect(pending).toEqual([sessions[1]]);
  });

  it('sets an empty pending queue when only one session is returned', async () => {
    const sessions: CartCheckoutSession[] = [
      { url: 'https://stripe.test/session-brl', currency: 'BRL', amount: 100, orderIds: ['order-1'] },
    ];
    mockedService.createCartSession.mockResolvedValue({ sessions });

    renderPage();

    await userEvent.click(screen.getByRole('radio', { name: /Cartão/i }));
    await userEvent.click(screen.getByRole('button', { name: /Pagar/i }));

    await vi.waitFor(() => expect(window.location.href).toBe('https://stripe.test/session-brl'));

    const pending = JSON.parse(sessionStorage.getItem('checkout:pendingSessions') ?? 'null');
    expect(pending).toEqual([]);
  });
});

describe('CartCheckoutPageContent - mixed-currency cart', () => {
  const mixedCart: CartView = {
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
      {
        eventId: 'evt-2',
        eventTitle: 'Show USD',
        eventImage: null,
        ticketProductId: 'tp-2',
        ticketName: 'VIP',
        price: 20,
        currency: 'USD',
        capabilities: [],
        camerasLimit: null,
        organizationId: 'org-2',
        organizationName: 'Org 2',
      },
    ],
    // A mixed-currency total is nonsensical (100 BRL + 20 USD summed as if the
    // same currency) — the component must not render this raw total directly.
    totals: { subtotal: 120, lines: [], total: 120 },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    mockedAuth.mockReturnValue({ isLoggedIn: true, isLoading: false } as ReturnType<typeof useAuth>);
    mockedCart.mockReturnValue({ data: mixedCart, isLoading: false } as ReturnType<typeof useCartQuery>);
    mockedPaymentMethods.mockReturnValue({
      data: [method],
      isLoading: false,
    } as ReturnType<typeof usePaymentMethodsQuery>);
  });

  it('renders one subtotal per currency instead of a single combined total', () => {
    renderPage();

    expect(screen.getAllByText(/US\$/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/R\$/).length).toBeGreaterThan(0);
    // The nonsensical combined total (120, ignoring mixed currencies) must not appear.
    expect(screen.queryByText('120')).not.toBeInTheDocument();
  });

  it('uses a currency-neutral pay button label instead of one combined amount', () => {
    renderPage();

    const payBtn = screen.getByRole('button', { name: /payButtonNeutral/i });
    expect(payBtn).toBeInTheDocument();
  });
});
