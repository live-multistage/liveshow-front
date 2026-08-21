'use client';

import { useTranslations } from 'next-intl';
import { useAuth } from '@/features/account/hooks/use-auth';
import { LiveGateLoading } from '@/features/streaming/components/LiveGateLoading';
import { LiveNoAccess } from '@/features/streaming/components/LiveNoAccess';
import {
  useLiveAccessQuery,
  useLivePlaybackQuery,
} from '@/features/streaming/queries/live.queries';
import { NotFoundContent } from '@/shared/components/NotFoundContent';
import { useChannelQuery } from '../queries/channel.queries';
import { ChannelPlayer } from './ChannelPlayer';
import { OffAirOverlay } from './OffAirOverlay';
import styles from './OffAirOverlay.module.scss';

interface Props {
  slug: string;
  chatEnabled: boolean;
}

export function ChannelGate({ slug, chatEnabled }: Props) {
  const t = useTranslations('liveGate');
  const { isLoggedIn, isLoading: authLoading } = useAuth();
  const channel = useChannelQuery(slug);

  const eventId = channel.data?.broadcastEventId ?? '';
  // Canal aberto não passa pelo check de direito: a verificação é JWT-only e
  // recusaria um visitante deslogado que tem acesso legítimo.
  const isFree = channel.data?.accessMode === 'FREE';
  const access = useLiveAccessQuery(eventId, !!eventId && !isFree && !authLoading);
  const authorized = isFree || access.data === true;

  const playback = useLivePlaybackQuery(eventId, !!eventId && authorized);

  if (channel.isLoading) return <LiveGateLoading message={t('checkingAccess')} />;
  if (channel.isError || !channel.data) return <NotFoundContent />;

  if (!isFree && (authLoading || access.isLoading)) {
    return <LiveGateLoading message={t('checkingAccess')} />;
  }

  if (!authorized) {
    return <LiveNoAccess eventId={eventId} eventTitle={channel.data.name} isLoggedIn={isLoggedIn} />;
  }

  if (playback.isLoading) {
    return <LiveGateLoading message={t('loadingStream')} eventTitle={channel.data.name} />;
  }

  const hasStream = !!playback.data?.live || (playback.data?.stages?.length ?? 0) > 0;

  return (
    <div className={styles.stage}>
      {playback.data && hasStream && (
        <ChannelPlayer channel={channel.data} playback={playback.data} chatEnabled={chatEnabled} />
      )}

      {/* Sem stream resolvido o canal está, na prática, fora do ar — a grade
          diverge da transmissão de vez em quando e o espectador vê o mesmo. */}
      {(!channel.data.isOnAir || !hasStream) && <OffAirOverlay next={channel.data.next} />}
    </div>
  );
}
