'use client';

import { useGetEventQuery } from '@/features/events/queries/get-event';
import type { EventResponse } from '@/features/events/types/event.types';
import { useLivePlaybackQuery } from '../queries/live.queries';
import { watchMode } from '../utils/watch-route';
import { LiveGate } from './LiveGate';
import { ReplayGate } from './ReplayGate';

// Long enough to stay cheap for a waiting room left open for hours; the
// backend only finishes an event minutes after its last camera drops anyway.
const FINISH_POLL_MS = 15_000;

interface Props {
  event: EventResponse;
  chatEnabled: boolean;
  adsEnabled: boolean;
  startAtSeconds: number | null;
}

/**
 * `/watch/:id` on the client. The server picked the starting gate; this keeps
 * following the event so a viewer still on the page when the show ends lands
 * on the replay instead of the waiting room. Live playback only says whether
 * something is on air (a camera drop also reads as "not live"), so the event
 * status — not the playback flag — is what decides, polled only while nothing
 * is live.
 */
export function WatchGate({ event: initialEvent, chatEnabled, adsEnabled, startAtSeconds }: Props) {
  // Read-only view of the cache LiveGate's own 5s poll fills — never fetches.
  const onAir = useLivePlaybackQuery(initialEvent.id, false).data?.live === true;
  const { data: event = initialEvent } = useGetEventQuery(initialEvent.id, initialEvent, {
    refetchInterval: (query) =>
      !onAir && watchMode(query.state.data ?? initialEvent) === 'live' ? FINISH_POLL_MS : false,
  });

  if (watchMode(event) === 'replay') {
    return (
      <ReplayGate
        eventId={event.id}
        eventTitle={event.title}
        coverUrl={event.thumbnailUrl ?? event.bannerUrl}
        adsEnabled={adsEnabled}
        startAtSeconds={startAtSeconds}
      />
    );
  }

  return <LiveGate eventId={event.id} eventTitle={event.title} chatEnabled={chatEnabled} adsEnabled={adsEnabled} />;
}
