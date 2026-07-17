'use client';

import { useState } from 'react';
import type { UseFormTrigger } from 'react-hook-form';
import { useCreateEventMutation } from '../mutations/create-event.mutation';
import { streamsService } from '@/features/streams/services/streams.service';
import type { CreateEventFormValues } from '../schemas/create-event.schema';
import type { AccessCapability, EventFormat, EventResponse } from '../types/event.types';
import type { AddedTicket } from '../components/dashboard/TicketSection';
import { emptyStreamConfig } from '../components/dashboard/steps/EventStreamStep';
import type { StreamConfig } from '../components/dashboard/steps/EventStreamStep';

const STEP_FIELDS: Partial<Record<number, (keyof CreateEventFormValues)[]>> = {
  1: ['organizationId', 'title', 'category', 'description'],
  2: ['startsAt', 'endsAt'],
  3: ['camerasCount'],
  // step 4 (stream) has no required form fields
};

async function createStreamStructure(eventId: string, cfg: StreamConfig) {
  if (!cfg.title.trim() && cfg.stages.length === 0) return;
  const stream = await streamsService.create(eventId, {
    title: cfg.title.trim() || 'Transmissão Principal',
  });
  for (const stage of cfg.stages) {
    const s = await streamsService.createStage(stream.id, { name: stage.name });
    for (const feed of stage.feeds) {
      const f = await streamsService.createFeed(s.id, { name: feed.name });
      for (const cam of feed.cameras) {
        await streamsService.createCamera(f.id, { name: cam.name, priority: cam.priority });
      }
    }
  }
}

export function useCreateEventWizard(format: EventFormat, onSuccess?: (event: EventResponse) => void) {
  const [step, setStep] = useState(1);
  const [tickets, setTickets] = useState<AddedTicket[]>([]);
  const [ticketsError, setTicketsError] = useState<string | null>(null);
  const [createdEvent, setCreatedEvent] = useState<EventResponse | null>(null);
  const [streamConfig, setStreamConfig] = useState<StreamConfig>(emptyStreamConfig);

  const mutation = useCreateEventMutation(async (event) => {
    if (format !== 'VOD') {
      try {
        await createStreamStructure(event.id, streamConfig);
      } catch {
        // stream creation is best-effort; user can finish setup in dashboard
      }
    }
    setCreatedEvent(event);
    setStep(6);
  });

  // VOD events skip step 4 (stream topology) entirely — it has nothing to
  // configure and the backend rejects non-REPLAY_VIEW tickets for VOD anyway.
  async function advance(trigger: UseFormTrigger<CreateEventFormValues>) {
    const fields = STEP_FIELDS[step];
    if (fields && fields.length > 0 && !(await trigger(fields))) return;
    setStep((s) => (format === 'VOD' && s + 1 === 4 ? 5 : s + 1));
  }

  function back() {
    setStep((s) => (format === 'VOD' && s - 1 === 4 ? 3 : s - 1));
  }

  function submit(values: CreateEventFormValues) {
    if (tickets.length === 0) {
      setTicketsError('Adicione ao menos um ingresso');
      return;
    }
    setTicketsError(null);
    // Defense in depth: the tickets step locks capabilities to REPLAY_VIEW
    // for VOD, but format can change (user navigates back to step 1) after
    // tickets were added — never let a non-REPLAY_VIEW ticket reach the
    // backend for a VOD event, since that 400s after the event is created.
    const submittedTickets = format === 'VOD'
      ? tickets.map(({ _key: _, ...t }) => ({
        ...t,
        capabilities: ['REPLAY_VIEW'] as AccessCapability[],
        camerasLimit: null,
        capacity: null,
      }))
      : tickets.map(({ _key: _, ...t }) => t);

    mutation.mutate({
      event: {
        organizationId: values.organizationId,
        title: values.title,
        description: values.description,
        category: values.category,
        tags: values.tags,
        startsAt: new Date(values.startsAt).toISOString(),
        endsAt: new Date(values.endsAt).toISOString(),
        venue: values.venue || undefined,
        city: values.city || undefined,
        country: values.country || undefined,
        camerasCount: values.camerasCount,
        format: values.format,
        latencyMode: values.latencyMode,
        publiclyFunded: values.publiclyFunded,
      },
      tickets: submittedTickets,
    });
  }

  function finish() {
    setCreatedEvent(null);
    if (createdEvent) onSuccess?.(createdEvent);
  }

  return {
    step,
    setStep,
    tickets,
    setTickets,
    ticketsError,
    streamConfig,
    setStreamConfig,
    createdEvent,
    mutation,
    advance,
    back,
    submit,
    finish,
  };
}
