'use client';

import { useTranslations } from 'next-intl';
import { Calendar, Building2, Inbox } from 'lucide-react';
import { Badge, Button, Skeleton } from '@live-show/design-system';
import type { ArtistInvitationItem, LineupInvitationStatus } from '@live-show/api-contracts';
import { useArtistInvitations } from '../hooks/use-artists';
import { useRespondArtistInviteMutation } from '../mutations/artist.mutations';
import styles from './ArtistInvitationsInbox.module.scss';

interface Props {
  artistId: string;
}

function statusVariant(status: LineupInvitationStatus): 'default' | 'secondary' | 'destructive' {
  if (status === 'ACCEPTED') return 'default';
  if (status === 'DECLINED') return 'destructive';
  return 'secondary';
}

function InvitationRow({ invitation, artistId }: { invitation: ArtistInvitationItem; artistId: string }) {
  const t = useTranslations('artists.dashboard.invitations');
  const respondMutation = useRespondArtistInviteMutation(artistId);
  const { event, status } = invitation;

  const statusLabel: Record<LineupInvitationStatus, string> = {
    INVITED: t('pending'),
    ACCEPTED: t('accepted'),
    DECLINED: t('declined'),
  };

  const startsAt = new Date(event.startsAt).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  return (
    <div className={styles.row}>
      <div className={styles.poster}>
        {event.thumbnailUrl || event.bannerUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={event.thumbnailUrl ?? event.bannerUrl ?? ''} alt="" className={styles.posterImg} />
        ) : (
          <div className={styles.posterPlaceholder} />
        )}
      </div>

      <div className={styles.info}>
        <div className={styles.title}>{event.title}</div>
        <div className={styles.meta}>
          <span className={styles.metaItem}>
            <Calendar size={12} />
            {startsAt}
          </span>
          {event.organization && (
            <span className={styles.metaItem}>
              <Building2 size={12} />
              {event.organization.name}
            </span>
          )}
        </div>
      </div>

      <div className={styles.actions}>
        {status === 'INVITED' ? (
          <>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={respondMutation.isPending}
              onClick={() => respondMutation.mutate({ eventId: event.id, action: 'decline' })}
            >
              {t('decline')}
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={respondMutation.isPending}
              onClick={() => respondMutation.mutate({ eventId: event.id, action: 'accept' })}
            >
              {t('accept')}
            </Button>
          </>
        ) : (
          <Badge variant={statusVariant(status)}>{statusLabel[status]}</Badge>
        )}
      </div>
    </div>
  );
}

export function ArtistInvitationsInbox({ artistId }: Props) {
  const t = useTranslations('artists.dashboard.invitations');
  const { data: invitations, isLoading } = useArtistInvitations(artistId);

  if (isLoading) {
    return (
      <div className={styles.list}>
        <Skeleton className={styles.rowSkeleton} />
        <Skeleton className={styles.rowSkeleton} />
      </div>
    );
  }

  if (!invitations || invitations.length === 0) {
    return (
      <div className={styles.empty}>
        <Inbox size={22} className={styles.emptyIcon} />
        <p>{t('empty')}</p>
      </div>
    );
  }

  return (
    <div className={styles.list}>
      {invitations.map((invitation) => (
        <InvitationRow key={invitation.event.id} invitation={invitation} artistId={artistId} />
      ))}
    </div>
  );
}
