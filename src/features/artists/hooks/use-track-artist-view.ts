import { useEffect, useRef } from 'react';
import { track } from '@/lib/analytics/analytics-client';

// Artist page opened — feeds the artist score's "artist views" signal
// (ArtistScoringService reads entity_type = 'artist'). One event per mount,
// same contract as useTrackEventView.
export function useTrackArtistView(artistId: string | undefined, userId?: string) {
  // ponytail: auth hydrating after the artist loads would otherwise re-run this
  // effect (userId is a dependency) and double-track the same view. Track once
  // per artistId per mount, still using whichever userId is known at that moment.
  const trackedArtistId = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (!artistId || trackedArtistId.current === artistId) return;
    trackedArtistId.current = artistId;
    track({ eventType: 'event.artist_viewed', entityType: 'artist', entityId: artistId, userId });
  }, [artistId, userId]);
}
