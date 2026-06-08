'use client';

import { useState } from 'react';
import type { UseFormTrigger } from 'react-hook-form';
import { useCreateEventMutation } from '../mutations/create-event.mutation';
import type { CreateEventFormValues } from '../schemas/create-event.schema';
import type { EventResponse } from '../types/event.types';
import type { AddedTicket } from '../components/TicketSection';

const STEP_FIELDS: Partial<Record<number, (keyof CreateEventFormValues)[]>> = {
  1: ['organizationId', 'title', 'description'],
  2: ['startsAt', 'endsAt'],
  3: ['camerasCount'],
};

export function useCreateEventWizard(onSuccess?: (event: EventResponse) => void) {
  const [step, setStep] = useState(1);
  const [tickets, setTickets] = useState<AddedTicket[]>([]);
  const [ticketsError, setTicketsError] = useState<string | null>(null);
  const [createdEvent, setCreatedEvent] = useState<EventResponse | null>(null);

  const mutation = useCreateEventMutation((event) => {
    setCreatedEvent(event);
    setStep(5);
  });

  async function advance(trigger: UseFormTrigger<CreateEventFormValues>) {
    const fields = STEP_FIELDS[step];
    if (fields && !(await trigger(fields))) return;
    setStep((s) => s + 1);
  }

  function back() {
    setStep((s) => s - 1);
  }

  function submit(values: CreateEventFormValues) {
    if (tickets.length === 0) {
      setTicketsError('Adicione ao menos um ingresso');
      return;
    }
    setTicketsError(null);
    mutation.mutate({
      event: {
        organizationId: values.organizationId,
        title: values.title,
        description: values.description,
        startsAt: new Date(values.startsAt).toISOString(),
        endsAt: new Date(values.endsAt).toISOString(),
        venue: values.venue || undefined,
        city: values.city || undefined,
        country: values.country || undefined,
        camerasCount: values.camerasCount,
      },
      tickets: tickets.map(({ _key: _, ...t }) => t),
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
    createdEvent,
    mutation,
    advance,
    back,
    submit,
    finish,
  };
}
