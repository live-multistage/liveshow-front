import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

const useOrgCollaborationInvitesQuery = vi.fn();
const mutate = vi.fn();
const useRespondToInviteMutation = vi.fn();
const useMyOrganizationsQuery = vi.fn();
vi.mock('../queries/collaborations.queries', () => ({
  useOrgCollaborationInvitesQuery: (...args: unknown[]) => useOrgCollaborationInvitesQuery(...args),
}));
vi.mock('../mutations/collaborations.mutations', () => ({
  useRespondToInviteMutation: (...args: unknown[]) => useRespondToInviteMutation(...args),
}));
vi.mock('@/features/organizations/queries/get-my-organizations', () => ({
  useMyOrganizationsQuery: (...args: unknown[]) => useMyOrganizationsQuery(...args),
}));

import { CollaborationInvitesCard } from './CollaborationInvitesCard';

const invite = {
  id: 'invite-1',
  event: { id: 'event-1', title: 'Show da Virada' },
  ownerOrganization: { id: 'org-owner-1', name: 'Produtora XPTO', logoUrl: null },
  createdAt: '2026-08-01T00:00:00.000Z',
};

beforeEach(() => {
  useOrgCollaborationInvitesQuery.mockReset();
  useRespondToInviteMutation.mockReset();
  useMyOrganizationsQuery.mockReset();
  mutate.mockReset();
  useRespondToInviteMutation.mockReturnValue({ mutate, isPending: false });
  // Default: requester is an ADMIN of org-1, so existing accept/decline tests
  // (written before the role gate existed) keep seeing the buttons.
  useMyOrganizationsQuery.mockReturnValue({ data: [{ id: 'org-1', role: 'ADMIN' }] });
});

describe('CollaborationInvitesCard', () => {
  it('renders the event title and the owner organization name', () => {
    useOrgCollaborationInvitesQuery.mockReturnValue({ data: [invite] });

    render(<CollaborationInvitesCard organizationId="org-1" />);

    expect(screen.getByText('Show da Virada')).toBeInTheDocument();
    expect(screen.getByText('Produtora XPTO')).toBeInTheDocument();
  });

  it('shows a badge with the invite count', () => {
    useOrgCollaborationInvitesQuery.mockReturnValue({
      data: [invite, { ...invite, id: 'invite-2' }],
    });

    render(<CollaborationInvitesCard organizationId="org-1" />);

    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('accepting an invite calls the mutation with the invite id and accept action', () => {
    useOrgCollaborationInvitesQuery.mockReturnValue({ data: [invite] });

    render(<CollaborationInvitesCard organizationId="org-1" />);
    fireEvent.click(screen.getByRole('button', { name: 'acceptInvite' }));

    expect(mutate).toHaveBeenCalledWith({ id: 'invite-1', action: 'accept' });
  });

  it('declining an invite calls the mutation with the invite id and decline action', () => {
    useOrgCollaborationInvitesQuery.mockReturnValue({ data: [invite] });

    render(<CollaborationInvitesCard organizationId="org-1" />);
    fireEvent.click(screen.getByRole('button', { name: 'declineInvite' }));

    expect(mutate).toHaveBeenCalledWith({ id: 'invite-1', action: 'decline' });
  });

  it('renders nothing when there are no pending invites', () => {
    useOrgCollaborationInvitesQuery.mockReturnValue({ data: [] });

    const { container } = render(<CollaborationInvitesCard organizationId="org-1" />);

    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing while the invites are still loading', () => {
    useOrgCollaborationInvitesQuery.mockReturnValue({ data: undefined });

    const { container } = render(<CollaborationInvitesCard organizationId="org-1" />);

    expect(container).toBeEmptyDOMElement();
  });

  it('a non-admin member sees the invite list without accept/decline buttons', () => {
    useOrgCollaborationInvitesQuery.mockReturnValue({ data: [invite] });
    useMyOrganizationsQuery.mockReturnValue({ data: [{ id: 'org-1', role: 'STAFF' }] });

    render(<CollaborationInvitesCard organizationId="org-1" />);

    expect(screen.getByText('Show da Virada')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'acceptInvite' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'declineInvite' })).not.toBeInTheDocument();
  });

  it('an admin of the org sees the accept/decline buttons', () => {
    useOrgCollaborationInvitesQuery.mockReturnValue({ data: [invite] });
    useMyOrganizationsQuery.mockReturnValue({ data: [{ id: 'org-1', role: 'ADMIN' }] });

    render(<CollaborationInvitesCard organizationId="org-1" />);

    expect(screen.getByRole('button', { name: 'acceptInvite' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'declineInvite' })).toBeInTheDocument();
  });
});
