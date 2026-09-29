import { useEffect, useRef } from 'react';
import { useAnalytics } from '@/lib/analytics/tracking';

// Artist page opened — feeds the artist score's "artist views" signal
// (ArtistScoringService reads entity_type = 'artist'). One event per mount,
// same contract as useTrackEventView.
export function useTrackArtistView(artistId: string | undefined) {
  const analytics = useAnalytics();
  // ponytail: guards against a second mount effect (e.g. a slow query
  // resolving artistId after an initial render) double-tracking the same view.
  const trackedArtistId = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (!artistId || trackedArtistId.current === artistId) return;
    trackedArtistId.current = artistId;
    analytics.track('artist_viewed', { artistId });
  }, [artistId, analytics]);
}
