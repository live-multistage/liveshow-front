'use client';

import { useState } from 'react';
import { MapPin, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useGetEventQuery, useListTicketProductsQuery } from '../../queries/get-event';
import { useUpdateEventMutation } from '../../mutations/update-event.mutation';
import { usePublishEventMutation, useUnpublishEventMutation, useFinishEventMutation } from '../../mutations/publish-event.mutation';
import { EventHeaderActions } from './EventHeaderActions';
import { EventEditForm, editSchema } from './EventEditForm';
import type { EditFormValues } from './EventEditForm';
import { EventInfoGrid } from './EventInfoGrid';
import { EventTicketList } from './EventTicketList';
import { EditTicketSection } from './EditTicketSection';
import { PhotosSection } from './PhotosSection';
import { EventMetadataSection } from '@/features/metadata';
import type { EventResponse } from '../../types/event.types';
import styles from './EventDashboardDetailContent.module.scss';

function toDatetimeLocal(iso: string) {
  return new Date(iso).toISOString().slice(0, 16);
}

interface Props {
  id: string;
  initialEvent?: EventResponse;
}

export function EventDashboardDetailContent({ id, initialEvent }: Props) {
  const t = useTranslations('eventDetail');
  const [editing, setEditing] = useState(false);

  const { data: event, isLoading, isError } = useGetEventQuery(id, initialEvent);
  const { data: tickets = [] } = useListTicketProductsQuery(id);

  const updateMutation = useUpdateEventMutation(id);
  const publishMutation = usePublishEventMutation(id);
  const unpublishMutation = useUnpublishEventMutation(id);
  const finishMutation = useFinishEventMutation(id);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<EditFormValues>({
    resolver: zodResolver(editSchema),
  });

  function startEditing() {
    if (!event) return;
    reset({
      title: event.title,
      description: event.description,
      startsAt: toDatetimeLocal(event.startsAt),
      endsAt: toDatetimeLocal(event.endsAt),
    });
    setEditing(true);
  }

  function cancelEditing() {
    setEditing(false);
    reset();
  }

  function onSave(values: EditFormValues) {
    updateMutation.mutate(
      {
        title: values.title,
        description: values.description,
        startsAt: new Date(values.startsAt).toISOString(),
        endsAt: new Date(values.endsAt).toISOString(),
      },
      { onSuccess: () => setEditing(false) },
    );
  }

  if (isLoading) {
    return <div className={styles.centered}><span className={styles.spinner} /></div>;
  }

  if (isError || !event) {
    return (
      <div className={styles.centered}>
        <p className={styles.notFound}>{t('notFound')}</p>
        <Link href="/dashboard/events" className={styles.backLink}>
          {t('backLink')}
        </Link>
      </div>
    );
  }

  const location = [event.venue, event.city, event.country].filter(Boolean).join(', ');

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <Link href="/dashboard/events" className={styles.back}>
          <ArrowLeft size={16} /> {t('back')}
        </Link>

        <EventHeaderActions
          event={event}
          editing={editing}
          isSaving={updateMutation.isPending}
          isPublishing={publishMutation.isPending}
          isUnpublishing={unpublishMutation.isPending}
          isFinishing={finishMutation.isPending}
          onEdit={startEditing}
          onCancelEdit={cancelEditing}
          onSave={handleSubmit(onSave)}
          onPublish={() => publishMutation.mutate()}
          onUnpublish={() => unpublishMutation.mutate()}
          onFinish={() => finishMutation.mutate()}
        />
      </div>

      <div className={styles.hero}>
        {event.bannerUrl
          ? <img src={event.bannerUrl} alt={event.title} className={styles.banner} />
          : <div className={styles.bannerPlaceholder} />}
        <div className={styles.heroOverlay}>
          <h1 className={styles.title}>{event.title}</h1>
          {location && <p className={styles.location}><MapPin size={14} /> {location}</p>}
        </div>
      </div>

      <div className={styles.body}>
        {editing ? (
          <>
            <EventEditForm
              register={register}
              errors={errors}
              isPending={updateMutation.isPending}
              errorMessage={updateMutation.error?.message}
            />
            <EditTicketSection eventId={id} tickets={tickets} />
            <PhotosSection event={event} />
          </>
        ) : (
          <>
            <EventInfoGrid event={event} ticketCount={tickets.length} />
            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>{t('description')}</h2>
              <p className={styles.description}>{event.description}</p>
            </div>
          </>
        )}

        {!editing && <EventTicketList tickets={tickets} />}

        <EventMetadataSection eventId={id} />
      </div>
    </div>
  );
}
