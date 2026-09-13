import { describe, it, expect, vi, beforeEach } from 'vitest';
vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));

vi.mock('@/features/artists', () => ({
  useEventLineup: vi.fn(),
  useArtists: vi.fn(),
  useInviteArtistMutation: vi.fn(),
  useRemoveArtistFromEventMutation: vi.fn(),
  useArtistInsights: vi.fn(),
  ExternalArtistSearchModal: () => null,
  ArtistInsightSummary: ({ insight }: { insight?: { artistId: string; score: number } }) =>
    insight ? <span>{`insight:${insight.artistId}:${insight.score}`}</span> : null,
}));

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EventArtistsSection } from './EventArtistsSection';
import {
  useEventLineup,
  useArtists,
  useInviteArtistMutation,
  useRemoveArtistFromEventMutation,
  useArtistInsights,
} from '@/features/artists';

const asMock = (fn: unknown) => fn as ReturnType<typeof vi.fn>;

describe('EventArtistsSection insights', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    asMock(useEventLineup).mockReturnValue({
      data: [{ artist: { id: 'a1', slug: 'dj-one', name: 'DJ One' }, status: 'ACCEPTED' }],
      isLoading: false,
    });
    asMock(useArtists).mockReturnValue({ data: { items: [{ id: 'a2', slug: 'anitta', name: 'Anitta' }] } });
    asMock(useInviteArtistMutation).mockReturnValue({ mutate: vi.fn(), isPending: false });
    asMock(useRemoveArtistFromEventMutation).mockReturnValue({ mutate: vi.fn(), isPending: false });
  });

  it('shows the insight next to each lineup artist', () => {
    asMock(useArtistInsights).mockReturnValue({ data: [{ artistId: 'a1', score: 72 }] });

    render(<EventArtistsSection eventId="evt-1" />);

    expect(screen.getByText('insight:a1:72')).toBeInTheDocument();
    expect(useArtistInsights).toHaveBeenLastCalledWith(['a1']);
  });

  it('requests insights for search results as well', async () => {
    const user = userEvent.setup();
    asMock(useArtistInsights).mockReturnValue({ data: [{ artistId: 'a2', score: 50 }] });
    render(<EventArtistsSection eventId="evt-1" />);

    await user.type(screen.getByPlaceholderText('dashboard.lineup.searchPlaceholder'), 'ani');

    await waitFor(() => expect(useArtistInsights).toHaveBeenLastCalledWith(['a2', 'a1']));
    expect(screen.getByText('insight:a2:50')).toBeInTheDocument();
  });

  it('renders no insight when the insights query has no data (e.g. 403)', () => {
    asMock(useArtistInsights).mockReturnValue({ data: undefined });

    render(<EventArtistsSection eventId="evt-1" />);

    expect(screen.getByText('DJ One')).toBeInTheDocument();
    expect(screen.queryByText(/^insight:/)).not.toBeInTheDocument();
  });
});
