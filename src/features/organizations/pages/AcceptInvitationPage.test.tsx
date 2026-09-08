import { describe, it, expect, vi, beforeEach } from 'vitest';
vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));

import { render, screen } from '@testing-library/react';
import { AcceptInvitationPage } from './AcceptInvitationPage';
import { useAuth } from '@/features/account';
import { useAcceptInvitation } from '../hooks/use-accept-invitation';
import type { AppError } from '@/lib/http/errors';

const replace = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace }) }));
vi.mock('@/features/account', () => ({ useAuth: vi.fn() }));
vi.mock('../hooks/use-accept-invitation', () => ({ useAcceptInvitation: vi.fn() }));

const mockedAuth = vi.mocked(useAuth);
const mockedAccept = vi.mocked(useAcceptInvitation);
const mutate = vi.fn();

type AcceptState = {
  isError?: boolean;
  isSuccess?: boolean;
  error?: AppError;
  data?: unknown;
};

function acceptReturns(state: AcceptState) {
  mockedAccept.mockReturnValue({
    mutate,
    isError: false,
    isSuccess: false,
    error: null,
    data: undefined,
    ...state,
  } as unknown as ReturnType<typeof useAcceptInvitation>);
}

function authReturns(isLoggedIn: boolean, isLoading = false) {
  mockedAuth.mockReturnValue({ isLoggedIn, isLoading } as unknown as ReturnType<typeof useAuth>);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('AcceptInvitationPage', () => {
  it('sends an unauthenticated visitor to login with a redirect back here', () => {
    authReturns(false);
    acceptReturns({});

    render(<AcceptInvitationPage token="tok-1" />);

    expect(replace).toHaveBeenCalledWith('/login?redirect=%2Finvitations%2Ftok-1');
    expect(mutate).not.toHaveBeenCalled();
  });

  it('does not redirect nor accept while the session is still loading', () => {
    authReturns(false, true);
    acceptReturns({});

    render(<AcceptInvitationPage token="tok-1" />);

    expect(replace).not.toHaveBeenCalled();
    expect(mutate).not.toHaveBeenCalled();
  });

  it('accepts the invitation exactly once when authenticated', () => {
    authReturns(true);
    acceptReturns({});

    const { rerender } = render(<AcceptInvitationPage token="tok-1" />);
    rerender(<AcceptInvitationPage token="tok-1" />);

    expect(mutate).toHaveBeenCalledTimes(1);
    expect(mutate).toHaveBeenCalledWith('tok-1');
  });

  it('shows the success state with a link into the organization', () => {
    authReturns(true);
    acceptReturns({
      isSuccess: true,
      data: { invitation: {}, member: { organizationId: 'org-9' } },
    });

    render(<AcceptInvitationPage token="tok-1" />);

    expect(screen.getByTestId('accept-invitation-success')).toBeInTheDocument();
    expect(screen.getByText('acceptSuccessTitle')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'acceptGoToOrganization' })).toHaveAttribute(
      'href',
      '/organizations/org-9',
    );
  });

  it.each([
    [403, 'acceptErrorWrongAccount'],
    [410, 'acceptErrorExpired'],
    [404, 'acceptErrorInvalidToken'],
    [400, 'acceptErrorNotPending'],
    [409, 'acceptErrorAlreadyMember'],
    [500, 'acceptErrorGeneric'],
  ])('maps a %i failure to %s', (status, key) => {
    authReturns(true);
    acceptReturns({ isError: true, error: { status, message: 'boom' } });

    render(<AcceptInvitationPage token="tok-1" />);

    expect(screen.getByTestId('accept-invitation-error')).toBeInTheDocument();
    expect(screen.getByText(key)).toBeInTheDocument();
  });
});
