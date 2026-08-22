'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { useAuth } from '@/features/account/hooks/use-auth';
import { LiveGateLoading } from '@/features/streaming/components/LiveGateLoading';
import { LiveNoAccess } from '@/features/streaming/components/LiveNoAccess';
import {
  useLiveAccessQuery,
  useLivePlaybackQuery,
} from '@/features/streaming/queries/live.queries';
import { NotFoundContent } from '@/shared/components/NotFoundContent';
import { useChannelQuery } from '../queries/channel.queries';
import { useChannelAccess } from '../hooks/useChannelAccess';
import { ChannelPaywall } from './ChannelPaywall';
import { ChannelPlayer } from './ChannelPlayer';
import { OffAirOverlay } from './OffAirOverlay';
import styles from './OffAirOverlay.module.scss';

interface Props {
  slug: string;
  chatEnabled: boolean;
}

export function ChannelGate({ slug, chatEnabled }: Props) {
  const t = useTranslations('liveGate');
  const tSub = useTranslations('channels.subscription');
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isLoggedIn, isLoading: authLoading } = useAuth();
  const channel = useChannelQuery(slug);

  const eventId = channel.data?.broadcastEventId ?? '';
  // Canal aberto não passa pelo check de direito: a verificação é JWT-only e
  // recusaria um visitante deslogado que tem acesso legítimo.
  const isFree = channel.data?.accessMode === 'FREE';
  const access = useLiveAccessQuery(eventId, !!eventId && !isFree && !authLoading);
  const derivedAccess = useChannelAccess(channel.data, access.data === true);

  const playback = useLivePlaybackQuery(eventId, !!eventId && derivedAccess.authorized);

  // Volta do checkout do Stripe (?subscribed=1): confirma com um toast, tira
  // o parâmetro da URL e refaz as duas queries para refletir o novo direito.
  useEffect(() => {
    if (searchParams.get('subscribed') !== '1') return;
    toast.success(tSub('subscribed'));
    router.replace(`/channels/${slug}`);
    channel.refetch();
    access.refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  if (channel.isLoading) return <LiveGateLoading message={t('checkingAccess')} />;
  // Sem `isError`: um refetch de fundo que falha não apaga o `data` em cache,
  // e derrubar o player em 404 por causa dele tiraria o espectador do ar. Um
  // erro de primeira carga cai aqui de qualquer forma — `data` é undefined.
  if (!channel.data) return <NotFoundContent />;

  if (!isFree && (authLoading || access.isLoading)) {
    return <LiveGateLoading message={t('checkingAccess')} />;
  }

  if (derivedAccess.mode === 'paywall') {
    return <ChannelPaywall channel={channel.data} isLoggedIn={isLoggedIn} />;
  }

  if (!derivedAccess.authorized) {
    return <LiveNoAccess eventId={eventId} eventTitle={channel.data.name} isLoggedIn={isLoggedIn} />;
  }

  if (playback.isLoading) {
    return <LiveGateLoading message={t('loadingStream')} eventTitle={channel.data.name} />;
  }

  // O sinal de fora do ar é o `live` do playback (polling de 5 s), não o
  // `isOnAir` da grade (refetch de 60 s): a grade atrasa o encoder em até um
  // minuto nos dois sentidos, e as duas divergem quando a transmissão sai do
  // horário. O overlay entra dentro do player para sobreviver ao fullscreen.
  const offAir = !playback.data?.live;
  const overlay = offAir ? <OffAirOverlay next={channel.data.next} /> : null;

  if (!playback.data) return <div className={styles.stage}>{overlay}</div>;

  return (
    <ChannelPlayer
      channel={channel.data}
      playback={playback.data}
      chatEnabled={chatEnabled}
      overlay={overlay}
    />
  );
}
