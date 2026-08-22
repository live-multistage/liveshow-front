'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Video } from 'lucide-react';
import { useTranslations } from 'next-intl';
import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@live-show/design-system';
import { ChannelForm } from './ChannelForm';
import { SubscriptionSummaryCard } from './SubscriptionSummaryCard';
import { useChannelQuery, useOrgChannelQuery } from '../../queries/channel.queries';
import {
  useArchiveChannelMutation,
  usePublishChannelMutation,
  useSyncChannelPricingMutation,
} from '../../mutations/channel.mutations';
import { ProgramGridEditor } from './ProgramGridEditor';
import { ChannelOnAirPanel } from './ChannelOnAirPanel';
import styles from './ChannelDetailContent.module.scss';

interface Props {
  slug: string;
}

export function ChannelDetailContent({ slug }: Props) {
  const t = useTranslations('channels');
  const tPricing = useTranslations('channels.dashboard.pricing');
  const tCommon = useTranslations('common');
  const { data: channel, isLoading } = useChannelQuery(slug);
  const publish = usePublishChannelMutation();
  const archive = useArchiveChannelMutation();
  const syncPricing = useSyncChannelPricingMutation();
  const [editing, setEditing] = useState(false);

  // A resposta pública (getBySlug) não traz preço/estado de sincronização nem
  // o override manual de fonte — só a rota org-only por id tem esses campos,
  // então o card de assinatura e o painel "No ar agora" pegam de lá.
  const { data: orgChannel } = useOrgChannelQuery(channel?.id ?? '', {
    enabled: Boolean(channel),
  });

  if (!channel)
    return <p className={styles.state}>{tCommon(isLoading ? 'loading' : 'notFound')}</p>;

  // As três mutations invalidam por slug + organização, então o alvo vai
  // completo em toda ação.
  const target = { id: channel.id, slug: channel.slug, organizationId: channel.organizationId };
  const isSubscription = channel.accessMode === 'SUBSCRIPTION';

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.identity}>
          <h1 className={styles.name}>{channel.name}</h1>
          <Badge variant="outline">{t(`dashboard.status.${channel.status}`)}</Badge>
          {isSubscription && orgChannel !== undefined && (
            <Badge variant={orgChannel.pricingSynced ? 'default' : 'secondary'}>
              {orgChannel.pricingSynced
                ? tPricing('syncStatusSynced')
                : tPricing('syncStatusPending')}
            </Badge>
          )}
          {channel.isOnAir && (
            <span className={styles.onAir}>
              <span className={styles.onAirDot} />
              {t('onAir')}
            </span>
          )}
        </div>

        <div className={styles.actions}>
          <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
            {t('dashboard.edit')}
          </Button>
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
          {isSubscription && orgChannel !== undefined && !orgChannel.pricingSynced && (
            <Button
              size="sm"
              variant="outline"
              disabled={syncPricing.isPending}
              onClick={() => syncPricing.mutate(target)}
            >
              {syncPricing.isPending ? tPricing('syncing') : tPricing('syncButton')}
            </Button>
          )}
          {/* O container do canal não aparece em /events (é format=CHANNEL), então
              o seletor de streams não sabe o nome dele — mandamos junto na URL. */}
          <Link
            className={styles.camerasLink}
            href={`/dashboard/streams?eventId=${channel.broadcastEventId}&title=${encodeURIComponent(channel.name)}`}
          >
            <Video size={14} />
            {t('dashboard.configureCameras')}
          </Link>
        </div>
      </header>

      {isSubscription && (
        <SubscriptionSummaryCard channelId={channel.id} currency={orgChannel?.currency ?? null} />
      )}

      <ChannelOnAirPanel
        channelId={channel.id}
        slug={channel.slug}
        organizationId={channel.organizationId}
        source={channel.source}
        sourceOverride={orgChannel?.sourceOverride ?? null}
      />

      <ProgramGridEditor
        channelId={channel.id}
        slug={channel.slug}
        organizationId={channel.organizationId}
        timezone={channel.timezone}
        status={channel.status}
      />

      <Dialog open={editing} onOpenChange={setEditing}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('dashboard.edit')}</DialogTitle>
          </DialogHeader>
          <ChannelForm mode="edit" initial={orgChannel ?? channel} onDone={() => setEditing(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
