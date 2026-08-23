'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@live-show/design-system';
import { ChannelForm } from './ChannelForm';
import { ChannelHeader } from './ChannelHeader';
import { ChannelReadinessCard } from './ChannelReadinessCard';
import { ChannelOnAirPanel } from './ChannelOnAirPanel';
import { ProgramWeekGrid } from './ProgramWeekGrid';
import { ChannelSubscriptionCard } from './ChannelSubscriptionCard';
import { ChannelCamerasCard } from './ChannelCamerasCard';
import { ChannelDetailsCard } from './ChannelDetailsCard';
import {
  useChannelQuery,
  useChannelProgramsQuery,
  useOrgChannelQuery,
} from '../../queries/channel.queries';
import { usePublishChannelMutation } from '../../mutations/channel.mutations';
import { useChannelCameras } from '../../hooks/useChannelCameras';
import { useChannelReadiness } from '../../hooks/useChannelReadiness';
import styles from './ChannelDetail.module.scss';

interface Props {
  slug: string;
}

const CHANNELS_HREF = '/dashboard/channels';

export function ChannelDetailContent({ slug }: Props) {
  const t = useTranslations('channels.detail');
  const tCommon = useTranslations('common');
  const { data: channel, isLoading } = useChannelQuery(slug);
  const publish = usePublishChannelMutation();
  const [editing, setEditing] = useState(false);

  // A resposta pública (getBySlug) não traz preço/estado de sincronização nem
  // o override manual de fonte — só a rota org-only por id tem esses campos,
  // então o card de assinatura e o painel "No ar agora" pegam de lá.
  const { data: orgChannel } = useOrgChannelQuery(channel?.id ?? '', {
    enabled: Boolean(channel),
  });
  const { data: programs = [] } = useChannelProgramsQuery(channel?.id ?? '');
  const { cameras, withSignal } = useChannelCameras(channel?.broadcastEventId ?? '');

  const readiness = useChannelReadiness({
    accessMode: channel?.accessMode ?? 'FREE',
    pricingSynced: Boolean(orgChannel?.pricingSynced),
    cameraCount: cameras.length,
    programCount: programs.length,
  });

  if (!channel)
    return <p className={styles.state}>{tCommon(isLoading ? 'loading' : 'notFound')}</p>;

  const isSubscription = channel.accessMode === 'SUBSCRIPTION';
  const camerasHref = `/dashboard/streams?eventId=${channel.broadcastEventId}&title=${encodeURIComponent(channel.name)}`;

  return (
    <div className={styles.page}>
      <nav className={styles.breadcrumb} aria-label={t('breadcrumb')}>
        <Link className={styles.breadcrumbLink} href={CHANNELS_HREF}>
          {t('breadcrumb')}
        </Link>
        <span aria-hidden="true">/</span>
        <span className={styles.breadcrumbCurrent} aria-current="page">
          {channel.name}
        </span>
      </nav>

      <ChannelHeader
        channel={channel}
        canPublish={readiness.ready}
        isPublishing={publish.isPending}
        onEdit={() => setEditing(true)}
        onPublish={() =>
          publish.mutate({
            id: channel.id,
            slug: channel.slug,
            organizationId: channel.organizationId,
          })
        }
      />

      {/* Só interessa enquanto o canal ainda não foi publicado. */}
      {channel.status === 'DRAFT' && (
        <ChannelReadinessCard
          readiness={readiness}
          isSubscription={isSubscription}
          cameraCount={cameras.length}
          camerasWithSignal={withSignal}
          programCount={programs.length}
        />
      )}

      <div className={styles.layout}>
        <div className={styles.main}>
          <ChannelOnAirPanel
            channelId={channel.id}
            slug={channel.slug}
            organizationId={channel.organizationId}
            source={channel.source}
            sourceOverride={orgChannel?.sourceOverride ?? null}
            isOnAir={channel.isOnAir}
          />

          <ProgramWeekGrid
            channelId={channel.id}
            slug={channel.slug}
            organizationId={channel.organizationId}
            timezone={channel.timezone}
            status={channel.status}
          />
        </div>

        <aside className={styles.rail}>
          {isSubscription && (
            <ChannelSubscriptionCard
              channelId={channel.id}
              slug={channel.slug}
              organizationId={channel.organizationId}
              orgChannel={orgChannel}
            />
          )}
          <ChannelCamerasCard cameras={cameras} manageHref={camerasHref} />
          <ChannelDetailsCard channel={channel} />
        </aside>
      </div>

      <Dialog open={editing} onOpenChange={setEditing}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('editTitle')}</DialogTitle>
          </DialogHeader>
          <ChannelForm initial={orgChannel ?? channel} onDone={() => setEditing(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
