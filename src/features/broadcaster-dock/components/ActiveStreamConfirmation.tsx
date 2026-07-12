// src/features/broadcaster-dock/components/ActiveStreamConfirmation.tsx
'use client';

import { useQuery } from '@tanstack/react-query';
import { eventsService } from '@/features/events/services/events.service';
import { useEventStreamsQuery } from '@/features/streams/queries/streams.queries';
import { Button } from '@/shared/components/ui/button';
import { StreamLifecycleBar } from './StreamLifecycleBar';
import { StageFeedManager } from './StageFeedManager';
import type { CallVendorRequest } from '../lib/camera-transmission';

interface ActiveStreamConfirmationProps {
  eventId: string;
  streamId: string;
  obsConnected: boolean;
  callVendorRequest: CallVendorRequest;
  onChangeStream: () => void;
}

export function ActiveStreamConfirmation({
  eventId,
  streamId,
  obsConnected,
  callVendorRequest,
  onChangeStream,
}: ActiveStreamConfirmationProps) {
  const eventQuery = useQuery({
    queryKey: ['broadcaster-dock', 'event', eventId],
    queryFn: () => eventsService.getEvent(eventId),
  });
  // Reusing useEventStreamsQuery (not a bespoke per-stream fetch) is what
  // keeps this screen's status badge in sync with lifecycle mutations for
  // free: useLifecycleMutation (stream.mutations.ts) already writes its
  // result into this exact same STREAM_KEYS.byEvent(eventId) cache entry.
  const streamsQuery = useEventStreamsQuery(eventId);
  const stream = streamsQuery.data?.find((s) => s.id === streamId);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2 px-3 pt-3">
        <p className="truncate text-xs text-muted-foreground">{eventQuery.data?.title ?? eventId}</p>
        <Button variant="ghost" size="sm" onClick={onChangeStream}>
          Trocar transmissão
        </Button>
      </div>
      {stream && (
        <StreamLifecycleBar
          stream={stream}
          eventId={eventId}
          obsConnected={obsConnected}
          callVendorRequest={callVendorRequest}
        />
      )}
      <StageFeedManager
        streamId={streamId}
        streamStatus={stream?.status ?? 'DRAFT'}
        callVendorRequest={callVendorRequest}
      />
    </div>
  );
}
