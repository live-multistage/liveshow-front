'use client';

import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { LivePlayer } from '@/features/streaming/components/LivePlayer';
import type { PlayerAudioState } from '@/features/streaming/hooks/use-player-audio';
import type { ChannelPlaybackResponse, PublicChannel } from '../types/channel.types';
import { NowPlayingBadge } from './NowPlayingBadge';

interface Props {
  channel: PublicChannel;
  playback: ChannelPlaybackResponse;
  chatEnabled: boolean;
  // Repassado ao container do player para que sobreviva ao fullscreen.
  overlay?: ReactNode;
  // Held by ChannelGate (above this remount boundary) so mute/volume survive
  // the key change below when the simulcast source switches.
  initialAudio?: PlayerAudioState;
  onAudioChange?: (audio: PlayerAudioState) => void;
}

const EMPTY = '—';

// O canal reusa o player ao vivo inteiro; o que muda é a variante (sem
// controles de playback) e a linha de meta, que vira a programação.
export function ChannelPlayer({
  channel,
  playback,
  chatEnabled,
  overlay,
  initialAudio,
  onAudioChange,
}: Props) {
  const t = useTranslations();
  const { source } = playback;

  const metaLine = [
    `${t('channels.now')} · ${channel.current?.name ?? EMPTY}`,
    `${t('channels.next')} ${channel.next?.name ?? EMPTY}`,
  ].join('  ·  ');

  // Cameras/stages/manifests are all tied to whatever event is currently
  // playing — keying on the resolved source forces a full remount (fresh HLS
  // attach, camera selection reset) when the channel switches feeds, instead
  // of the player trying to hot-swap a still-mounted <video>.
  const sourceKey = `${source.mode}:${source.event?.id ?? ''}`;

  return (
    <LivePlayer
      key={sourceKey}
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
      initialAudio={initialAudio}
      onAudioChange={onAudioChange}
      overlay={
        <>
          {overlay}
          {source.mode === 'event' && source.event && (
            <NowPlayingBadge event={source.event} />
          )}
        </>
      }
    />
  );
}
