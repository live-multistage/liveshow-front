vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StrictMode } from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { VerifyEmailContent } from './VerifyEmailContent';
import { useVerifyEmailMutation } from '../mutations/use-verify-email.mutation';
import { useResendVerificationMutation } from '../mutations/use-resend-verification.mutation';

vi.mock('../mutations/use-verify-email.mutation', () => ({ useVerifyEmailMutation: vi.fn() }));
vi.mock('../mutations/use-resend-verification.mutation', () => ({ useResendVerificationMutation: vi.fn() }));

const mockedVerify = vi.mocked(useVerifyEmailMutation);
const mockedResend = vi.mocked(useResendVerificationMutation);

function renderExpired(resend: Record<string, unknown> = {}) {
  mockedVerify.mockReturnValue({ mutate: vi.fn(), isPending: false, error: null } as never);
  const resendMutate = vi.fn();
  mockedResend.mockReturnValue({ mutate: resendMutate, isPending: false, isError: false, ...resend } as never);
  render(<VerifyEmailContent token={undefined} />);
  return { resendMutate };
}

describe('VerifyEmailContent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedResend.mockReturnValue({ mutate: vi.fn(), isPending: false, isError: false } as never);
  });

  it('shows the loading card while the token is being verified', () => {
    mockedVerify.mockReturnValue({ mutate: vi.fn(), isPending: true, error: null } as never);

    render(<VerifyEmailContent token="good-token" />);

    expect(screen.getByRole('heading', { name: 'loading.title' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'loading.spinnerLabel' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('loading.message');
    expect(screen.getByRole('button', { name: 'loading.action' })).toBeDisabled();
  });

  it('calls the API on mount and shows success with a sign-in link', async () => {
    const mutate = vi.fn((_payload, opts?: { onSuccess?: () => void }) => opts?.onSuccess?.());
    mockedVerify.mockReturnValue({ mutate, isPending: true, error: null } as never);

    render(<VerifyEmailContent token="good-token" />);

    expect(mutate).toHaveBeenCalledWith({ token: 'good-token' }, expect.objectContaining({ onSuccess: expect.any(Function) }));
    await waitFor(() => expect(screen.getByRole('heading', { name: 'success.title' })).toBeInTheDocument());
    expect(screen.getByText('success.message')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'success.primary' })).toHaveAttribute('href', '/login');
    expect(screen.getByRole('link', { name: 'success.secondary' })).toHaveAttribute('href', '/');
  });

  it('consumes the token only once under StrictMode', () => {
    const mutate = vi.fn();
    mockedVerify.mockReturnValue({ mutate, isPending: true, error: null } as never);

    render(<StrictMode><VerifyEmailContent token="good-token" /></StrictMode>);

    expect(mutate).toHaveBeenCalledTimes(1);
  });

  it('shows the expired card when the token is rejected', async () => {
    const mutate = vi.fn((_payload, opts?: { onError?: () => void }) => opts?.onError?.());
    mockedVerify.mockReturnValue({ mutate, isPending: false, error: null } as never);

    render(<VerifyEmailContent token="bad-token" />);

    await waitFor(() => expect(screen.getByRole('heading', { name: 'expired.title' })).toBeInTheDocument());
  });

  it('shows the expired card immediately when there is no token', () => {
    renderExpired();

    expect(screen.getByRole('heading', { name: 'expired.title' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'expired.secondary' })).toHaveAttribute('href', '/login');
    expect(screen.getByRole('link', { name: /expired\.footerLink/ })).toHaveAttribute('href', '/login');
  });

  it('reveals the email field when asking to resend', () => {
    renderExpired();

    expect(screen.queryByLabelText('expired.emailLabel')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'expired.primary' }));

    expect(screen.getByLabelText('expired.emailLabel')).toHaveFocus();
    expect(screen.queryByRole('button', { name: 'expired.primary' })).not.toBeInTheDocument();
  });

  it('submits the typed email to the resend mutation', () => {
    const { resendMutate } = renderExpired();
    fireEvent.click(screen.getByRole('button', { name: 'expired.primary' }));

    fireEvent.change(screen.getByLabelText('expired.emailLabel'), { target: { value: ' jane@example.com ' } });
    fireEvent.click(screen.getByRole('button', { name: 'expired.submit' }));

    expect(resendMutate).toHaveBeenCalledWith(
      { email: 'jane@example.com' },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
  });

  it('rejects a malformed email without calling the API', () => {
    const { resendMutate } = renderExpired();
    fireEvent.click(screen.getByRole('button', { name: 'expired.primary' }));

    fireEvent.change(screen.getByLabelText('expired.emailLabel'), { target: { value: 'not-an-email' } });
    fireEvent.click(screen.getByRole('button', { name: 'expired.submit' }));

    expect(resendMutate).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent('expired.invalidEmail');
    expect(screen.getByLabelText('expired.emailLabel')).toHaveAttribute('aria-invalid', 'true');
  });

  it('confirms and locks the form once resent', async () => {
    const { resendMutate } = renderExpired();
    resendMutate.mockImplementation((_payload, opts?: { onSuccess?: () => void }) => opts?.onSuccess?.());
    fireEvent.click(screen.getByRole('button', { name: 'expired.primary' }));

    fireEvent.change(screen.getByLabelText('expired.emailLabel'), { target: { value: 'jane@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: 'expired.submit' }));

    await waitFor(() => expect(screen.getByText('checkEmail.resent')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'expired.submit' })).toBeDisabled();
  });

  it('disables the submit while the resend is pending', () => {
    renderExpired({ isPending: true });
    fireEvent.click(screen.getByRole('button', { name: 'expired.primary' }));

    expect(screen.getByRole('button', { name: 'expired.submit' })).toBeDisabled();
  });

  it('shows the generic error when resend fails', () => {
    renderExpired({ isError: true });
    fireEvent.click(screen.getByRole('button', { name: 'expired.primary' }));

    expect(screen.getByRole('alert')).toHaveTextContent('errors.GENERIC');
  });
});
