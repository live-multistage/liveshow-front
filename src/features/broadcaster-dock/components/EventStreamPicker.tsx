'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { eventsService } from '@/features/events/services/events.service';
import { useEventStreamsQuery } from '@/features/streams/queries/streams.queries';
import { Button } from '@/shared/components/ui/button';

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
    if (eventsQuery.isLoading) return <p>Carregando eventos...</p>;
    if (!eventsQuery.data?.length) {
      return <p>Nenhum evento encontrado. Crie um evento no dashboard primeiro.</p>;
    }

    return (
      <div style={{ padding: 16 }}>
        <h2>Escolha um evento</h2>
        <ul>
          {eventsQuery.data.map((event) => (
            <li key={event.id}>
              <Button variant="outline" onClick={() => setEventId(event.id)}>
                {event.title}
              </Button>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div style={{ padding: 16 }}>
      <h2>Escolha uma stream</h2>
      <Button variant="ghost" onClick={() => setEventId(null)}>Voltar</Button>
      {streamsQuery.isLoading && <p>Carregando streams...</p>}
      {!streamsQuery.isLoading && !streamsQuery.data?.length && (
        <p>Nenhuma stream encontrada para este evento.</p>
      )}
      <ul>
        {streamsQuery.data?.map((stream) => (
          <li key={stream.id}>
            <Button disabled={saving} onClick={() => handleSelectStream(stream.id)}>
              {stream.title}
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
