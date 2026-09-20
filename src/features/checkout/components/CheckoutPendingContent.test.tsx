import { createTranslator } from 'use-intl';
import { messages } from '@live-show/i18n-messages';

vi.mock('next-intl', () => ({
  useTranslations: (namespace?: string) =>
    createTranslator({ locale: 'pt', messages: messages.pt, namespace: namespace as never }),
}));

const mockRouter = { replace: vi.fn(), push: vi.fn() };
vi.mock('next/navigation', () => ({ useRouter: () => mockRouter }));

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CheckoutPendingContent } from './CheckoutPendingContent';
import { useOrderQuery, usePixPaymentAction } from '../mutations/checkout.mutations';
import type { OrderStatus } from '../types/checkout.types';

vi.mock('../mutations/checkout.mutations', () => ({
  useOrderQuery: vi.fn(),
  usePixPaymentAction: vi.fn(),
}));

const mockedOrderQuery = vi.mocked(useOrderQuery);
const mockedPixAction = vi.mocked(usePixPaymentAction);

const pixAction = {
  type: 'QR_CODE' as const,
  qrCodeImage: 'iVBORw0KGgo=',
  copyPaste: '00020126PIXCODE',
  expiresAt: '2099-01-01T00:00:00.000Z',
  externalReference: 'pay_1',
};

function renderWithStatus(status: OrderStatus | undefined, hasPixAction = false) {
  mockedOrderQuery.mockReturnValue({
    data: status ? { id: 'order-1', status, totalAmount: 12000, currency: 'BRL' } : undefined,
  } as unknown as ReturnType<typeof useOrderQuery>);
  mockedPixAction.mockReturnValue({
    data: hasPixAction ? pixAction : undefined,
  } as unknown as ReturnType<typeof usePixPaymentAction>);
  render(<CheckoutPendingContent orderId="order-1" />);
}

describe('CheckoutPendingContent', () => {
  beforeEach(() => vi.clearAllMocks());

  it('polls the order and stays put while it is PENDING', () => {
    renderWithStatus('PENDING');
    expect(mockedOrderQuery).toHaveBeenCalledWith('order-1');
    expect(mockRouter.replace).not.toHaveBeenCalled();
  });

  it('renders the Pix panel when a Pix action is cached for the order', () => {
    renderWithStatus('PENDING', true);
    expect(screen.getByRole('img', { name: /qr code pix/i })).toBeInTheDocument();
    expect(screen.queryByText('Aguardando confirmação')).not.toBeInTheDocument();
  });

  it('falls back to the generic pending card when there is no Pix action', () => {
    renderWithStatus('PENDING', false);
    expect(screen.getByText('Aguardando confirmação')).toBeInTheDocument();
    expect(screen.queryByRole('img', { name: /qr code pix/i })).not.toBeInTheDocument();
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
