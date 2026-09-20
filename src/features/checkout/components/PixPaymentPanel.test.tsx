import { createTranslator } from 'use-intl';
import { messages } from '@live-show/i18n-messages';

// Real ICU translator over the pt catalog (not a key-echo stub): copy/expiry
// assertions below can only be checked meaningfully against actual templates.
vi.mock('next-intl', () => ({
  useTranslations: (namespace?: string) =>
    createTranslator({ locale: 'pt', messages: messages.pt, namespace: namespace as never }),
}));

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { toast } from 'sonner';
import { PixPaymentPanel } from './PixPaymentPanel';

vi.mock('sonner', () => ({ toast: { error: vi.fn() } }));

const action = {
  type: 'QR_CODE' as const,
  qrCodeImage: 'iVBORw0KGgo=',
  copyPaste: '00020126PIXCODE',
  expiresAt: '2026-09-19T15:10:00.000Z',
  externalReference: 'pay_1',
};

describe('PixPaymentPanel', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date('2026-09-19T15:00:00.000Z'));
    Object.assign(navigator, { clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } });
    vi.clearAllMocks();
  });
  afterEach(() => vi.useRealTimers());

  it('renders the QR image from base64', () => {
    render(<PixPaymentPanel action={action} amount={110} currency="BRL" />);
    expect(screen.getByRole('img', { name: /qr code pix/i })).toHaveAttribute(
      'src',
      `data:image/png;base64,${action.qrCodeImage}`,
    );
  });

  it('copies the Pix code and confirms', async () => {
    render(<PixPaymentPanel action={action} amount={110} currency="BRL" />);
    await userEvent.click(screen.getByRole('button', { name: /copiar código/i }));
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('00020126PIXCODE');
    expect(await screen.findByText(/copiado/i)).toBeInTheDocument();
  });

  it('shows a toast when the clipboard write fails', async () => {
    Object.assign(navigator, { clipboard: { writeText: vi.fn().mockRejectedValue(new Error('nope')) } });
    render(<PixPaymentPanel action={action} amount={110} currency="BRL" />);
    await userEvent.click(screen.getByRole('button', { name: /copiar código/i }));
    expect(await screen.findByText(/copiar código/i)).toBeInTheDocument();
    expect(toast.error).toHaveBeenCalled();
  });

  it('counts down to expiry and shows the expired state', async () => {
    render(<PixPaymentPanel action={action} amount={110} currency="BRL" />);
    expect(screen.getByText('10:00')).toBeInTheDocument();
    await act(async () => {
      vi.advanceTimersByTime(10 * 60 * 1000);
    });
    expect(screen.getByText('O código Pix expirou')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /copiar código/i })).not.toBeInTheDocument();
  });

  it('shows the loading skeleton (CARREGANDO) instead of the QR/button while isLoading', () => {
    render(<PixPaymentPanel amount={110} currency="BRL" isLoading />);
    expect(screen.getByText(/gerando código pix/i)).toBeInTheDocument();
    expect(screen.queryByRole('img', { name: /qr code pix/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /copiar código/i })).not.toBeInTheDocument();
  });
});
