import { describe, it, expect, vi } from 'vitest';
vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ArtistInsight } from '@live-show/api-contracts';
import { ArtistInsightSummary } from './ArtistInsightSummary';

function makeInsight(overrides: Partial<ArtistInsight> = {}): ArtistInsight {
  return {
    artistId: 'a1', score: 72.4, momentumScore: 80, trend: 'UP', followers: 1500,
    deezerFans: 7402440, eventsCount: 3, avgPurchasesPerEvent: 12.25,
    updatedAt: '2026-09-13T03:30:00.000Z',
    ...overrides,
  };
}

describe('ArtistInsightSummary', () => {
  it('renders nothing without an insight', () => {
    const { container } = render(<ArtistInsightSummary insight={undefined} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows "no data yet" for an artist that was never scored', () => {
    render(<ArtistInsightSummary insight={makeInsight({ updatedAt: null })} />);
    expect(screen.getByText('noData')).toBeInTheDocument();
  });

  it('shows the rounded score', () => {
    render(<ArtistInsightSummary insight={makeInsight()} />);
    expect(screen.getByText('72')).toBeInTheDocument();
  });

  it.each([
    ['UP', 'trendUp'],
    ['FLAT', 'trendFlat'],
    ['DOWN', 'trendDown'],
  ] as const)('labels trend %s for assistive tech', (trend, key) => {
    render(<ArtistInsightSummary insight={makeInsight({ trend })} />);
    expect(screen.getByLabelText(`score · ${key}`)).toBeInTheDocument();
  });

  it('reveals the breakdown on hover', async () => {
    const user = userEvent.setup();
    render(<ArtistInsightSummary insight={makeInsight({ deezerFans: null })} />);

    await user.hover(screen.getByText('72'));

    expect((await screen.findAllByText('followers')).length).toBeGreaterThan(0);
    expect(screen.getAllByText('deezerFans').length).toBeGreaterThan(0);
    expect(screen.getAllByText('—').length).toBeGreaterThan(0); // null Deezer fans
    expect(screen.getAllByText('12.3').length).toBeGreaterThan(0);
  });
});
