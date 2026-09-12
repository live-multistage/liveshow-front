vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ForgotPasswordForm } from './ForgotPasswordForm';
import { useForgotPasswordMutation } from '../mutations/use-forgot-password.mutation';

vi.mock('../mutations/use-forgot-password.mutation', () => ({ useForgotPasswordMutation: vi.fn() }));

const mockedForgot = vi.mocked(useForgotPasswordMutation);

describe('ForgotPasswordForm', () => {
  beforeEach(() => vi.clearAllMocks());

  it('sends the request and shows the generic sent confirmation', async () => {
    const mutate = vi.fn((_payload, opts?: { onSuccess?: () => void }) => opts?.onSuccess?.());
    mockedForgot.mockReturnValue({ mutate, isPending: false, error: null } as never);

    render(<ForgotPasswordForm />);
    fireEvent.change(screen.getByLabelText('email'), { target: { value: 'jane@example.com' } });
    fireEvent.click(screen.getByText('submit'));

    await waitFor(() => {
      expect(mutate).toHaveBeenCalledWith(
        { email: 'jane@example.com' },
        expect.objectContaining({ onSuccess: expect.any(Function) }),
      );
    });
    await waitFor(() => expect(screen.getByText('sent')).toBeInTheDocument());
  });

  it('shows a generic error on failure', () => {
    mockedForgot.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
      error: { message: 'boom', status: 500 },
    } as never);

    render(<ForgotPasswordForm />);
    expect(screen.getByText('errors.GENERIC')).toBeInTheDocument();
  });
});
