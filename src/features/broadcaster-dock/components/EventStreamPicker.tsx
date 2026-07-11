'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CalendarX, ChevronLeft, VideoOff } from 'lucide-react';
import { eventsService } from '@/features/events/services/events.service';
import { useEventStreamsQuery } from '@/features/streams/queries/streams.queries';
import { STATUS_LABEL } from '@/features/streams/components/StreamCard';
import { Button } from '@/shared/components/ui/button';
import { Card } from '@/shared/components/ui/card';
import { Skeleton } from '@/shared/components/ui/skeleton';
import { EventStreamCard } from './EventStreamCard';

export interface ActiveStreamSelection {
  eventId: string;
  streamId: string;
}

interface EventStreamPickerProps {
  callVendorRequest: (requestType: string, requestData?: Record<string, unknown>) => Promise<Record<string, unknown>>;
  onSelected: (stream: ActiveStreamSelection) => void;
  userId: string;
}

export function EventStreamPicker({ callVendorRequest, onSelected, userId }: EventStreamPickerProps) {
  const [eventId, setEventId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const eventsQuery = useQuery({
    queryKey: ['broadcaster-dock', 'my-events'],
    queryFn: () => eventsService.getMyEvents(),
  });
  const streamsQuery = useEventStreamsQuery(eventId);

  async function handleSelectStream(streamId: string) {
    if (!eventId) return;
    setSaving(true);
    try {
      await callVendorRequest('SetActiveStream', { userId, eventId, streamId });
      onSelected({ eventId, streamId });
    } finally {
      setSaving(false);
    }
  }

  if (!eventId) {
    if (eventsQuery.isLoading) {
      return (
        <div className="flex flex-col gap-2 p-4">
          <Skeleton className="h-14 w-full rounded-lg" />
          <Skeleton className="h-14 w-full rounded-lg" />
          <Skeleton className="h-14 w-full rounded-lg" />
        </div>
      );
    }

    if (!eventsQuery.data?.length) {
      return (
        <div className="p-4">
          <Card className="flex flex-col items-center gap-2 p-6 text-center text-sm text-muted-foreground">
            <CalendarX className="h-6 w-6" />
            Nenhum evento encontrado. Crie um evento no dashboard primeiro.
          </Card>
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-2 p-4">
        <h2 className="text-sm font-semibold">Escolha um evento</h2>
        {eventsQuery.data.map((event) => (
          <EventStreamCard
            key={event.id}
            title={event.title}
            thumbnailUrl={event.thumbnailUrl}
            onClick={() => setEventId(event.id)}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 p-4">
      <Button variant="ghost" size="sm" onClick={() => setEventId(null)}>
        <ChevronLeft className="h-4 w-4" />
        Voltar
      </Button>
      <h2 className="text-sm font-semibold">Escolha uma stream</h2>
      {streamsQuery.isLoading && (
        <>
          <Skeleton className="h-14 w-full rounded-lg" />
          <Skeleton className="h-14 w-full rounded-lg" />
        </>
      )}
      {!streamsQuery.isLoading && !streamsQuery.data?.length && (
        <Card className="flex flex-col items-center gap-2 p-6 text-center text-sm text-muted-foreground">
          <VideoOff className="h-6 w-6" />
          Nenhuma stream encontrada para este evento.
        </Card>
      )}
      {streamsQuery.data?.map((stream) => (
        <EventStreamCard
          key={stream.id}
          title={stream.title}
          statusBadge={
            stream.status === 'LIVE'
              ? { label: 'AO VIVO', variant: 'live' }
              : { label: STATUS_LABEL[stream.status], variant: 'default' }
          }
          onClick={() => handleSelectStream(stream.id)}
          disabled={saving}
        />
      ))}
    </div>
  );
}
