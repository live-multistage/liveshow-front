import { useEffect } from 'react';
import { track } from '@/lib/analytics/analytics-client';

// Artist page opened — feeds the artist score's "artist views" signal
// (ArtistScoringService reads entity_type = 'artist'). One event per mount,
// same contract as useTrackEventView.
export function useTrackArtistView(artistId: string | undefined, userId?: string) {
  useEffect(() => {
    if (!artistId) return;
    track({ eventType: 'event.artist_viewed', entityType: 'artist', entityId: artistId, userId });
  }, [artistId, userId]);
}
