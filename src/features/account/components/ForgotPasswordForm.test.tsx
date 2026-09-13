vi.mock('next-intl', () => ({
  useTranslations: () => Object.assign((key: string) => key, { rich: (key: string) => key }),
}));
vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));
vi.mock('@/shared/components/LanguageSwitcher', () => ({ LanguageSwitcher: () => null }));

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ForgotPasswordForm } from './ForgotPasswordForm';
import { useForgotPasswordMutation } from '../mutations/use-forgot-password.mutation';

vi.mock('../mutations/use-forgot-password.mutation', () => ({ useForgotPasswordMutation: vi.fn() }));

const mockedForgot = vi.mocked(useForgotPasswordMutation);

function succeedingMutate() {
  return vi.fn((_payload, opts?: { onSuccess?: () => void }) => opts?.onSuccess?.());
}

async function submitEmail(email: string) {
  fireEvent.change(screen.getByLabelText('email'), { target: { value: email } });
  fireEvent.click(screen.getByRole('button', { name: 'submit' }));
  await waitFor(() => expect(screen.getByText('sent')).toBeInTheDocument());
}

describe('ForgotPasswordForm', () => {
  beforeEach(() => vi.clearAllMocks());

  it('sends the request and shows the generic sent confirmation with the address', async () => {
    const mutate = succeedingMutate();
    mockedForgot.mockReturnValue({ mutate, isPending: false, error: null } as never);

    render(<ForgotPasswordForm />);
    await submitEmail('jane@example.com');

    expect(mutate).toHaveBeenCalledWith(
      { email: 'jane@example.com' },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
    expect(screen.getByText('jane@example.com')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'sentTitle' })).toHaveFocus();
  });

  it('resends the link to the same address', async () => {
    const mutate = succeedingMutate();
    mockedForgot.mockReturnValue({ mutate, isPending: false, error: null } as never);

    render(<ForgotPasswordForm />);
    await submitEmail('jane@example.com');
    fireEvent.click(screen.getByRole('button', { name: /resend/ }));

    expect(mutate).toHaveBeenCalledTimes(2);
    expect(mutate).toHaveBeenLastCalledWith({ email: 'jane@example.com' }, expect.anything());
    expect(screen.getByText('resent')).toBeInTheDocument();
  });

  it('does not submit an invalid address', async () => {
    const mutate = vi.fn();
    mockedForgot.mockReturnValue({ mutate, isPending: false, error: null } as never);

    render(<ForgotPasswordForm />);
    fireEvent.change(screen.getByLabelText('email'), { target: { value: 'not-an-email' } });
    fireEvent.click(screen.getByRole('button', { name: 'submit' }));

    await waitFor(() => expect(screen.getByLabelText('email')).toHaveAttribute('aria-invalid', 'true'));
    expect(mutate).not.toHaveBeenCalled();
  });

  it('shows a generic error on failure', () => {
    mockedForgot.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
      error: { message: 'boom', status: 500 },
    } as never);

    render(<ForgotPasswordForm />);
    expect(screen.getByRole('alert')).toHaveTextContent('errors.GENERIC');
  });
});
