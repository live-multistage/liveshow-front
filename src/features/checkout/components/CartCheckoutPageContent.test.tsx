import { createTranslator } from 'use-intl';
import { messages } from '@live-show/i18n-messages';

// Real ICU translator over the pt catalog (not a key-echo stub): the Asaas
// error copy assertions below can only be checked meaningfully against the
// actual message templates.
vi.mock('next-intl', () => ({
  useTranslations: (namespace?: string) =>
    createTranslator({ locale: 'pt', messages: messages.pt, namespace: namespace as never }),
}));

const mockRouter = { replace: vi.fn(), push: vi.fn() };
vi.mock('next/navigation', () => ({ useRouter: () => mockRouter }));

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CartCheckoutPageContent } from './CartCheckoutPageContent';
import { checkoutService } from '../services/checkout.service';
import { usePaymentMethodsQuery, usePlaceOrderMutation, usePaymentOptionsQuery } from '../mutations/checkout.mutations';
import { useAuth, useUpdateProfileMutation } from '@/features/account';
import { useCartQuery } from '@/features/cart';
import type { PaymentMethod, PaymentOptionsResponse, PlaceOrderRequest } from '../types/checkout.types';
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
  usePaymentOptionsQuery: vi.fn(),
  pixActionKey: (orderId: string | null) => ['orders', orderId, 'payment-action'] as const,
}));
vi.mock('@/features/account', () => ({ useAuth: vi.fn(), useUpdateProfileMutation: vi.fn() }));
vi.mock('@/features/cart', () => ({
  useCartQuery: vi.fn(),
  CAPABILITY_LABELS: {},
}));
vi.mock('@/features/advertisements', () => ({ AdBanner: () => null }));

const mockedService = vi.mocked(checkoutService);
const mockedPaymentMethods = vi.mocked(usePaymentMethodsQuery);
const mockedPlaceOrder = vi.mocked(usePlaceOrderMutation);
const mockedPaymentOptions = vi.mocked(usePaymentOptionsQuery);
const mockedAuth = vi.mocked(useAuth);
const mockedCart = vi.mocked(useCartQuery);
const mockedUpdateProfile = vi.mocked(useUpdateProfileMutation);

// The server labels its own Stripe card entry "Cartão internacional" — the
// fixture mirrors that instead of a generic "Cartão" so tests can't hide a
// regression where the UI re-labels it locally.
const method: PaymentMethod = {
  id: 'pm-1',
  displayName: 'Cartão internacional',
  type: 'CREDIT_CARD',
  provider: 'STRIPE',
};

const asaasPixMethod: PaymentMethod = {
  id: 'pm-asaas-pix',
  displayName: 'Pix',
  type: 'PIX',
  provider: 'ASAAS',
};

const asaasCardMethod: PaymentMethod = {
  id: 'pm-asaas-card',
  displayName: 'Cartão',
  type: 'CREDIT_CARD',
  provider: 'ASAAS',
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

let queryClient: QueryClient;
const routerPush = mockRouter.push;

function renderCheckout(props: { fiscalEnabled?: boolean } = {}) {
  queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <CartCheckoutPageContent {...props} />
    </QueryClientProvider>,
  );
}

function mockOptions(overrides: Partial<PaymentOptionsResponse> = {}) {
  mockedPaymentOptions.mockReturnValue({
    data: { stripe: true, play: null, asaas: { pix: false, card: false }, ...overrides },
    isLoading: false,
  } as ReturnType<typeof usePaymentOptionsQuery>);
}

function mockUser(user: Partial<{ taxDocument: string }>) {
  mockedAuth.mockReturnValue({
    isLoggedIn: true,
    isLoading: false,
    user,
  } as unknown as ReturnType<typeof useAuth>);
}

// Wraps react-query's real useMutation so `.mutate` actually resolves/rejects
// against a stubbed mutationFn, letting the component's onSuccess/onError run.
function stubPlaceOrder(
  mutationFn: (variables: { payload: PlaceOrderRequest; idempotencyKey: string }) => Promise<PlaceOrderResponse>,
) {
  mockedPlaceOrder.mockImplementation(
    () => useMutation({ mutationFn }) as unknown as ReturnType<typeof usePlaceOrderMutation>,
  );
}

function placeOrderResolves(response: PlaceOrderResponse) {
  mockedService.placeOrder.mockResolvedValue(response);
  stubPlaceOrder(({ payload, idempotencyKey }) => checkoutService.placeOrder(payload, idempotencyKey));
}

function placeOrderRejects(err: { status: number; code: string }) {
  mockedService.placeOrder.mockRejectedValue(
    new AxiosError('failed', undefined, undefined, undefined, {
      status: err.status,
      data: { code: err.code, message: 'failed' },
    } as never),
  );
  stubPlaceOrder(({ payload, idempotencyKey }) => checkoutService.placeOrder(payload, idempotencyKey));
}

describe('CartCheckoutPageContent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    mockedAuth.mockReturnValue({ isLoggedIn: true, isLoading: false, user: null } as ReturnType<typeof useAuth>);
    mockedCart.mockReturnValue({ data: cart, isLoading: false } as ReturnType<typeof useCartQuery>);
    mockedPaymentMethods.mockReturnValue({
      data: [method, asaasPixMethod, asaasCardMethod],
      isLoading: false,
    } as ReturnType<typeof usePaymentMethodsQuery>);
    mockOptions();
    mockedUpdateProfile.mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue(undefined),
    } as unknown as ReturnType<typeof useUpdateProfileMutation>);
    Object.defineProperty(window, 'location', { value: { href: '' }, writable: true });
  });

  it('redirects to the Stripe URL when the payment action is REDIRECT', async () => {
    stubPlaceOrder(async () => ({
      order: { id: 'order-1' } as PlaceOrderResponse['order'],
      payment: { id: 'pay-1', action: { type: 'REDIRECT', url: 'https://stripe.test/session' } },
    }));

    renderCheckout();

    await userEvent.click(screen.getByRole('radio', { name: /Cartão internacional/i }));
    await userEvent.click(screen.getByRole('button', { name: /Pagar/i }));

    await vi.waitFor(() => expect(window.location.href).toBe('https://stripe.test/session'));
  });

  it('routes to the success page with the order id when the payment action is COMPLETED', async () => {
    stubPlaceOrder(async () => ({
      order: { id: 'order-42' } as PlaceOrderResponse['order'],
      payment: { id: 'pay-1', action: { type: 'COMPLETED', externalReference: 'ref' } },
    }));

    renderCheckout();

    await userEvent.click(screen.getByRole('radio', { name: /Cartão internacional/i }));
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

    renderCheckout();

    await userEvent.click(screen.getByRole('radio', { name: /Cartão internacional/i }));
    await userEvent.click(screen.getByRole('button', { name: /Pagar/i }));

    expect(await screen.findByText('Cupom inválido ou expirado')).toBeInTheDocument();
  });

  it('sends the STRIPE provider unconditionally, under an Idempotency-Key derived from the cart', async () => {
    let capturedVariables: unknown;
    stubPlaceOrder(async (variables) => {
      capturedVariables = variables;
      return {
        order: { id: 'order-1' } as PlaceOrderResponse['order'],
        payment: { id: 'pay-1', action: { type: 'COMPLETED', externalReference: 'ref' } },
      };
    });

    renderCheckout();

    await userEvent.click(screen.getByRole('radio', { name: /Cartão internacional/i }));
    await userEvent.click(screen.getByRole('button', { name: /Pagar/i }));

    await vi.waitFor(() => {
      expect(capturedVariables).toEqual(
        expect.objectContaining({
          payload: expect.objectContaining({ provider: 'STRIPE' }),
          // A key must actually reach the API: without it POST /orders is back
          // to minting a second checkout per click.
          idempotencyKey: expect.stringMatching(/^[0-9a-f]{64}$/),
        }),
      );
    });
  });

  it('renders the buyer document field and disables pay on an invalid document when fiscalEnabled', async () => {
    stubPlaceOrder(async () => ({
      order: { id: 'order-1' } as PlaceOrderResponse['order'],
      payment: { id: 'pay-1', action: { type: 'COMPLETED', externalReference: 'ref' } },
    }));

    renderCheckout({ fiscalEnabled: true });

    await userEvent.click(screen.getByRole('radio', { name: /Cartão internacional/i }));
    expect(screen.getByLabelText(/cpf/i)).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText(/cpf/i), '111');
    expect(screen.getByRole('button', { name: /Pagar/i })).toBeDisabled();
  });

  it('shows the save error and never places the order when the document PATCH rejects', async () => {
    mockedAuth.mockReturnValue({
      isLoggedIn: true,
      isLoading: false,
      user: { taxDocument: '' },
    } as unknown as ReturnType<typeof useAuth>);
    const mutateAsync = vi.fn().mockRejectedValue(new Error('boom'));
    mockedUpdateProfile.mockReturnValue({
      mutateAsync,
      isPending: false,
    } as unknown as ReturnType<typeof useUpdateProfileMutation>);
    const placeOrderMutate = vi.fn();
    mockedPlaceOrder.mockReturnValue({
      mutate: placeOrderMutate,
      isPending: false,
    } as unknown as ReturnType<typeof usePlaceOrderMutation>);

    renderCheckout({ fiscalEnabled: true });

    await userEvent.click(screen.getByRole('radio', { name: /Cartão internacional/i }));
    await userEvent.type(screen.getByLabelText(/cpf/i), '52998224725');
    await userEvent.click(screen.getByRole('button', { name: /Pagar/i }));

    expect(await screen.findByText('Não foi possível salvar o documento.')).toBeInTheDocument();
    expect(mutateAsync).toHaveBeenCalledWith({ taxDocument: '52998224725' });
    expect(placeOrderMutate).not.toHaveBeenCalled();
  });

  it('disables the pay button while the document PATCH is pending', () => {
    mockedPlaceOrder.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as unknown as ReturnType<typeof usePlaceOrderMutation>);
    mockedUpdateProfile.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: true,
    } as unknown as ReturnType<typeof useUpdateProfileMutation>);

    renderCheckout({ fiscalEnabled: true });

    expect(screen.getByRole('button', { name: /Processando/i })).toBeDisabled();
  });

  it('lists Pix first when the backend allows Asaas', async () => {
    mockOptions({ asaas: { pix: true, card: true } });
    renderCheckout();
    const radios = await screen.findAllByRole('radio');
    expect(radios[0]).toHaveTextContent('Pix');
  });

  it('hides Asaas methods when not eligible', async () => {
    mockOptions({ asaas: { pix: false, card: false } });
    renderCheckout();
    await screen.findAllByRole('radio');
    expect(screen.queryByRole('radio', { name: /pix/i })).not.toBeInTheDocument();
  });

  it('asks for CPF when Pix is selected even with fiscal off', async () => {
    mockOptions({ asaas: { pix: true, card: true } });
    renderCheckout({ fiscalEnabled: false });
    await userEvent.click(await screen.findByRole('radio', { name: /pix/i }));
    expect(screen.getByLabelText(/cpf/i)).toBeInTheDocument();
  });

  it('disables pay and never places the order when Pix is selected and the CPF is empty', async () => {
    mockOptions({ asaas: { pix: true, card: true } });
    mockUser({ taxDocument: '' });
    placeOrderResolves({
      order: { id: 'o3' } as PlaceOrderResponse['order'],
      payment: { id: 'p3', action: { type: 'COMPLETED', externalReference: 'ref' } },
    });
    renderCheckout();

    await userEvent.click(await screen.findByRole('radio', { name: /pix/i }));
    expect(screen.getByRole('button', { name: /pagar|finalizar/i })).toBeDisabled();

    await userEvent.click(screen.getByRole('button', { name: /pagar|finalizar/i }));
    expect(checkoutService.placeOrder).not.toHaveBeenCalled();
  });

  it('enables pay once a valid CPF is entered for Pix', async () => {
    mockOptions({ asaas: { pix: true, card: true } });
    mockUser({ taxDocument: '' });
    placeOrderResolves({
      order: { id: 'o4' } as PlaceOrderResponse['order'],
      payment: { id: 'p4', action: { type: 'COMPLETED', externalReference: 'ref' } },
    });
    renderCheckout();

    await userEvent.click(await screen.findByRole('radio', { name: /pix/i }));
    expect(screen.getByRole('button', { name: /pagar|finalizar/i })).toBeDisabled();

    await userEvent.type(screen.getByLabelText(/cpf/i), '52998224725');
    expect(screen.getByRole('button', { name: /pagar|finalizar/i })).toBeEnabled();
  });

  it('sends provider ASAAS + method PIX and goes to pending with the QR cached', async () => {
    mockOptions({ asaas: { pix: true, card: true } });
    mockUser({ taxDocument: '12345678909' });
    placeOrderResolves({
      order: { id: 'o1' } as PlaceOrderResponse['order'],
      payment: {
        id: 'p1',
        action: {
          type: 'QR_CODE',
          qrCodeImage: 'IMG',
          copyPaste: 'PIX',
          expiresAt: '2026-09-19T23:59:59Z',
          externalReference: 'pay_1',
        },
      },
    });
    renderCheckout();

    await userEvent.click(await screen.findByRole('radio', { name: /pix/i }));
    await userEvent.click(screen.getByRole('button', { name: /pagar|finalizar/i }));

    expect(checkoutService.placeOrder).toHaveBeenCalledWith(
      expect.objectContaining({ provider: 'ASAAS', method: 'PIX' }),
      expect.any(String),
    );
    await vi.waitFor(() => expect(routerPush).toHaveBeenCalledWith('/checkout/pending?orderId=o1'));
    expect(queryClient.getQueryData(['orders', 'o1', 'payment-action'])).toMatchObject({ type: 'QR_CODE' });
  });

  it('keeps Stripe card orders on provider STRIPE without a method', async () => {
    mockOptions({ asaas: { pix: true, card: true } });
    placeOrderResolves({
      order: { id: 'o2' } as PlaceOrderResponse['order'],
      payment: { id: 'p2', action: { type: 'REDIRECT', url: 'https://stripe' } },
    });
    renderCheckout();

    await userEvent.click(await screen.findByRole('radio', { name: /internacional/i }));
    await userEvent.click(screen.getByRole('button', { name: /pagar|finalizar/i }));

    await vi.waitFor(() => {
      expect(checkoutService.placeOrder).toHaveBeenCalledWith(
        expect.not.objectContaining({ method: expect.anything() }),
        expect.any(String),
      );
    });
  });

  it('shows the not-available message for ASAAS_NOT_AVAILABLE', async () => {
    mockOptions({ asaas: { pix: true, card: true } });
    mockUser({ taxDocument: '12345678909' });
    placeOrderRejects({ status: 409, code: 'ASAAS_NOT_AVAILABLE' });
    renderCheckout();

    await userEvent.click(await screen.findByRole('radio', { name: /pix/i }));
    await userEvent.click(screen.getByRole('button', { name: /pagar|finalizar/i }));

    expect(await screen.findByText(/pix e cartão não estão disponíveis/i)).toBeInTheDocument();
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
