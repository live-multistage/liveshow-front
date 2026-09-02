vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));

const mockRouter = { replace: vi.fn(), push: vi.fn() };
vi.mock('next/navigation', () => ({ useRouter: () => mockRouter }));

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CartCheckoutPageContent } from './CartCheckoutPageContent';
import { checkoutService } from '../services/checkout.service';
import { usePaymentMethodsQuery, usePlaceOrderMutation } from '../mutations/checkout.mutations';
import { useAuth } from '@/features/account';
import { useCartQuery } from '@/features/cart';
import type { PaymentMethod } from '../types/checkout.types';
import type { PlaceOrderResponse } from '@live-show/api-contracts';
import type { CartView } from '@/features/cart';
import { useMutation } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { placeOrderSchema } from '@live-show/api-contracts';

vi.mock('../services/checkout.service', () => ({
  checkoutService: {
    placeOrder: vi.fn(),
    previewCartCoupon: vi.fn(),
  },
}));
vi.mock('../mutations/checkout.mutations', () => ({
  usePaymentMethodsQuery: vi.fn(),
  usePlaceOrderMutation: vi.fn(),
}));
vi.mock('@/features/account', () => ({ useAuth: vi.fn() }));
vi.mock('@/features/cart', () => ({
  useCartQuery: vi.fn(),
  CAPABILITY_LABELS: {},
}));
vi.mock('@/features/advertisements', () => ({ AdBanner: () => null }));

const mockedService = vi.mocked(checkoutService);
const mockedPaymentMethods = vi.mocked(usePaymentMethodsQuery);
const mockedPlaceOrder = vi.mocked(usePlaceOrderMutation);
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
      currency: 'BRL',
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

// Wraps react-query's real useMutation so `.mutate` actually resolves/rejects
// against a stubbed mutationFn, letting the component's onSuccess/onError run.
function stubPlaceOrder(mutationFn: (payload: unknown) => Promise<PlaceOrderResponse>) {
  mockedPlaceOrder.mockImplementation(
    () => useMutation({ mutationFn }) as unknown as ReturnType<typeof usePlaceOrderMutation>,
  );
}

describe('CartCheckoutPageContent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    mockedAuth.mockReturnValue({ isLoggedIn: true, isLoading: false } as ReturnType<typeof useAuth>);
    mockedCart.mockReturnValue({ data: cart, isLoading: false } as ReturnType<typeof useCartQuery>);
    mockedPaymentMethods.mockReturnValue({
      data: [method],
      isLoading: false,
    } as ReturnType<typeof usePaymentMethodsQuery>);
    Object.defineProperty(window, 'location', { value: { href: '' }, writable: true });
  });

  it('redirects to the Stripe URL when the payment action is REDIRECT', async () => {
    stubPlaceOrder(async () => ({
      order: { id: 'order-1' } as PlaceOrderResponse['order'],
      payment: { id: 'pay-1', action: { type: 'REDIRECT', url: 'https://stripe.test/session' } },
    }));

    renderPage();

    await userEvent.click(screen.getByRole('radio', { name: /Cartão/i }));
    await userEvent.click(screen.getByRole('button', { name: /Pagar/i }));

    await vi.waitFor(() => expect(window.location.href).toBe('https://stripe.test/session'));
  });

  it('routes to the success page with the order id when the payment action is COMPLETED', async () => {
    stubPlaceOrder(async () => ({
      order: { id: 'order-42' } as PlaceOrderResponse['order'],
      payment: { id: 'pay-1', action: { type: 'COMPLETED', externalReference: 'ref' } },
    }));

    renderPage();

    await userEvent.click(screen.getByRole('radio', { name: /Cartão/i }));
    await userEvent.click(screen.getByRole('button', { name: /Pagar/i }));

    await vi.waitFor(() => expect(mockRouter.push).toHaveBeenCalledWith('/checkout/success?orderId=order-42'));
  });

  it('shows the coupon-invalid message on a 422 error', async () => {
    stubPlaceOrder(async () => {
      throw new AxiosError('coupon invalid', undefined, undefined, undefined, {
        status: 422,
        data: { message: 'coupon invalid' },
      } as never);
    });

    renderPage();

    await userEvent.click(screen.getByRole('radio', { name: /Cartão/i }));
    await userEvent.click(screen.getByRole('button', { name: /Pagar/i }));

    expect(await screen.findByText('couponInvalid')).toBeInTheDocument();
  });

  it('sends the STRIPE provider unconditionally', async () => {
    let capturedPayload: unknown;
    stubPlaceOrder(async (payload) => {
      capturedPayload = payload;
      return {
        order: { id: 'order-1' } as PlaceOrderResponse['order'],
        payment: { id: 'pay-1', action: { type: 'COMPLETED', externalReference: 'ref' } },
      };
    });

    renderPage();

    await userEvent.click(screen.getByRole('radio', { name: /Cartão/i }));
    await userEvent.click(screen.getByRole('button', { name: /Pagar/i }));

    await vi.waitFor(() => {
      expect(capturedPayload).toEqual(expect.objectContaining({ provider: 'STRIPE' }));
    });
  });
});

describe('web order provider schema', () => {
  // The browser has no Play Billing and no way to complete a PLAY_BILLING
  // action. Widening the contract for the app must not make it POSSIBLE for
  // the web to ask for one.
  it('rejects everything outside the two-member choice', () => {
    expect(placeOrderSchema.safeParse({ provider: 'STRIPE' }).success).toBe(true);
    expect(placeOrderSchema.safeParse({ provider: 'PIX' }).success).toBe(false);
    expect(placeOrderSchema.safeParse({ provider: 'PAYPAL' }).success).toBe(false);
  });
});
