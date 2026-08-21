'use client';

import Link from 'next/link';
import { Video } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Badge, Button } from '@live-show/design-system';
import { useChannelQuery } from '../../queries/channel.queries';
import {
  useArchiveChannelMutation,
  usePublishChannelMutation,
} from '../../mutations/channel.mutations';
import { ProgramGridEditor } from './ProgramGridEditor';
import styles from './ChannelDetailContent.module.scss';

interface Props {
  slug: string;
}

export function ChannelDetailContent({ slug }: Props) {
  const t = useTranslations('channels');
  const tCommon = useTranslations('common');
  const { data: channel, isLoading } = useChannelQuery(slug);
  const publish = usePublishChannelMutation();
  const archive = useArchiveChannelMutation();

  if (!channel)
    return <p className={styles.state}>{tCommon(isLoading ? 'loading' : 'notFound')}</p>;

  // As três mutations invalidam por slug + organização, então o alvo vai
  // completo em toda ação.
  const target = { id: channel.id, slug: channel.slug, organizationId: channel.organizationId };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.identity}>
          <h1 className={styles.name}>{channel.name}</h1>
          <Badge variant="outline">{t(`dashboard.status.${channel.status}`)}</Badge>
          {channel.isOnAir && (
            <span className={styles.onAir}>
              <span className={styles.onAirDot} />
              {t('onAir')}
            </span>
          )}
        </div>

        <div className={styles.actions}>
          {channel.status !== 'PUBLISHED' && (
            <Button size="sm" disabled={publish.isPending} onClick={() => publish.mutate(target)}>
              {t('dashboard.publish')}
            </Button>
          )}
          {channel.status !== 'ARCHIVED' && (
            <Button
              size="sm"
              variant="outline"
              disabled={archive.isPending}
              onClick={() => archive.mutate(target)}
            >
              {t('dashboard.archive')}
            </Button>
          )}
          <Link
            className={styles.camerasLink}
            href={`/dashboard/streams?eventId=${channel.broadcastEventId}`}
          >
            <Video size={14} />
            {t('dashboard.configureCameras')}
          </Link>
        </div>
      </header>

      <ProgramGridEditor channelId={channel.id} slug={channel.slug} />
    </div>
  );
}
