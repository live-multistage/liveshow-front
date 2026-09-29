import { useEffect, useRef } from 'react';
import { useAnalytics } from '@/lib/analytics/tracking';

// Organizer public page opened. One event per mount, same contract as
// useTrackArtistView.
export function useTrackOrganizerView(organizationId: string | undefined) {
  const analytics = useAnalytics();
  const tracked = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (!organizationId || tracked.current === organizationId) return;
    tracked.current = organizationId;
    analytics.track('organizer_viewed', { organizationId });
  }, [organizationId, analytics]);
}
