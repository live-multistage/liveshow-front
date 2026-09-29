import { describe, it, expect, vi, beforeEach } from 'vitest';
vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
vi.mock('../hooks/use-artists', () => ({ useArtist: vi.fn(), useArtistEvents: vi.fn() }));
vi.mock('@/features/follows', () => ({ FollowButton: () => null }));
const trackMock = vi.fn();
vi.mock('@/lib/analytics/tracking', () => ({ useAnalytics: () => ({ track: trackMock }) }));
vi.mock('@/features/wishlist/components/WishlistButton', () => ({ WishlistButton: () => null }));

import { render, screen } from '@testing-library/react';
import type { ArtistResponse } from '@live-show/api-contracts';
import { ArtistPublicPage } from './ArtistPublicPage';
import { useArtist, useArtistEvents } from '../hooks/use-artists';

const asMock = (fn: unknown) => fn as ReturnType<typeof vi.fn>;

function withArtist(overrides: Partial<ArtistResponse> = {}) {
  const artist: ArtistResponse = { id: 'a1', slug: 'anitta', name: 'Anitta', status: 'ACTIVE', ...overrides };
  asMock(useArtist).mockReturnValue({ data: artist, isLoading: false, isError: false });
  asMock(useArtistEvents).mockReturnValue({ data: { items: [] }, isLoading: false });
}

describe('ArtistPublicPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows the trending badge when the API marks the artist TRENDING', () => {
    withArtist({ badges: ['TRENDING'] });
    render(<ArtistPublicPage slugOrId="anitta" />);
    expect(screen.getByText('badges.trending')).toBeInTheDocument();
  });

  it.each([
    ['an empty badge list', { badges: [] }],
    ['an API that does not send badges yet', {}],
  ])('shows no badge for %s', (_label, overrides) => {
    withArtist(overrides);
    render(<ArtistPublicPage slugOrId="anitta" />);
    expect(screen.queryByText('badges.trending')).not.toBeInTheDocument();
  });

  it('tracks one artist view', () => {
    withArtist();
    render(<ArtistPublicPage slugOrId="anitta" />);
    expect(trackMock).toHaveBeenCalledTimes(1);
    expect(trackMock).toHaveBeenCalledWith('artist_viewed', { artistId: 'a1' });
  });

  it('does not track while the artist is still loading', () => {
    asMock(useArtist).mockReturnValue({ data: undefined, isLoading: true, isError: false });
    asMock(useArtistEvents).mockReturnValue({ data: undefined, isLoading: true });
    render(<ArtistPublicPage slugOrId="anitta" />);
    expect(trackMock).not.toHaveBeenCalled();
  });
});
