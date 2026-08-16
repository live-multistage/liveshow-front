import { describe, it, expect, vi } from 'vitest';

vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

import { render, screen } from '@testing-library/react';
import { AccessibleEventCard } from './AccessibleEventCard';
import type { AccessibleEvent, AccessCapability } from '../types/my-list.types';

function ev(overrides: Partial<AccessibleEvent> = {}): AccessibleEvent {
  return {
    id: 'ev-1',
    title: 'Rock in Rio',
    status: 'SCHEDULED',
    startsAt: '2026-01-01T20:00:00.000Z',
    endsAt: '2026-01-01T22:00:00.000Z',
    thumbnailUrl: null,
    bannerUrl: null,
    venue: null,
    city: null,
    capabilities: [],
    canWatchLive: false,
    canWatchReplay: false,
    ...overrides,
  };
}

const caps = (...c: AccessCapability[]) => c;
const action = () => screen.getByRole('link');

describe('AccessibleEventCard', () => {
  it('shows the event title', () => {
    render(<AccessibleEventCard event={ev()} />);
    expect(screen.getByText('Rock in Rio')).toBeInTheDocument();
  });

  it('links a live event the ticket covers to the live player', () => {
    render(
      <AccessibleEventCard
        event={ev({ status: 'LIVE', canWatchLive: true, capabilities: caps('LIVE_VIEW') })}
      />,
    );

    expect(action()).toHaveAttribute('href', '/live/ev-1');
    expect(action()).toHaveTextContent('watchLive');
  });

  it('links a finished event with replay access to the replay player', () => {
    render(
      <AccessibleEventCard
        event={ev({ status: 'FINISHED', canWatchReplay: true, capabilities: caps('REPLAY_VIEW') })}
      />,
    );

    expect(action()).toHaveAttribute('href', '/replay/ev-1');
  });

  /** O caso que o design existe para impedir. */
  it('offers no replay link for a live-only ticket once the event has ended', () => {
    render(
      <AccessibleEventCard
        event={ev({ status: 'FINISHED', canWatchReplay: false, capabilities: caps('LIVE_VIEW') })}
      />,
    );

    expect(action()).toHaveAttribute('href', '/events/ev-1');
    expect(action()).not.toHaveTextContent('watchReplay');
  });

  it('offers no player link for a venue-entry ticket, and says why', () => {
    render(
      <AccessibleEventCard
        event={ev({ status: 'LIVE', capabilities: caps('PHYSICAL_ENTRY') })}
      />,
    );

    expect(action()).toHaveAttribute('href', '/events/ev-1');
    expect(screen.getByText('venueOnly')).toBeInTheDocument();
  });

  it('does not claim a venue-only ticket when the same ticket also grants watching', () => {
    render(
      <AccessibleEventCard
        event={ev({
          status: 'LIVE',
          canWatchLive: true,
          capabilities: caps('PHYSICAL_ENTRY', 'LIVE_VIEW'),
        })}
      />,
    );

    expect(screen.queryByText('venueOnly')).not.toBeInTheDocument();
    expect(action()).toHaveAttribute('href', '/live/ev-1');
  });

  it('marks a cancelled event as cancelled', () => {
    render(<AccessibleEventCard event={ev({ status: 'CANCELLED' })} />);

    expect(action()).toHaveTextContent('cancelled');
  });

  it('renders the cover when there is one, and a placeholder when there is not', () => {
    const { rerender } = render(
      <AccessibleEventCard event={ev({ thumbnailUrl: 'https://cdn/x.jpg' })} />,
    );
    expect(screen.getByRole('presentation', { hidden: true })).toBeTruthy();

    rerender(<AccessibleEventCard event={ev()} />);
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('falls back to the banner when there is no thumbnail', () => {
    const { container } = render(
      <AccessibleEventCard event={ev({ thumbnailUrl: null, bannerUrl: 'https://cdn/b.jpg' })} />,
    );

    expect(container.querySelector('img')).toHaveAttribute('src', 'https://cdn/b.jpg');
  });
});
