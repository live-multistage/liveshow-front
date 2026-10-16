let search = new URLSearchParams();
vi.mock('next/navigation', () => ({ useSearchParams: () => search }));
vi.mock('@/features/advertisements', () => ({ AdBanner: () => null }));

const { track } = vi.hoisted(() => ({ track: vi.fn() }));
vi.mock('@/lib/analytics/tracking', () => ({ useAnalytics: () => ({ track }) }));

vi.mock('../mutations/checkout.mutations', () => ({ useOrderQuery: vi.fn() }));

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CheckoutSuccessContent } from './CheckoutSuccessContent';
import { useOrderQuery } from '../mutations/checkout.mutations';
import type { OrderStatus, OrderView } from '../types/checkout.types';

const mockedOrderQuery = vi.mocked(useOrderQuery);

function order(status: OrderStatus): OrderView {
  return {
    id: 'order-7',
    code: 'SHW-7',
    status,
    currency: 'BRL',
    subtotal: 50,
    discountAmount: 0,
    feeAmount: 0,
    totalAmount: 50,
    couponCode: null,
    paymentId: 'pay-1',
    createdAt: '2026-10-16T12:00:00.000Z',
    expiresAt: null,
    lines: [
      {
        id: 'line-1',
        eventId: 'ev-1',
        ticketProductId: 'tp-1',
        productName: 'Pista',
        unitPrice: 50,
        discountAmount: 0,
        lineTotal: 50,
        capabilities: [],
        camerasLimit: null,
        event: null,
      },
    ],
  };
}

function withQuery(state: { data?: OrderView; isError?: boolean; pollingExpired?: boolean }) {
  mockedOrderQuery.mockReturnValue({
    data: state.data,
    isError: state.isError ?? false,
    pollingExpired: state.pollingExpired ?? false,
  } as unknown as ReturnType<typeof useOrderQuery>);
}

describe('CheckoutSuccessContent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    search = new URLSearchParams({ orderId: 'order-7' });
  });

  it('asks the backend for the order in the URL', () => {
    withQuery({});
    render(<CheckoutSuccessContent />);
    expect(mockedOrderQuery).toHaveBeenCalledWith('order-7');
  });

  it('shows "confirmando pagamento", not success, while the order is loading or PENDING', () => {
    withQuery({ data: order('PENDING') });
    render(<CheckoutSuccessContent />);

    expect(screen.getByRole('heading', { name: 'Confirmando pagamento' })).toBeInTheDocument();
    expect(screen.queryByText('PAGAMENTO CONFIRMADO')).not.toBeInTheDocument();
    expect(screen.getByText('Verificando pagamento…')).toBeInTheDocument();
    expect(track).not.toHaveBeenCalled();
  });

  it('stops promising a quick confirmation once polling gave up', () => {
    withQuery({ data: order('PENDING'), pollingExpired: true });
    render(<CheckoutSuccessContent />);

    expect(screen.queryByText('Verificando pagamento…')).not.toBeInTheDocument();
    expect(screen.getByText(/demorando mais que o normal/)).toBeInTheDocument();
  });

  it('PAID → confirmation with the order summary from the backend, tracked once', () => {
    withQuery({ data: order('PAID') });
    render(<CheckoutSuccessContent />);

    expect(screen.getByText('PAGAMENTO CONFIRMADO')).toBeInTheDocument();
    expect(screen.getByText('Pedido SHW-7')).toBeInTheDocument();
    expect(screen.getByText('Pista')).toBeInTheDocument();
    expect(track).toHaveBeenCalledWith('checkout_success_viewed', { orderId: 'order-7' });
    expect(track.mock.calls.filter(([name]) => name === 'checkout_success_viewed')).toHaveLength(1);
  });

  it.each(['EXPIRED', 'CANCELLED'] as const)('%s → not completed, with a way back to checkout', (status) => {
    withQuery({ data: order(status) });
    render(<CheckoutSuccessContent />);

    expect(screen.getByRole('heading', { name: 'Pagamento não concluído' })).toBeInTheDocument();
    expect(screen.queryByText('PAGAMENTO CONFIRMADO')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Voltar ao checkout' })).toHaveAttribute('href', '/checkout');
  });

  it('REFUNDED → says the order was refunded', () => {
    withQuery({ data: order('REFUNDED') });
    render(<CheckoutSuccessContent />);
    expect(screen.getByRole('heading', { name: 'Pedido reembolsado' })).toBeInTheDocument();
  });

  it('cannot verify without an order id — never claims success', () => {
    search = new URLSearchParams();
    withQuery({});
    render(<CheckoutSuccessContent />);

    expect(screen.getByRole('heading', { name: 'Não foi possível verificar o pedido' })).toBeInTheDocument();
    expect(track).not.toHaveBeenCalled();
  });

  it('cannot verify when the order request fails', () => {
    withQuery({ isError: true });
    render(<CheckoutSuccessContent />);
    expect(screen.getByRole('heading', { name: 'Não foi possível verificar o pedido' })).toBeInTheDocument();
  });
});
