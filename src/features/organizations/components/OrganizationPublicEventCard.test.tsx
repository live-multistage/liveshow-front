import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { OrganizationPublicEventCard } from './OrganizationPublicEventCard';
import type { EventResponse } from '@/features/events/types/event.types';

vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key, useLocale: () => 'pt-BR' }));
vi.mock('next/image', () => ({ default: () => null }));
vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));
vi.mock('@/features/wishlist/components/WishlistButton', () => ({ WishlistButton: () => null }));
const trackMock = vi.fn();
vi.mock('@/lib/analytics/tracking', () => ({ useAnalytics: () => ({ track: trackMock }) }));

function makeEvent(): EventResponse {
  return {
    id: 'evt-1',
    slug: 'evt-1',
    title: 'Show',
    description: null,
    startsAt: '2026-09-25T20:00:00.000Z',
    status: 'LIVE',
    thumbnailUrl: null,
    bannerUrl: null,
  } as unknown as EventResponse;
}

describe('OrganizationPublicEventCard click tracking', () => {
  beforeEach(() => trackMock.mockClear());

  it('tracks event_clicked with list/position when list is given', () => {
    render(<OrganizationPublicEventCard event={makeEvent()} list="organizer:org-1" position={1} />);

    screen.getByText('Show').click();

    expect(trackMock).toHaveBeenCalledWith('event_clicked', { eventId: 'evt-1', list: 'organizer:org-1', position: 1 });
  });

  it('does not track a click when no list is given', () => {
    render(<OrganizationPublicEventCard event={makeEvent()} />);

    screen.getByText('Show').click();

    expect(trackMock).not.toHaveBeenCalled();
  });
});
