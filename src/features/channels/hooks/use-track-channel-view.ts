import { useEffect, useRef } from 'react';
import { useAnalytics } from '@/lib/analytics/tracking';

// Channel page opened. One event per mount, same contract as
// useTrackArtistView/useTrackOrganizerView.
export function useTrackChannelView(channelId: string | undefined) {
  const analytics = useAnalytics();
  const tracked = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (!channelId || tracked.current === channelId) return;
    tracked.current = channelId;
    analytics.track('channel_viewed', { channelId });
  }, [channelId, analytics]);
}
