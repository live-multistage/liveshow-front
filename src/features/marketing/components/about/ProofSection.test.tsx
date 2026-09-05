import { describe, it, expect, vi } from 'vitest';
import type { EventResponse } from '@live-show/api-contracts';

const fetchReplayCatalog = vi.fn();

vi.mock('@/features/events/queries/get-replay-catalog.server', () => ({
  fetchReplayCatalog: () => fetchReplayCatalog(),
}));

vi.mock('next-intl/server', () => ({
  getTranslations: async () => (key: string) => key,
  getLocale: async () => 'pt',
}));

vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

import { render, screen } from '@testing-library/react';
import { ProofSection } from './ProofSection';

function makeEvent(overrides: Partial<EventResponse>): EventResponse {
  return {
    id: overrides.id ?? 'evt-1',
    slug: overrides.slug ?? 'evt-1-slug',
    title: overrides.title ?? 'Some Event',
    description: '',
    category: 'MUSIC',
    organizationId: 'org-1',
    organization: overrides.organization ?? { id: 'org-1', name: 'Org One', slug: 'org-one', logoUrl: null },
    startsAt: overrides.startsAt ?? '2026-01-10T20:00:00.000Z',
    endsAt: '2026-01-10T23:00:00.000Z',
    status: 'FINISHED',
    bannerUrl: null,
    thumbnailUrl: overrides.thumbnailUrl ?? null,
    teaserVideoUrl: null,
    finishedAt: '2026-01-10T23:00:00.000Z',
    venue: null,
    city: null,
    country: null,
    venueData: null,
    visibility: 'PUBLIC',
    format: 'LIVE',
    latencyMode: 'STANDARD',
    domain: null,
    subtype: null,
    camerasCount: 1,
    isFree: false,
    publiclyFunded: false,
    ...overrides,
  };
}

describe('ProofSection', () => {
  it('renders nothing with fewer than 3 items', async () => {
    fetchReplayCatalog.mockResolvedValue({
      items: [makeEvent({ id: '1' }), makeEvent({ id: '2' })],
      page: 1,
      pageSize: 12,
      total: 2,
    });

    const { container } = render(await ProofSection());
    expect(container).toBeEmptyDOMElement();
  });

  it('renders a card per item (up to 6) with href and org name', async () => {
    const items = [
      makeEvent({ id: '1', slug: 'show-one', title: 'Show One', organization: { id: 'o1', name: 'Org One', slug: 'org-one', logoUrl: null } }),
      makeEvent({ id: '2', slug: 'show-two', title: 'Show Two', organization: { id: 'o2', name: 'Org Two', slug: 'org-two', logoUrl: null } }),
      makeEvent({ id: '3', slug: 'show-three', title: 'Show Three', organization: { id: 'o3', name: 'Org Three', slug: 'org-three', logoUrl: null } }),
      makeEvent({ id: '4', slug: 'show-four', title: 'Show Four', organization: { id: 'o4', name: 'Org Four', slug: 'org-four', logoUrl: null } }),
    ];
    fetchReplayCatalog.mockResolvedValue({ items, page: 1, pageSize: 12, total: items.length });

    render(await ProofSection());

    const links = screen.getAllByRole('link');
    expect(links).toHaveLength(4);
    expect(links[0]).toHaveAttribute('href', '/events/show-one');
    expect(links[3]).toHaveAttribute('href', '/events/show-four');

    expect(screen.getByText('Org One')).toBeInTheDocument();
    expect(screen.getByText('Org Four')).toBeInTheDocument();
  });
});
