import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a>,
}));
vi.mock('../../queries/get-event', () => ({
  useGetEventQuery: vi.fn(),
  useListTicketProductsQuery: vi.fn(() => ({ data: [] })),
}));
vi.mock('@/features/organizations/queries/get-my-organizations', () => ({
  useMyOrganizationsQuery: vi.fn(),
}));
vi.mock('../../queries/get-accessibility', () => ({ useAccessibilityQuery: vi.fn(() => ({ data: null })) }));
vi.mock('../../mutations/update-event.mutation', () => ({
  useUpdateEventMutation: vi.fn(() => ({ isPending: false, error: null, mutateAsync: vi.fn() })),
}));
vi.mock('../../mutations/publish-event.mutation', () => ({
  usePublishEventMutation: vi.fn(() => ({ isPending: false, mutate: vi.fn() })),
  useUnpublishEventMutation: vi.fn(() => ({ isPending: false, mutate: vi.fn() })),
  useFinishEventMutation: vi.fn(() => ({ isPending: false, mutate: vi.fn() })),
  useResumeLiveMutation: vi.fn(() => ({ isPending: false, mutateAsync: vi.fn() })),
}));
vi.mock('./EventHeaderActions', () => ({
  EventHeaderActions: (props: { readOnly?: boolean; onEdit: () => void; onSave: () => void }) => (
    <div>
      header-actions{props.readOnly ? '-readonly' : ''}
      <button onClick={props.onEdit}>mock-edit</button>
      <button onClick={props.onSave}>mock-save</button>
    </div>
  ),
}));
vi.mock('./LibrasAccessibilityPanel', () => ({ LibrasAccessibilityPanel: () => null }));
vi.mock('./EventInfoGrid', () => ({ EventInfoGrid: () => null }));
vi.mock('./EventTicketList', () => ({ EventTicketList: () => null }));
vi.mock('./EditTicketSection', () => ({ EditTicketSection: () => null }));
vi.mock('./PhotosSection', () => ({ PhotosSection: () => null }));
vi.mock('../VodUploadCard/VodUploadCard', () => ({ VodUploadCard: () => null }));
vi.mock('@/features/metadata', () => ({
  EventMetadataSection: (props: { readOnly?: boolean }) => (
    <div>metadata-section{props.readOnly ? '-readonly' : ''}</div>
  ),
}));
vi.mock('./EventCollaboratorsSection', () => ({
  EventCollaboratorsSection: (props: { readOnly?: boolean }) => (
    <div>collaborators-section{props.readOnly ? '-readonly' : ''}</div>
  ),
}));

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EventDashboardDetailContent } from './EventDashboardDetailContent';
import { useGetEventQuery } from '../../queries/get-event';
import { useUpdateEventMutation } from '../../mutations/update-event.mutation';
import { useMyOrganizationsQuery } from '@/features/organizations/queries/get-my-organizations';
import type { EventResponse } from '../../types/event.types';
import type { OrganizationResponse, OrganizationRole } from '@/features/organizations/types/organization.types';

const EVENT: EventResponse = {
  id: 'evt-1',
  slug: 'evt-1-slug',
  title: 'Show Alheio',
  description: 'desc',
  category: 'MUSIC',
  organizationId: 'org-owner',
  organization: null,
  startsAt: '2026-01-01T00:00:00Z',
  endsAt: '2026-01-01T02:00:00Z',
  status: 'PUBLISHED',
  bannerUrl: null,
  thumbnailUrl: null,
  teaserVideoUrl: null,
  finishedAt: null,
  venue: null,
  city: null,
  country: null,
  venueData: null,
  visibility: 'PUBLIC',
  format: 'LIVE',
  latencyMode: 'STANDARD',
  domain: null,
  subtype: null,
  camerasCount: 0,
  isFree: true,
  publiclyFunded: false,
  lifecycle: { idleFinishMinutes: 10 },
};

function makeOrg(id: string, role: OrganizationRole): OrganizationResponse {
  return {
    id,
    name: id,
    slug: id,
    ownerId: 'someone',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    role,
  };
}

function mockOrgs(orgs: OrganizationResponse[] | undefined, isLoading = false) {
  vi.mocked(useMyOrganizationsQuery).mockReturnValue({
    data: orgs,
    isLoading,
  } as unknown as ReturnType<typeof useMyOrganizationsQuery>);
}

function renderPage() {
  return render(<EventDashboardDetailContent id={EVENT.id} />);
}

// GET /events/:id is public: it serves any non-DRAFT event to anyone, so simply
// resolving the event proves nothing about ownership. The management UI must be
// gated on org membership the same way the mutations are server-side.
describe('EventDashboardDetailContent ownership gate', () => {
  beforeEach(() => {
    vi.mocked(useGetEventQuery).mockReturnValue({
      data: EVENT,
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof useGetEventQuery>);
  });

  it('renders the management UI for an org admin of the owning org', () => {
    mockOrgs([makeOrg('org-owner', 'ADMIN')]);

    renderPage();

    expect(screen.getByText('header-actions')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Show Alheio' })).toBeInTheDocument();
  });

  it('renders the management UI for the org owner', () => {
    mockOrgs([makeOrg('org-owner', 'OWNER')]);

    renderPage();

    expect(screen.getByText('header-actions')).toBeInTheDocument();
  });

  it("denies a logged-in user who belongs to a different org", () => {
    mockOrgs([makeOrg('org-other', 'OWNER')]);

    renderPage();

    expect(screen.getByText('noAccess')).toBeInTheDocument();
    expect(screen.queryByText('header-actions')).toBeNull();
    expect(screen.queryByRole('heading', { name: 'Show Alheio' })).toBeNull();
  });

  it('denies a user with no organizations at all', () => {
    mockOrgs([]);

    renderPage();

    expect(screen.getByText('noAccess')).toBeInTheDocument();
    expect(screen.queryByText('header-actions')).toBeNull();
  });

  // Backend requires member.isAdmin() (OWNER/ADMIN) to mutate; a STAFF member of
  // the owning org would get a UI whose every button 403s.
  it('denies a non-admin member of the owning org', () => {
    mockOrgs([makeOrg('org-owner', 'STAFF')]);

    renderPage();

    expect(screen.getByText('noAccess')).toBeInTheDocument();
  });

  // Fails closed: a 401/error on /organizations/mine leaves data undefined.
  it('denies when the membership query fails', () => {
    mockOrgs(undefined);

    renderPage();

    expect(screen.getByText('noAccess')).toBeInTheDocument();
  });

  it('shows a spinner instead of flashing the management UI while membership loads', () => {
    mockOrgs(undefined, true);

    const { container } = renderPage();

    expect(screen.queryByText('header-actions')).toBeNull();
    expect(screen.queryByText('noAccess')).toBeNull();
    expect(container.querySelector('[class*="spinner"]')).not.toBeNull();
  });

  it('does not leak the event through the not-found state before membership resolves', () => {
    vi.mocked(useGetEventQuery).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
    } as unknown as ReturnType<typeof useGetEventQuery>);
    mockOrgs([makeOrg('org-owner', 'ADMIN')]);

    renderPage();

    expect(screen.getByText('notFound')).toBeInTheDocument();
  });
});

// GET /events/:id also serves collaborator orgs the event, but the backend only
// lets an OWNER-org member mutate it — a COLLABORATOR org's every write call 403s.
// The dashboard must hide those buttons instead of showing dead ones.
describe('EventDashboardDetailContent collaboration read-only gate', () => {
  beforeEach(() => {
    mockOrgs([makeOrg('org-owner', 'ADMIN')]);
  });

  it('hides write-action surfaces for a COLLABORATOR org', () => {
    vi.mocked(useGetEventQuery).mockReturnValue({
      data: { ...EVENT, collaborationRole: 'COLLABORATOR' },
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof useGetEventQuery>);

    renderPage();

    expect(screen.getByText('header-actions-readonly')).toBeInTheDocument();
    expect(screen.getByText('collaborators-section-readonly')).toBeInTheDocument();
    expect(screen.getByText('metadata-section-readonly')).toBeInTheDocument();
  });

  it('shows write-action surfaces for the OWNER role', () => {
    vi.mocked(useGetEventQuery).mockReturnValue({
      data: { ...EVENT, collaborationRole: 'OWNER' },
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof useGetEventQuery>);

    renderPage();

    expect(screen.getByText('header-actions')).toBeInTheDocument();
    expect(screen.getByText('collaborators-section')).toBeInTheDocument();
    expect(screen.getByText('metadata-section')).toBeInTheDocument();
  });

  it('grants access to a COLLABORATOR org that has no owning-org membership', () => {
    mockOrgs([makeOrg('org-other', 'OWNER')]);
    vi.mocked(useGetEventQuery).mockReturnValue({
      data: { ...EVENT, collaborationRole: 'COLLABORATOR' },
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof useGetEventQuery>);

    renderPage();

    expect(screen.queryByText('noAccess')).toBeNull();
    expect(screen.getByRole('heading', { name: 'Show Alheio' })).toBeInTheDocument();
    expect(screen.getByText('header-actions-readonly')).toBeInTheDocument();
  });

  it('shows write-action surfaces when collaborationRole is undefined', () => {
    vi.mocked(useGetEventQuery).mockReturnValue({
      data: EVENT,
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof useGetEventQuery>);

    renderPage();

    expect(screen.getByText('header-actions')).toBeInTheDocument();
    expect(screen.getByText('collaborators-section')).toBeInTheDocument();
    expect(screen.getByText('metadata-section')).toBeInTheDocument();
  });
});

// Finished events accept content edits only: the update payload must omit the
// frozen schedule fields (startsAt/endsAt/latencyMode) or the backend 400s.
describe('EventDashboardDetailContent finished-event editing', () => {
  beforeEach(() => vi.clearAllMocks());

  async function editAndSave(status: EventResponse['status']) {
    const mutateAsync = vi.fn().mockResolvedValue(undefined);
    vi.mocked(useUpdateEventMutation).mockReturnValue({
      isPending: false,
      error: null,
      mutateAsync,
    } as unknown as ReturnType<typeof useUpdateEventMutation>);
    vi.mocked(useGetEventQuery).mockReturnValue({
      data: {
        ...EVENT,
        description: 'a description long enough for the edit schema',
        status,
        finishedAt: status === 'FINISHED' ? '2026-01-01T02:00:00Z' : null,
      },
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof useGetEventQuery>);
    mockOrgs([makeOrg('org-owner', 'ADMIN')]);

    renderPage();
    await userEvent.click(screen.getByText('mock-edit'));
    await userEvent.click(screen.getByText('mock-save'));
    await waitFor(() => expect(mutateAsync).toHaveBeenCalled());
    return mutateAsync.mock.calls[0][0];
  }

  it('omits schedule fields when saving a FINISHED event', async () => {
    const payload = await editAndSave('FINISHED');
    expect(payload.title).toBe(EVENT.title);
    expect(payload.description).toBe('a description long enough for the edit schema');
    expect(payload).not.toHaveProperty('startsAt');
    expect(payload).not.toHaveProperty('endsAt');
    expect(payload).not.toHaveProperty('latencyMode');
  });

  it('keeps sending schedule fields for editable statuses', async () => {
    const payload = await editAndSave('PUBLISHED');
    expect(payload.startsAt).toBeDefined();
    expect(payload.endsAt).toBeDefined();
    expect(payload.latencyMode).toBe('STANDARD');
  });
});
