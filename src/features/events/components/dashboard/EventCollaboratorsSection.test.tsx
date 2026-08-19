import { describe, it, expect, vi, beforeEach } from 'vitest';
vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));

vi.mock('@/features/collaborations', () => ({
  useEventCollaboratorsQuery: vi.fn(),
  useOrganizationSearchQuery: vi.fn(),
  useInviteCollaboratorMutation: vi.fn(),
  useCancelInviteMutation: vi.fn(),
}));

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EventCollaboratorsSection } from './EventCollaboratorsSection';
import {
  useEventCollaboratorsQuery,
  useOrganizationSearchQuery,
  useInviteCollaboratorMutation,
  useCancelInviteMutation,
} from '@/features/collaborations';
import type { EventCollaborator, OrganizationSearchResult } from '@/features/collaborations';

function makeCollaborator(overrides: Partial<EventCollaborator> = {}): EventCollaborator {
  return {
    id: 'collab-1',
    organization: { id: 'org-2', name: 'Partner Org', slug: 'partner-org', logoUrl: null },
    status: 'PENDING',
    createdAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('EventCollaboratorsSection', () => {
  const inviteMutate = vi.fn();
  const cancelMutate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useInviteCollaboratorMutation as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      mutate: inviteMutate,
      isPending: false,
    });
    (useCancelInviteMutation as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      mutate: cancelMutate,
      isPending: false,
    });
    (useOrganizationSearchQuery as unknown as ReturnType<typeof vi.fn>).mockReturnValue({ data: [] });
  });

  it('renders the collaborator list with status chips', () => {
    (useEventCollaboratorsQuery as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      data: [makeCollaborator({ status: 'PENDING' }), makeCollaborator({ id: 'collab-2', status: 'ACCEPTED' })],
      isLoading: false,
    });

    render(<EventCollaboratorsSection eventId="evt-1" />);

    expect(screen.getAllByText('Partner Org')).toHaveLength(2);
    expect(screen.getByText('pending')).toBeInTheDocument();
    expect(screen.getByText('accepted')).toBeInTheDocument();
  });

  it('shows a cancel button on a pending row but not on an accepted row', () => {
    (useEventCollaboratorsQuery as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      data: [
        makeCollaborator({ id: 'pending-1', status: 'PENDING' }),
        makeCollaborator({ id: 'accepted-1', status: 'ACCEPTED' }),
      ],
      isLoading: false,
    });

    render(<EventCollaboratorsSection eventId="evt-1" />);

    const cancelButtons = screen.getAllByRole('button', { name: 'cancelInvite' });
    expect(cancelButtons).toHaveLength(1);
  });

  it('calls the cancel mutation with the collaboration id when clicking cancel', async () => {
    (useEventCollaboratorsQuery as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      data: [makeCollaborator({ id: 'pending-1', status: 'PENDING' })],
      isLoading: false,
    });
    const user = userEvent.setup();

    render(<EventCollaboratorsSection eventId="evt-1" />);
    await user.click(screen.getByRole('button', { name: 'cancelInvite' }));

    expect(cancelMutate).toHaveBeenCalledWith('pending-1');
  });

  it('searches organizations as the user types and invites on click', async () => {
    (useEventCollaboratorsQuery as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      data: [],
      isLoading: false,
    });
    const results: OrganizationSearchResult[] = [{ id: 'org-9', name: 'Found Org', logoUrl: null }];
    (useOrganizationSearchQuery as unknown as ReturnType<typeof vi.fn>).mockImplementation((q: string) => ({
      data: q === 'found' ? results : [],
    }));
    const user = userEvent.setup();

    render(<EventCollaboratorsSection eventId="evt-1" />);
    await user.type(screen.getByPlaceholderText('searchOrgPlaceholder'), 'found');

    const resultButton = await screen.findByText('Found Org');
    await user.click(resultButton);

    expect(inviteMutate).toHaveBeenCalledWith('org-9');
  });

  it('renders a loading placeholder and no rows while loading', () => {
    (useEventCollaboratorsQuery as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      data: undefined,
      isLoading: true,
    });

    render(<EventCollaboratorsSection eventId="evt-1" />);

    expect(screen.queryByText('Partner Org')).not.toBeInTheDocument();
    expect(screen.queryByText('noCollaborators')).not.toBeInTheDocument();
  });

  it('renders an empty-state message when there are no collaborators', () => {
    (useEventCollaboratorsQuery as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      data: [],
      isLoading: false,
    });

    render(<EventCollaboratorsSection eventId="evt-1" />);

    expect(screen.getByText('noCollaborators')).toBeInTheDocument();
  });

  it('hides the invite search box and cancel buttons when readOnly', () => {
    (useEventCollaboratorsQuery as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      data: [makeCollaborator({ status: 'PENDING' })],
      isLoading: false,
    });

    render(<EventCollaboratorsSection eventId="evt-1" readOnly />);

    expect(screen.queryByPlaceholderText('searchOrgPlaceholder')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'cancelInvite' })).not.toBeInTheDocument();
    expect(screen.getByText('Partner Org')).toBeInTheDocument();
  });
});
