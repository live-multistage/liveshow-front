'use client';

import { useState } from 'react';
import { isAxiosError } from 'axios';
import { ArrowLeft, ScanLine, Check, Copy, Calendar, Clock, Camera, Music, FileText } from 'lucide-react';
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
import { formatDate, formatTime, formatDuration } from '../../utils/event-formatters';
import { eventHref, publicOrigin } from '../../utils/slug';
import type { EventResponse } from '../../types/event.types';
import styles from './EventDashboardDetailContent.module.scss';

const STATUS_MOD: Record<string, string> = {
  DRAFT: styles.statusDraft, PUBLISHED: styles.statusPublished, SCHEDULED: styles.statusPublished,
  LIVE: styles.statusLive, FINISHED: styles.statusFinished, CANCELLED: styles.statusCancelled,
};

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
  // A COLLABORATOR org is let in too (server-derived on the event payload), but
  // strictly for the read-only view below — write actions stay gated on `readOnly`.
  const { data: myOrgs = [], isLoading: orgsLoading } = useMyOrganizationsQuery();
  const canManage =
    event?.collaborationRole === 'COLLABORATOR' ||
    myOrgs.some((o) => o.id === event?.organizationId && canManageOrg(o.role));

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
      slug: event.slug,
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

  // FINISHED events accept content edits only; the datetime-local round-trip
  // loses seconds, so re-sending the schedule would read as a change and 400.
  const scheduleLocked = event?.status === 'FINISHED';

  async function onSave(values: EditFormValues) {
    await updateMutation.mutateAsync({
      // Omitted when unchanged, so an edit that only touches copy never depends
      // on the slug uniqueness check at all.
      ...(values.slug === event?.slug ? {} : { slug: values.slug }),
      title: values.title,
      description: values.description,
      publiclyFunded: values.publiclyFunded,
      ...(scheduleLocked ? {} : {
        startsAt: new Date(values.startsAt).toISOString(),
        endsAt: new Date(values.endsAt).toISOString(),
        latencyMode: values.latencyMode,
      }),
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

  // 409 is the one save failure with a field to blame — surface it on the slug
  // input instead of the generic banner, which reads as "something broke".
  const slugTaken = isAxiosError(updateMutation.error) && updateMutation.error.response?.status === 409;
  // Collaborator orgs get read-only access: backend 403s every mutation, so
  // hide the buttons that would trigger them instead of showing dead ones.
  const readOnly = event.collaborationRole === 'COLLABORATOR';
  const hasPhysicalEntry = tickets.some((tk) => tk.capabilities.includes('PHYSICAL_ENTRY'));

  return (
    <div className={styles.page}>
      {/* top bar */}
      <div className={styles.topbar}>
        <Link href="/dashboard/events" className={styles.back}>
          <ArrowLeft size={16} /> {t('back')}
        </Link>
        {hasPhysicalEntry && (
          <Link href={`/checkin/${id}`} className={styles.back}>
            <ScanLine size={16} /> Check-in
          </Link>
        )}
        <span className={styles.spacer} />
        <EventHeaderActions
          event={event}
          editing={editing}
          hideStatus
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

      {/* header row: poster + eyebrow / status / title / chips */}
      <div className={styles.headerRow}>
        <div className={styles.poster}>
          {event.bannerUrl
            ? <img src={event.bannerUrl} alt={event.title} className={styles.posterImg} />
            : <span className={styles.posterGlyph}><Music size={34} strokeWidth={1.6} /></span>}
        </div>
        <div className={styles.headerMeta}>
          <div className={styles.eyebrowRow}>
            <span className={styles.eyebrow}>{t('eyebrow')}</span>
            <span className={`${styles.status} ${STATUS_MOD[event.status]}`}>
              <span className={styles.statusDot} />
              {t(`status.${event.status}`)}
            </span>
          </div>
          <h1 className={styles.title}>{event.title}</h1>
          <div className={styles.chips}>
            <span className={styles.chip}><Calendar size={13} /> {formatDate(event.startsAt)}</span>
            <span className={styles.chip}>
              <Clock size={13} /> {formatTime(event.startsAt)} · {formatDuration(event.startsAt, event.endsAt)}
            </span>
            <span className={styles.chip}><Camera size={13} /> {t('cameras', { count: event.camerasCount })}</span>
          </div>
        </div>
      </div>

      {event.publiclyFunded && <LibrasAccessibilityPanel eventId={id} />}
      {event.format === 'VOD' && vodUploadEnabled && <VodUploadCard eventId={id} />}

      {editing ? (
        <div className={styles.editWrap}>
          <EventEditForm
            register={register}
            control={control}
            errors={errors}
            isPending={updateMutation.isPending}
            slugError={slugTaken ? t('slugTaken') : undefined}
            // The 409 describes the value that was rejected; the moment it's
            // edited the message is stale, so drop it.
            onSlugChange={slugTaken ? () => updateMutation.reset() : undefined}
            errorMessage={slugTaken ? undefined : updateMutation.error?.message}
            scheduleLocked={scheduleLocked}
          />
          <EditTicketSection eventId={id} tickets={tickets} />
          <PhotosSection event={event} />
          <EventMetadataSection eventId={id} readOnly={readOnly} />
          <EventCollaboratorsSection eventId={id} readOnly={readOnly} />
        </div>
      ) : (
        <div className={styles.grid}>
          <div className={styles.leftCol}>
            <PublicUrlRow event={event} label={t('publicUrl')} copyLabel={t('copyUrl')} copiedLabel={t('copied')} />
            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>{t('description')}</h2>
              {event.description
                ? <p className={styles.description}>{event.description}</p>
                : (
                  <div className={styles.emptyState}>
                    <FileText size={17} strokeWidth={1.8} />
                    <span>{t('descriptionEmpty')}</span>
                  </div>
                )}
            </div>
            <EventMetadataSection eventId={id} readOnly={readOnly} />
            <EventTicketList tickets={tickets} />
            <EventCollaboratorsSection eventId={id} readOnly={readOnly} />
          </div>

          <aside className={styles.rail}>
            <div className={styles.railCard}>
              <div className={styles.railHead}>{t('detailsTitle')}</div>
              <EventInfoGrid event={event} ticketCount={tickets.length} />
            </div>

            <div className={styles.checklist}>
              <div className={styles.checklistHead}>{t('checklistTitle')}</div>
              <ul className={styles.checklistItems}>
                <ChecklistItem done label={t('checklistDate')} step={1} />
                <ChecklistItem done={tickets.length > 0} label={t('checklistTicket')} step={2} />
                <ChecklistItem done={!!event.description} label={t('checklistDescription')} step={3} />
              </ul>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}

function ChecklistItem({ done, label, step }: { done: boolean; label: string; step: number }) {
  return (
    <li className={styles.checklistItem}>
      <span className={`${styles.checkMark} ${done ? styles.checkMarkDone : ''}`}>
        {done ? <Check size={12} strokeWidth={3} /> : step}
      </span>
      <span className={done ? styles.checkTextDone : styles.checkText}>{label}</span>
    </li>
  );
}

function PublicUrlRow({ event, label, copyLabel, copiedLabel }: {
  event: EventResponse;
  label: string;
  copyLabel: string;
  copiedLabel: string;
}) {
  const [copied, setCopied] = useState(false);
  const url = `${publicOrigin()}${eventHref(event)}`;

  async function copy() {
    // clipboard is unavailable over plain http and in some embedded webviews;
    // failing silently beats throwing an unhandled rejection at the organizer.
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignored — the URL is on screen and selectable
    }
  }

  return (
    <div className={styles.publicUrlRow}>
      <span className={styles.publicUrlLabel}>{label}</span>
      <code className={styles.publicUrlValue}>{url}</code>
      <button type="button" onClick={copy} className={styles.publicUrlCopy} aria-live="polite">
        {copied ? <Check size={14} /> : <Copy size={14} />}
        {copied ? copiedLabel : copyLabel}
      </button>
    </div>
  );
}
