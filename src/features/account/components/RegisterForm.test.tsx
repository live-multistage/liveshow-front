vi.mock('next-intl', () => ({
  useTranslations: () =>
    Object.assign(
      (key: string, values?: Record<string, unknown>) =>
        values ? `${key}:${Object.values(values).join(',')}` : key,
      { rich: (key: string) => key },
    ),
}));
vi.mock('./MarketingPanel', () => ({ MarketingPanel: () => <div>marketing-panel-stub</div> }));

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { RegisterForm } from './RegisterForm';
import { useRegisterMutation } from '../mutations/use-register.mutation';
import { useResendVerificationMutation } from '../mutations/use-resend-verification.mutation';

vi.mock('../mutations/use-register.mutation', () => ({ useRegisterMutation: vi.fn() }));
vi.mock('../mutations/use-resend-verification.mutation', () => ({ useResendVerificationMutation: vi.fn() }));

const mockedRegister = vi.mocked(useRegisterMutation);
const mockedResend = vi.mocked(useResendVerificationMutation);

function fillAndSubmit() {
  fireEvent.change(screen.getByLabelText('email'), { target: { value: 'jane@example.com' } });
  fireEvent.change(screen.getByLabelText('displayName'), { target: { value: 'Jane Doe' } });
  fireEvent.change(screen.getByLabelText('password'), { target: { value: 'password123' } });
  fireEvent.change(screen.getByLabelText('confirmPassword'), { target: { value: 'password123' } });
  fireEvent.click(screen.getByRole('checkbox', { name: 'acceptTerms' }));
  fireEvent.click(screen.getByText('submit'));
}

describe('RegisterForm — email verification flow', () => {
  beforeEach(() => {
    mockedResend.mockReturnValue({ mutate: vi.fn(), isPending: false, error: null } as never);
  });

  it('does not auto-login; shows the check-email state on success', async () => {
    const mutate = vi.fn((_payload, opts?: { onSuccess?: () => void }) => opts?.onSuccess?.());
    mockedRegister.mockReturnValue({ mutate, isPending: false, error: null } as never);

    render(<RegisterForm />);
    fillAndSubmit();

    await waitFor(() => {
      expect(screen.getByText('checkEmail.title')).toBeInTheDocument();
    });
    expect(screen.getByText('checkEmail.message')).toBeInTheDocument();
    expect(screen.getByText('jane@example.com')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'checkEmail.backToLogin' })).toHaveAttribute('href', '/login');
    expect(screen.queryByText('title')).not.toBeInTheDocument();
  });

  it('lets the user resend the verification email from the check-email state', async () => {
    const mutate = vi.fn((_payload, opts?: { onSuccess?: () => void }) => opts?.onSuccess?.());
    mockedRegister.mockReturnValue({ mutate, isPending: false, error: null } as never);
    const resendMutate = vi.fn((_payload, opts?: { onSuccess?: () => void }) => opts?.onSuccess?.());
    mockedResend.mockReturnValue({ mutate: resendMutate, isPending: false, error: null } as never);

    render(<RegisterForm />);
    fillAndSubmit();

    await waitFor(() => screen.getByText('checkEmail.title'));
    fireEvent.click(screen.getByText('checkEmail.resend'));

    expect(resendMutate).toHaveBeenCalledWith(
      { email: 'jane@example.com' },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
    await waitFor(() => {
      expect(screen.getByText('checkEmail.resent')).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: 'checkEmail.resend' })).toBeDisabled();
  });

  it('shows a generic error when resend fails from the check-email state', async () => {
    const mutate = vi.fn((_payload, opts?: { onSuccess?: () => void }) => opts?.onSuccess?.());
    mockedRegister.mockReturnValue({ mutate, isPending: false, error: null } as never);
    mockedResend.mockReturnValue({ mutate: vi.fn(), isPending: false, isError: true, error: null } as never);

    render(<RegisterForm />);
    fillAndSubmit();

    await waitFor(() => screen.getByText('checkEmail.title'));
    expect(screen.getByText('errors.GENERIC')).toBeInTheDocument();
  });
});

describe('RegisterForm — terms consent', () => {
  beforeEach(() => {
    mockedResend.mockReturnValue({ mutate: vi.fn(), isPending: false, error: null } as never);
  });

  it('does not submit and shows an error when terms are not accepted', async () => {
    const mutate = vi.fn();
    mockedRegister.mockReturnValue({ mutate, isPending: false, error: null } as never);

    render(<RegisterForm />);
    fireEvent.change(screen.getByLabelText('email'), { target: { value: 'jane@example.com' } });
    fireEvent.change(screen.getByLabelText('displayName'), { target: { value: 'Jane Doe' } });
    fireEvent.change(screen.getByLabelText('password'), { target: { value: 'password123' } });
    fireEvent.change(screen.getByLabelText('confirmPassword'), { target: { value: 'password123' } });
    fireEvent.click(screen.getByText('submit'));

    await waitFor(() => {
      expect(screen.getByText('errors.TERMS_REQUIRED')).toBeInTheDocument();
    });
    expect(mutate).not.toHaveBeenCalled();
  });

  it('submits with acceptTerms true and marketingOptIn false by default', async () => {
    const mutate = vi.fn();
    mockedRegister.mockReturnValue({ mutate, isPending: false, error: null } as never);

    render(<RegisterForm />);
    fillAndSubmit();

    await waitFor(() => {
      expect(mutate).toHaveBeenCalledWith(
        {
          email: 'jane@example.com',
          displayName: 'Jane Doe',
          password: 'password123',
          acceptTerms: true,
          marketingOptIn: false,
        },
        expect.objectContaining({ onSuccess: expect.any(Function) }),
      );
    });
  });

  it('submits with marketingOptIn true when the opt-in checkbox is checked', async () => {
    const mutate = vi.fn();
    mockedRegister.mockReturnValue({ mutate, isPending: false, error: null } as never);

    render(<RegisterForm />);
    fireEvent.change(screen.getByLabelText('email'), { target: { value: 'jane@example.com' } });
    fireEvent.change(screen.getByLabelText('displayName'), { target: { value: 'Jane Doe' } });
    fireEvent.change(screen.getByLabelText('password'), { target: { value: 'password123' } });
    fireEvent.change(screen.getByLabelText('confirmPassword'), { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('checkbox', { name: 'acceptTerms' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'marketingOptIn' }));
    fireEvent.click(screen.getByText('submit'));

    await waitFor(() => {
      expect(mutate).toHaveBeenCalledWith(
        expect.objectContaining({ acceptTerms: true, marketingOptIn: true }),
        expect.objectContaining({ onSuccess: expect.any(Function) }),
      );
    });
  });
});
