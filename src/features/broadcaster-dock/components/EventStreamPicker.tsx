'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CalendarX, ChevronLeft, Plus, VideoOff } from 'lucide-react';
import { eventsService } from '@/features/events/services/events.service';
import { useEventStreamsQuery } from '@/features/streams/queries/streams.queries';
import { STATUS_LABEL } from '@/features/streams/components/StreamCard';
import type { StreamResponse } from '@/features/streams/types/stream.types';
import { Button } from '@/shared/components/ui/button';
import { Card } from '@/shared/components/ui/card';
import { Skeleton } from '@/shared/components/ui/skeleton';
import { EventStreamCard } from './EventStreamCard';
import { StreamCreateForm } from './StreamCreateForm';
import { StageFeedManager } from './StageFeedManager';

export interface ActiveStreamSelection {
  eventId: string;
  streamId: string;
}

interface EventStreamPickerProps {
  callVendorRequest: (requestType: string, requestData?: Record<string, unknown>) => Promise<Record<string, unknown>>;
  onSelected: (stream: ActiveStreamSelection) => void;
  userId: string;
}

type Phase = 'stream-list' | 'create-stream' | 'stage-feed';

export function EventStreamPicker({ callVendorRequest, onSelected, userId }: EventStreamPickerProps) {
  const [eventId, setEventId] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>('stream-list');
  const [selectedStream, setSelectedStream] = useState<StreamResponse | null>(null);
  const [saving, setSaving] = useState(false);

  const eventsQuery = useQuery({
    queryKey: ['broadcaster-dock', 'my-events'],
    queryFn: () => eventsService.getMyEvents(),
  });
  const streamsQuery = useEventStreamsQuery(eventId);

  async function handleContinue() {
    if (!eventId || !selectedStream) return;
    setSaving(true);
    try {
      await callVendorRequest('SetActiveStream', { userId, eventId, streamId: selectedStream.id });
      onSelected({ eventId, streamId: selectedStream.id });
    } finally {
      setSaving(false);
    }
  }

  function handlePickExisting(stream: StreamResponse) {
    setSelectedStream(stream);
    setPhase('stage-feed');
  }

  function handleCreated(stream: StreamResponse) {
    setSelectedStream(stream);
    setPhase('stage-feed');
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

  if (phase === 'create-stream') {
    return (
      <StreamCreateForm
        eventId={eventId}
        onCreated={handleCreated}
        onCancel={() => setPhase('stream-list')}
      />
    );
  }

  if (phase === 'stage-feed' && selectedStream) {
    return (
      <StageFeedManager
        streamId={selectedStream.id}
        streamStatus={selectedStream.status}
        onContinue={handleContinue}
        onBack={() => {
          setPhase('stream-list');
          setSelectedStream(null);
        }}
      />
    );
  }

  return (
    <div className="flex flex-col gap-2 p-4">
      <Button variant="ghost" size="sm" onClick={() => setEventId(null)}>
        <ChevronLeft className="h-4 w-4" />
        Voltar
      </Button>
      <h2 className="text-sm font-semibold">Escolha uma stream</h2>
      <Button variant="outline" size="sm" onClick={() => setPhase('create-stream')}>
        <Plus className="h-4 w-4" />
        Criar nova stream
      </Button>
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
          onClick={() => handlePickExisting(stream)}
          disabled={saving}
        />
      ))}
    </div>
  );
}
