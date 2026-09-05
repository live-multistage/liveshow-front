import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PlatformOrganizerApplicationsPage } from './PlatformOrganizerApplicationsPage';
import { useOrganizerApplicationsQuery } from '../queries/get-organizer-applications';
import { useApproveOrganizerApplicationMutation } from '../mutations/approve-organizer-application.mutation';
import { useRejectOrganizerApplicationMutation } from '../mutations/reject-organizer-application.mutation';
import type { OrganizerApplicationAdmin } from '../types/platform-admin.types';

vi.mock('../queries/get-organizer-applications', () => ({
  useOrganizerApplicationsQuery: vi.fn(),
}));
vi.mock('../mutations/approve-organizer-application.mutation', () => ({
  useApproveOrganizerApplicationMutation: vi.fn(),
}));
vi.mock('../mutations/reject-organizer-application.mutation', () => ({
  useRejectOrganizerApplicationMutation: vi.fn(),
}));

const mockedQuery = vi.mocked(useOrganizerApplicationsQuery);
const mockedApprove = vi.mocked(useApproveOrganizerApplicationMutation);
const mockedReject = vi.mocked(useRejectOrganizerApplicationMutation);

const application: OrganizerApplicationAdmin = {
  id: 'app-1',
  userId: 'user-abc',
  organizationName: 'Produtora Fantasma',
  socialLink: 'https://instagram.com/fantasma',
  segments: ['SHOWS_FESTIVALS'],
  experience: 'NEVER',
  about: 'Quero transmitir shows ao vivo.',
  spamScore: 62,
  reviewFlags: ['SPAM_KEYWORDS', 'MANY_LINKS'],
  status: 'PENDING',
  rejectionReason: null,
  reviewedByUserId: null,
  reviewedAt: null,
  createdAt: '2026-09-01T00:00:00.000Z',
  updatedAt: '2026-09-01T00:00:00.000Z',
};

function stubMutation<T>(overrides: Partial<{ mutate: ReturnType<typeof vi.fn> }> = {}): T {
  return {
    mutate: overrides.mutate ?? vi.fn(),
    isPending: false,
    error: null,
  } as unknown as T;
}

describe('PlatformOrganizerApplicationsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedReject.mockReturnValue(stubMutation<ReturnType<typeof useRejectOrganizerApplicationMutation>>());
  });

  it('renders the score badge, mapped flag labels and org name', () => {
    mockedQuery.mockReturnValue({ data: [application], isLoading: false } as ReturnType<typeof useOrganizerApplicationsQuery>);
    mockedApprove.mockReturnValue(stubMutation<ReturnType<typeof useApproveOrganizerApplicationMutation>>());

    render(<PlatformOrganizerApplicationsPage />);

    expect(screen.getByText('Produtora Fantasma')).toBeInTheDocument();
    expect(screen.getByText('62')).toBeInTheDocument();
    expect(screen.getByText('Palavras de spam')).toBeInTheDocument();
    expect(screen.getByText('Excesso de links')).toBeInTheDocument();
  });

  it('calls the approve mutation with the application id when Aprovar is clicked', async () => {
    const approveMutate = vi.fn();
    mockedQuery.mockReturnValue({ data: [application], isLoading: false } as ReturnType<typeof useOrganizerApplicationsQuery>);
    mockedApprove.mockReturnValue(stubMutation<ReturnType<typeof useApproveOrganizerApplicationMutation>>({ mutate: approveMutate }));
    const user = userEvent.setup();

    render(<PlatformOrganizerApplicationsPage />);
    await user.click(screen.getByRole('button', { name: 'Aprovar' }));

    expect(approveMutate).toHaveBeenCalledWith('app-1');
  });
});
