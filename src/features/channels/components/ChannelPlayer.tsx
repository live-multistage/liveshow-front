'use client';

import { useTranslations } from 'next-intl';
import { LivePlayer } from '@/features/streaming/components/LivePlayer';
import type { LivePlaybackResponse } from '@/features/streaming/types/live.types';
import type { PublicChannel } from '../types/channel.types';

interface Props {
  channel: PublicChannel;
  playback: LivePlaybackResponse;
  chatEnabled: boolean;
}

const EMPTY = '—';

// O canal reusa o player ao vivo inteiro; o que muda é a variante (sem
// controles de playback) e a linha de meta, que vira a programação.
export function ChannelPlayer({ channel, playback, chatEnabled }: Props) {
  const t = useTranslations();

  const metaLine = [
    `${t('channels.now')} · ${channel.current?.name ?? EMPTY}`,
    `${t('channels.next')} ${channel.next?.name ?? EMPTY}`,
  ].join('  ·  ');

  return (
    <LivePlayer
      variant="channel"
      eventId={channel.broadcastEventId}
      title={channel.name}
      metaLineOverride={metaLine}
      exitHref="/channels"
      cameras={playback.cameras}
      stages={playback.stages}
      primaryCameraId={playback.primaryCameraId}
      librasCameraId={playback.librasCameraId}
      chatEnabled={chatEnabled}
    />
  );
}
