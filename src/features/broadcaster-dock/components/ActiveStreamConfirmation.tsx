'use client';

import { useQuery } from '@tanstack/react-query';
import { eventsService } from '@/features/events/services/events.service';
import { streamsService } from '@/features/streams/services/streams.service';
import { Button } from '@/shared/components/ui/button';

interface ActiveStreamConfirmationProps {
  eventId: string;
  streamId: string;
  onChangeStream: () => void;
}

export function ActiveStreamConfirmation({ eventId, streamId, onChangeStream }: ActiveStreamConfirmationProps) {
  const eventQuery = useQuery({
    queryKey: ['broadcaster-dock', 'event', eventId],
    queryFn: () => eventsService.getEvent(eventId),
  });
  const streamQuery = useQuery({
    queryKey: ['broadcaster-dock', 'stream', streamId],
    queryFn: () => streamsService.getById(streamId),
  });

  return (
    <div style={{ padding: 16 }}>
      <p>OBS conectado</p>
      <p>
        Transmitindo para: {eventQuery.data?.title ?? eventId} / {streamQuery.data?.title ?? streamId}
      </p>
      <Button variant="outline" onClick={onChangeStream}>
        Trocar transmissão
      </Button>
    </div>
  );
}
