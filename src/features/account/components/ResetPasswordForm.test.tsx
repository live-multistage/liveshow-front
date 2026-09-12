vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ResetPasswordForm } from './ResetPasswordForm';
import { useResetPasswordMutation } from '../mutations/use-reset-password.mutation';

vi.mock('../mutations/use-reset-password.mutation', () => ({ useResetPasswordMutation: vi.fn() }));

const mockedReset = vi.mocked(useResetPasswordMutation);

function fillPasswords(password: string, confirmPassword: string) {
  fireEvent.change(screen.getByLabelText('password'), { target: { value: password } });
  fireEvent.change(screen.getByLabelText('confirmPassword'), { target: { value: confirmPassword } });
  fireEvent.click(screen.getByText('submit'));
}

describe('ResetPasswordForm', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows TOKEN_INVALID immediately when there is no token, without a form', () => {
    mockedReset.mockReturnValue({ mutate: vi.fn(), isPending: false, error: null } as never);
    render(<ResetPasswordForm token={undefined} />);
    expect(screen.getByText('errors.TOKEN_INVALID')).toBeInTheDocument();
    expect(screen.queryByLabelText('password')).not.toBeInTheDocument();
  });

  it('shows MISMATCH when the passwords differ', async () => {
    const mutate = vi.fn();
    mockedReset.mockReturnValue({ mutate, isPending: false, error: null } as never);

    render(<ResetPasswordForm token="good-token" />);
    fillPasswords('password123', 'different123');

    await waitFor(() => expect(screen.getByText('errors.MISMATCH')).toBeInTheDocument());
    expect(mutate).not.toHaveBeenCalled();
  });

  it('shows TOKEN_INVALID from the server on an expired/invalid token', () => {
    mockedReset.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
      error: { message: 'invalid', status: 400, code: 'TOKEN_INVALID' },
    } as never);

    render(<ResetPasswordForm token="bad-token" />);
    expect(screen.getByText('errors.TOKEN_INVALID')).toBeInTheDocument();
  });

  it('submits and shows the success state', async () => {
    const mutate = vi.fn((_payload, opts?: { onSuccess?: () => void }) => opts?.onSuccess?.());
    mockedReset.mockReturnValue({ mutate, isPending: false, error: null } as never);

    render(<ResetPasswordForm token="good-token" />);
    fillPasswords('password123', 'password123');

    await waitFor(() => {
      expect(mutate).toHaveBeenCalledWith({ token: 'good-token', password: 'password123' }, expect.anything());
    });
    await waitFor(() => expect(screen.getByText('success')).toBeInTheDocument());
  });
});
