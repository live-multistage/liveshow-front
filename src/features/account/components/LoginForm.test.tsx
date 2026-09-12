vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
vi.mock('../mutations/use-login.mutation', () => ({ useLoginMutation: vi.fn() }));
vi.mock('../mutations/use-resend-verification.mutation', () => ({ useResendVerificationMutation: vi.fn() }));
vi.mock('./MarketingPanel', () => ({ MarketingPanel: () => <div>marketing-panel-stub</div> }));

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LoginForm } from './LoginForm';
import { useLoginMutation } from '../mutations/use-login.mutation';
import { useResendVerificationMutation } from '../mutations/use-resend-verification.mutation';

const mockedLogin = vi.mocked(useLoginMutation);
const mockedResend = vi.mocked(useResendVerificationMutation);

describe('LoginForm — social login gate', () => {
  beforeEach(() => {
    mockedLogin.mockReturnValue({ mutate: vi.fn(), isPending: false, error: null } as never);
    mockedResend.mockReturnValue({ mutate: vi.fn(), isPending: false, error: null } as never);
  });

  it('renders the social login buttons by default', () => {
    render(<LoginForm />);
    expect(screen.getByText('continueWithGoogle')).toBeInTheDocument();
    expect(screen.getByText('continueWithApple')).toBeInTheDocument();
  });

  it('hides the social login block when socialLoginEnabled is false', () => {
    render(<LoginForm socialLoginEnabled={false} />);
    expect(screen.queryByText('continueWithGoogle')).not.toBeInTheDocument();
    expect(screen.queryByText('continueWithApple')).not.toBeInTheDocument();
    expect(screen.queryByText('orContinueWith')).not.toBeInTheDocument();
  });
});

describe('LoginForm — EMAIL_NOT_VERIFIED', () => {
  beforeEach(() => {
    mockedLogin.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
      error: { message: 'email not verified', status: 403, code: 'EMAIL_NOT_VERIFIED' },
    } as never);
  });

  it('shows the not-verified message and a resend option', () => {
    mockedResend.mockReturnValue({ mutate: vi.fn(), isPending: false, error: null } as never);
    render(<LoginForm />);
    expect(screen.getByText('errors.EMAIL_NOT_VERIFIED')).toBeInTheDocument();
    expect(screen.getByText('resendVerification')).toBeInTheDocument();
  });

  it('resends the verification email using the address typed into the form', async () => {
    const resendMutate = vi.fn((_payload, opts?: { onSuccess?: () => void }) => opts?.onSuccess?.());
    mockedResend.mockReturnValue({ mutate: resendMutate, isPending: false, error: null } as never);

    render(<LoginForm />);
    fireEvent.change(screen.getByLabelText('email'), { target: { value: 'jane@example.com' } });
    fireEvent.click(screen.getByText('resendVerification'));

    expect(resendMutate).toHaveBeenCalledWith(
      { email: 'jane@example.com' },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
    await waitFor(() => {
      expect(screen.getByText('checkEmail.resent')).toBeInTheDocument();
    });
  });

  it('shows a generic error when resend fails', () => {
    mockedResend.mockReturnValue({ mutate: vi.fn(), isPending: false, isError: true, error: null } as never);
    render(<LoginForm />);
    expect(screen.getByText('errors.GENERIC')).toBeInTheDocument();
  });
});

describe('LoginForm — TOO_MANY_ATTEMPTS', () => {
  it('shows the throttle message from a 429', () => {
    mockedLogin.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
      error: { message: 'Too Many Requests', status: 429, code: 'TOO_MANY_ATTEMPTS' },
    } as never);
    mockedResend.mockReturnValue({ mutate: vi.fn(), isPending: false, error: null } as never);

    render(<LoginForm />);
    expect(screen.getByText('errors.TOO_MANY_ATTEMPTS')).toBeInTheDocument();
  });
});
