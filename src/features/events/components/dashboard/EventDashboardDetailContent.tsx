'use client';

import { useState } from 'react';
import { MapPin, ArrowLeft, ScanLine } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useGetEventQuery, useListTicketProductsQuery } from '../../queries/get-event';
import { useMyOrganizationsQuery } from '@/features/organizations/queries/get-my-organizations';
import { canManageOrg } from '@/features/organizations/types/organization.types';
import { useUpdateEventMutation } from '../../mutations/update-event.mutation';
import { usePublishEventMutation, useUnpublishEventMutation, useFinishEventMutation, useResumeLiveMutation } from '../../mutations/publish-event.mutation';
import { EventHeaderActions } from './EventHeaderActions';
import { LibrasAccessibilityPanel } from './LibrasAccessibilityPanel';
import { useAccessibilityQuery } from '../../queries/get-accessibility';
import { EventEditForm, editSchema } from './EventEditForm';
import type { EditFormValues } from './EventEditForm';
import { EventInfoGrid } from './EventInfoGrid';
import { EventTicketList } from './EventTicketList';
import { EditTicketSection } from './EditTicketSection';
import { PhotosSection } from './PhotosSection';
import { EventCollaboratorsSection } from './EventCollaboratorsSection';
import { VodUploadCard } from '../VodUploadCard/VodUploadCard';
import { EventMetadataSection } from '@/features/metadata';
import type { EventResponse } from '../../types/event.types';
import styles from './EventDashboardDetailContent.module.scss';

function toDatetimeLocal(iso: string) {
  return new Date(iso).toISOString().slice(0, 16);
}

interface Props {
  id: string;
  initialEvent?: EventResponse;
  // Server-resolved vod_upload feature flag. Off at launch → the upload card is
  // hidden entirely. Resolved on the server (flags never resolve client-side).
  vodUploadEnabled?: boolean;
}

export function EventDashboardDetailContent({ id, initialEvent, vodUploadEnabled = false }: Props) {
  const t = useTranslations('eventDetail');
  const [editing, setEditing] = useState(false);

  const { data: event, isLoading, isError } = useGetEventQuery(id, initialEvent);
  const { data: tickets = [] } = useListTicketProductsQuery(id);

  // GET /events/:id is public — it serves any non-DRAFT event to anyone — so it
  // proves nothing about ownership. Every mutation below is gated server-side on
  // orgRepo.findMember(...).isAdmin(); mirror that gate on the view so a stranger
  // doesn't get a management UI whose every button 403s. Fails closed: a 401/error
  // on /organizations/mine leaves the list empty and denies.
  const { data: myOrgs = [], isLoading: orgsLoading } = useMyOrganizationsQuery();
  const canManage = myOrgs.some((o) => o.id === event?.organizationId && canManageOrg(o.role));

  const updateMutation = useUpdateEventMutation(id);
  const publishMutation = usePublishEventMutation(id);
  const unpublishMutation = useUnpublishEventMutation(id);
  const finishMutation = useFinishEventMutation(id);
  const resumeLiveMutation = useResumeLiveMutation(id);
  const { data: accessibility } = useAccessibilityQuery(id, !!event?.publiclyFunded);
  // Publicly-funded events can't publish until the NBR 15290 gate is satisfied.
  // Default to blocked while the status is still loading (avoids a 400 round-trip).
  const publishBlocked = !!event?.publiclyFunded && !accessibility?.publishable;

  const { register, control, handleSubmit, reset, formState: { errors } } = useForm<EditFormValues>({
    resolver: zodResolver(editSchema),
  });

  function startEditing() {
    if (!event) return;
    reset({
      title: event.title,
      description: event.description,
      startsAt: toDatetimeLocal(event.startsAt),
      endsAt: toDatetimeLocal(event.endsAt),
      latencyMode: event.latencyMode ?? 'STANDARD',
      publiclyFunded: event.publiclyFunded ?? false,
    });
    setEditing(true);
  }

  function cancelEditing() {
    setEditing(false);
    reset();
  }

  async function onSave(values: EditFormValues) {
    await updateMutation.mutateAsync({
      title: values.title,
      description: values.description,
      startsAt: new Date(values.startsAt).toISOString(),
      endsAt: new Date(values.endsAt).toISOString(),
      latencyMode: values.latencyMode,
      publiclyFunded: values.publiclyFunded,
    });
    setEditing(false);
  }

  if (isLoading || orgsLoading) {
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

  if (!canManage) {
    return (
      <div className={styles.centered}>
        <p className={styles.notFound}>{t('noAccess')}</p>
        <Link href="/dashboard/events" className={styles.backLink}>
          {t('backLink')}
        </Link>
      </div>
    );
  }

  const location = [event.venue, event.city, event.country].filter(Boolean).join(', ');
  // Collaborator orgs get read-only access: backend 403s every mutation, so
  // hide the buttons that would trigger them instead of showing dead ones.
  const readOnly = event.collaborationRole === 'COLLABORATOR';

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <Link href="/dashboard/events" className={styles.back}>
          <ArrowLeft size={16} /> {t('back')}
        </Link>

        {tickets.some((tk) => tk.capabilities.includes('PHYSICAL_ENTRY')) && (
          <Link href={`/checkin/${id}`} className={styles.back}>
            <ScanLine size={16} /> Check-in
          </Link>
        )}

        <EventHeaderActions
          event={event}
          editing={editing}
          isSaving={updateMutation.isPending}
          isPublishing={publishMutation.isPending}
          isUnpublishing={unpublishMutation.isPending}
          isFinishing={finishMutation.isPending}
          isResuming={resumeLiveMutation.isPending}
          publishBlocked={publishBlocked}
          readOnly={readOnly}
          onEdit={startEditing}
          onCancelEdit={cancelEditing}
          onSave={handleSubmit(onSave)}
          onPublish={() => publishMutation.mutate()}
          onUnpublish={() => unpublishMutation.mutate()}
          onFinish={() => finishMutation.mutate()}
          onResumeLive={async () => { await resumeLiveMutation.mutateAsync(); }}
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
        {event.publiclyFunded && <LibrasAccessibilityPanel eventId={id} />}

        {event.format === 'VOD' && vodUploadEnabled && <VodUploadCard eventId={id} />}

        {editing ? (
          <>
            <EventEditForm
              register={register}
              control={control}
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

        <EventCollaboratorsSection eventId={id} readOnly={readOnly} />
      </div>
    </div>
  );
}
