import { describe, it, expect, vi, beforeEach } from 'vitest';
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string, values?: Record<string, unknown>) =>
    values ? `${key}:${Object.values(values).join(',')}` : key,
}));

import { render, screen, fireEvent } from '@testing-library/react';
import { PendingInvitations } from './PendingInvitations';
import {
  useOrganizationInvitations,
  useRevokeInvitation,
} from '../hooks/use-organization-invitations';
import type { OrganizationInvitationResponse } from '../types/organization.types';

vi.mock('../hooks/use-organization-invitations', () => ({
  useOrganizationInvitations: vi.fn(),
  useRevokeInvitation: vi.fn(),
}));

const mockedList = vi.mocked(useOrganizationInvitations);
const mockedRevoke = vi.mocked(useRevokeInvitation);

function invitation(
  overrides: Partial<OrganizationInvitationResponse> = {},
): OrganizationInvitationResponse {
  return {
    id: 'inv-1',
    organizationId: 'org-1',
    email: 'friend@example.com',
    role: 'OPERATOR',
    status: 'PENDING',
    invitedByUserId: 'user-1',
    createdAt: '2026-09-07T22:00:00.000Z',
    expiresAt: '2026-09-14T22:00:00.000Z',
    acceptedAt: null,
    ...overrides,
  };
}

const revokeMutate = vi.fn();

function listReturns(data: OrganizationInvitationResponse[], isLoading = false) {
  mockedList.mockReturnValue({ data, isLoading } as unknown as ReturnType<
    typeof useOrganizationInvitations
  >);
}

beforeEach(() => {
  vi.clearAllMocks();
  mockedRevoke.mockReturnValue({ mutate: revokeMutate, isPending: false } as unknown as ReturnType<
    typeof useRevokeInvitation
  >);
});

describe('PendingInvitations', () => {
  it('renders nothing when the viewer cannot manage the org', () => {
    listReturns([]);
    render(<PendingInvitations organizationId="org-1" canManage={false} />);
    expect(screen.queryByTestId('pending-invitations')).not.toBeInTheDocument();
  });

  it('does not query invitations when the viewer cannot manage the org', () => {
    listReturns([]);
    render(<PendingInvitations organizationId="org-1" canManage={false} />);
    expect(mockedList).toHaveBeenCalledWith('org-1', false);
  });

  it('lists only PENDING invitations with email, role and expiry', () => {
    listReturns([
      invitation(),
      invitation({ id: 'inv-2', email: 'gone@example.com', status: 'REVOKED' }),
      invitation({ id: 'inv-3', email: 'old@example.com', status: 'EXPIRED' }),
    ]);

    render(<PendingInvitations organizationId="org-1" canManage />);

    expect(screen.getByText('friend@example.com')).toBeInTheDocument();
    expect(screen.queryByText('gone@example.com')).not.toBeInTheDocument();
    expect(screen.queryByText('old@example.com')).not.toBeInTheDocument();
    expect(screen.getByText('roleOPERATOR')).toBeInTheDocument();
    expect(
      screen.getByText(`invitationExpiresAt:${new Date('2026-09-14T22:00:00.000Z').toLocaleDateString('pt-BR')}`),
    ).toBeInTheDocument();
    expect(screen.getByText('pendingInvitationsTitle (1)')).toBeInTheDocument();
  });

  it('shows the empty state when there is no pending invitation', () => {
    listReturns([invitation({ status: 'ACCEPTED' })]);
    render(<PendingInvitations organizationId="org-1" canManage />);
    expect(screen.getByText('pendingInvitationsEmpty')).toBeInTheDocument();
  });

  it('asks for confirmation before revoking, then revokes', () => {
    listReturns([invitation()]);
    render(<PendingInvitations organizationId="org-1" canManage />);

    fireEvent.click(screen.getByRole('button', { name: 'revokeBtn' }));

    expect(revokeMutate).not.toHaveBeenCalled();
    expect(screen.getByText('revokeDialogTitle')).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole('button', { name: 'revokeBtn' })[1]);

    expect(revokeMutate).toHaveBeenCalledWith('inv-1', expect.any(Object));
  });

  it('maps a 400 revoke failure to the not-pending copy', () => {
    listReturns([invitation()]);
    revokeMutate.mockImplementation((_id, opts) => opts.onError({ status: 400, message: 'x' }));

    render(<PendingInvitations organizationId="org-1" canManage />);
    fireEvent.click(screen.getByRole('button', { name: 'revokeBtn' }));
    fireEvent.click(screen.getAllByRole('button', { name: 'revokeBtn' })[1]);

    expect(screen.getByText('revokeErrorNotPending')).toBeInTheDocument();
  });
});
