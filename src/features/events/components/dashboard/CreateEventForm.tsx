'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { ChevronRight, ChevronLeft } from 'lucide-react';
import { createEventSchema, type CreateEventFormValues } from '../../schemas/create-event.schema';
import { useMyOrganizationsQuery } from '@/features/organizations/queries/get-my-organizations';
import { useCreateEventWizard } from '../../hooks/use-create-event-wizard';
import { CreateEventStepper } from './CreateEventStepper';
import { EventPhotoUploader } from './EventPhotoUploader';
import { EventPreviewPanel } from './EventPreviewPanel';
import { EventInfoStep } from './steps/EventInfoStep';
import { EventLocationStep } from './steps/EventLocationStep';
import { EventProductionStep } from './steps/EventProductionStep';
import { EventStreamStep } from './steps/EventStreamStep';
import { EventTicketsStep } from './steps/EventTicketsStep';
import type { EventResponse } from '../../types/event.types';
import styles from './CreateEventForm.module.scss';

interface Props {
  onSuccess?: (event: EventResponse) => void;
}

export function CreateEventForm({ onSuccess }: Props) {
  const t = useTranslations('createEvent');
  const { data: orgs = [] } = useMyOrganizationsQuery();

  const { register, control, handleSubmit, trigger, formState: { errors } } = useForm<CreateEventFormValues>({
    resolver: zodResolver(createEventSchema),
    defaultValues: { camerasCount: 1 },
  });

  const wizard = useCreateEventWizard(onSuccess);
  const {
    step, setStep, tickets, setTickets, ticketsError,
    streamConfig, setStreamConfig, createdEvent, mutation,
  } = wizard;

  const stepContent: Record<number, React.ReactNode> = {
    1: <EventInfoStep register={register} errors={errors} orgs={orgs} />,
    2: <EventLocationStep register={register} errors={errors} control={control} />,
    3: <EventProductionStep register={register} errors={errors} />,
    4: <EventStreamStep value={streamConfig} onChange={setStreamConfig} />,
    5: (
      <EventTicketsStep
        tickets={tickets}
        onTicketsChange={setTickets}
        ticketsError={ticketsError}
        mutationError={mutation.error?.message ?? null}
      />
    ),
  };

  if (step === 6 && createdEvent) {
    return (
      <>
        <CreateEventStepper current={6} />
        <EventPhotoUploader event={createdEvent} onDone={wizard.finish} />
      </>
    );
  }

  return (
    <div className={styles.wizard}>
      <CreateEventStepper current={step} onNavigate={setStep} />

      <div className={styles.layout}>
        <form onSubmit={handleSubmit(wizard.submit)} className={styles.form}>
          {stepContent[step]}

          <div className={styles.navRow}>
            {step > 1 && (
              <button type="button" onClick={wizard.back} className={styles.btnBack}>
                <ChevronLeft size={16} /> {t('nav.back')}
              </button>
            )}

            <div className={styles.navSpacer} />

            {step < 5 && (
              <button type="button" onClick={() => wizard.advance(trigger)} className={styles.btnNext}>
                {t('nav.next')} <ChevronRight size={16} />
              </button>
            )}

            {step === 5 && (
              <button type="submit" className={styles.btnNext} disabled={mutation.isPending}>
                {mutation.isPending ? t('nav.creating') : t('nav.create')}
              </button>
            )}
          </div>
        </form>

        <div className={styles.previewCol}>
          <EventPreviewPanel control={control} orgs={orgs} tickets={tickets} />
        </div>
      </div>
    </div>
  );
}
