vi.mock('next-intl', () => ({
  useTranslations: () => (key: string, values?: Record<string, unknown>) =>
    values ? `${key}:${Object.values(values).join(',')}` : key,
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
    expect(screen.getByText(/checkEmail\.body/)).toHaveTextContent('jane@example.com');
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
  });
});
