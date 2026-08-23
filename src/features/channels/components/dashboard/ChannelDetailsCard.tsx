'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@live-show/design-system';
import { useMyOrganizationsQuery } from '@/features/organizations/queries/get-my-organizations';
import { useArchiveChannelMutation } from '../../mutations/channel.mutations';
import type { PublicChannel } from '../../types/channel.types';
import styles from './ChannelDetail.module.scss';

interface Props {
  channel: PublicChannel;
}

export function ChannelDetailsCard({ channel }: Props) {
  const t = useTranslations('channels.detail');
  const tDetails = useTranslations('channels.detail.details');
  const locale = useLocale();
  const archive = useArchiveChannelMutation();
  const [confirming, setConfirming] = useState(false);
  const { data: organizations = [] } = useMyOrganizationsQuery();

  const organization = organizations.find((org) => org.id === channel.organizationId);

  const createdAt = new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(channel.createdAt));

  const confirmArchive = () => {
    archive.mutate({
      id: channel.id,
      slug: channel.slug,
      organizationId: channel.organizationId,
    });
    setConfirming(false);
  };

  return (
    <section className={styles.railCard}>
      <span className={styles.eyebrow}>{tDetails('eyebrow')}</span>

      <div className={styles.railRows}>
        <div className={styles.railRow}>
          <span>{tDetails('organization')}</span>
          <span className={styles.railRowValue}>{organization?.name ?? '—'}</span>
        </div>
        <div className={styles.railRow}>
          <span>{tDetails('createdAt')}</span>
          <span className={styles.railRowValue}>{createdAt}</span>
        </div>
        <div className={styles.railRow}>
          <span>{tDetails('replay')}</span>
          <span className={styles.railRowValue}>{tDetails('replayValue')}</span>
        </div>
      </div>

      {channel.status !== 'ARCHIVED' && (
        <button
          type="button"
          className={styles.dangerLink}
          disabled={archive.isPending}
          onClick={() => setConfirming(true)}
        >
          {tDetails('archive')}
        </button>
      )}

      <Dialog open={confirming} onOpenChange={setConfirming}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('archiveConfirmTitle', { name: channel.name })}</DialogTitle>
            <DialogDescription>{t('archiveConfirmBody')}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirming(false)}>
              {t('cancel')}
            </Button>
            <Button variant="destructive" onClick={confirmArchive}>
              {t('confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
