vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { VerifyEmailContent } from './VerifyEmailContent';
import { useVerifyEmailMutation } from '../mutations/use-verify-email.mutation';

vi.mock('../mutations/use-verify-email.mutation', () => ({ useVerifyEmailMutation: vi.fn() }));

const mockedVerify = vi.mocked(useVerifyEmailMutation);

describe('VerifyEmailContent', () => {
  beforeEach(() => vi.clearAllMocks());

  it('calls the API on mount and shows success', async () => {
    const mutate = vi.fn((_payload, opts?: { onSuccess?: () => void }) => opts?.onSuccess?.());
    mockedVerify.mockReturnValue({ mutate, isPending: true, error: null } as never);

    render(<VerifyEmailContent token="good-token" />);

    expect(mutate).toHaveBeenCalledWith({ token: 'good-token' }, expect.objectContaining({ onSuccess: expect.any(Function) }));
    await waitFor(() => expect(screen.getByText('success')).toBeInTheDocument());
    expect(screen.getByText('goToLogin')).toBeInTheDocument();
  });

  it('shows invalid when the token is rejected', async () => {
    const mutate = vi.fn((_payload, opts?: { onError?: () => void }) => opts?.onError?.());
    mockedVerify.mockReturnValue({ mutate, isPending: false, error: null } as never);

    render(<VerifyEmailContent token="bad-token" />);

    await waitFor(() => expect(screen.getByText('invalid')).toBeInTheDocument());
  });

  it('shows invalid immediately when there is no token', () => {
    mockedVerify.mockReturnValue({ mutate: vi.fn(), isPending: false, error: null } as never);
    render(<VerifyEmailContent token={undefined} />);
    expect(screen.getByText('invalid')).toBeInTheDocument();
  });
});
