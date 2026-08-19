import { describe, it, expect, vi } from 'vitest';
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => 'pt-BR',
}));

import { render, screen } from '@testing-library/react';
import { EventDashboardCard } from './EventDashboardCard';
import type { EventResponse } from '../../types/event.types';

function makeEvent(overrides: Partial<EventResponse> = {}): EventResponse {
  return {
    id: 'evt-1',
    title: 'Show',
    description: 'desc',
    category: 'MUSIC',
    organizationId: 'org-1',
    organization: null,
    startsAt: '2026-01-01T00:00:00Z',
    endsAt: '2026-01-01T02:00:00Z',
    status: 'LIVE',
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
    ...overrides,
  };
}

describe('EventDashboardCard', () => {
  it('renders event title and basic info', () => {
    render(<EventDashboardCard event={makeEvent({ title: 'Test Event' })} />);
    expect(screen.getByText('Test Event')).toBeInTheDocument();
  });

  it('shows collaboration chip when collaborationRole is COLLABORATOR', () => {
    render(
      <EventDashboardCard
        event={makeEvent({ collaborationRole: 'COLLABORATOR' })}
      />,
    );
    expect(screen.getByText('collabChip')).toBeInTheDocument();
  });

  it('hides collaboration chip when collaborationRole is OWNER', () => {
    render(
      <EventDashboardCard
        event={makeEvent({ collaborationRole: 'OWNER' })}
      />,
    );
    expect(screen.queryByText('collabChip')).not.toBeInTheDocument();
  });

  it('hides collaboration chip when collaborationRole is undefined', () => {
    render(
      <EventDashboardCard
        event={makeEvent({ collaborationRole: undefined })}
      />,
    );
    expect(screen.queryByText('collabChip')).not.toBeInTheDocument();
  });
});
