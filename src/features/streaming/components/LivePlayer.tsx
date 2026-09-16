'use client';

import { useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { Volume2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { LiveCamera, LiveStage } from '../types/live.types';
import { Player, Transport } from './player';
import { LiveBadge } from './transport/LiveBadge';
import { liveScrubber } from './transport/live-scrubber';
import { ChatDock, ReactionsTicker, useChat } from '@/features/chat';
import { useAuth } from '@/features/account/hooks/use-auth';
import { useViewerTracking } from '../hooks/use-viewer-tracking';
import { useViewerCount } from '../hooks/use-viewer-count';
import type { PlayerAudioState } from '../hooks/use-player-audio';
import { useLiveDvr } from '../hooks/use-live-dvr';
import { usePlayerShell } from '../hooks/use-player-shell';
import styles from './Player.module.scss';

interface LivePlayerProps {
  cameras: LiveCamera[];
  stages?: LiveStage[];
  primaryCameraId?: string | null;
  // NBR 15290 — camera pinned as the mandatory Libras window (null if none).
  librasCameraId?: string | null;
  title: string;
  // Chat's room and the header/exit target — the channel passes its own
  // persistent broadcast event here, which doesn't move when a channel's
  // simulcast source switches.
  eventId: string;
  // Viewer tracking + viewer count follow what's actually on screen, which
  // for a channel is the resolved source (own feed or a carried event), not
  // the channel's own event — defaults to `eventId` for event/replay callers,
  // where the two are the same thing.
  trackingEventId?: string;
  chatEnabled: boolean;
  // Gates the pause-ad takeover — off must skip PauseAdTakeover entirely so
  // /ads/serve is never called, not just hide the result.
  adsEnabled?: boolean;
  // 'channel': transmissão contínua sem arquivo atrás da janela da origem —
  // não há o que pausar nem para onde rebobinar, então os controles de
  // playback (e o takeover de anúncio que depende deles) saem de cena.
  variant?: 'event' | 'channel';
  // Substitui a linha "palco · câmera · qualidade" do header — o canal mostra
  // a programação (agora / a seguir) nesse espaço.
  metaLineOverride?: string;
  exitHref?: string;
  // Camada opcional sobre o stage inteiro, dentro do elemento que vira
  // fullscreen — o overlay de fora do ar do canal some se ficar de fora dele.
  overlay?: ReactNode;
  // Seed for mute/volume and a way to hear about further changes — lets a
  // caller that remounts this component (the channel player, keyed on its
  // resolved source) preserve the viewer's audio choice across the remount
  // instead of resetting to unmuted/full volume. Undefined for the default
  // (event/replay) behaviour: starts unmuted at full volume, reports nothing.
  initialAudio?: PlayerAudioState;
  onAudioChange?: (audio: PlayerAudioState) => void;
}

// Live = the shared player shell + DVR, viewer tracking/count, chat and the
// "tap for sound" prompt.
export function LivePlayer({ cameras, stages, primaryCameraId, librasCameraId, title, eventId, trackingEventId, chatEnabled, adsEnabled = true, variant = 'event', metaLineOverride, exitHref, overlay, initialAudio, onAudioChange }: LivePlayerProps) {
  const t = useTranslations('player');
  const isChannel = variant === 'channel';
  const { user } = useAuth();
  // Set when the browser blocked unmuted autoplay → drives the "tap for sound"
  // prompt. Cleared for good on the first unmute (see effect below), so it never
  // reappears after the viewer has chosen.
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);

  const shell = usePlayerShell({
    cameras,
    stages,
    primaryCameraId,
    librasCameraId,
    // A live stream can be paused: the broadcast keeps going, so resuming picks
    // up where the viewer stopped — behind the live edge, inside the DVR window.
    initialPaused: false,
    playbackEnabled: !isChannel,
    initialAudio,
    onAudioChange,
    // Live seek commands are addressed to the camera they were issued for (see
    // CameraGrid, which filters on seekCommand.cameraId). endRewind is
    // belt-and-suspenders for that, and owns the intent flag.
    onMainCameraChange: () => endRewind(),
    // Deselecting the current main camera promotes a different one — a
    // scrub-back intent tagged for the old camera no longer applies.
    onMainDeselected: () => clearRewindIntent(),
    onStageChange: () => resetForStageChange(),
  });
  const { audio } = shell;
  const { dvr, dvrSeeking, seekCommand, atLive, handleProgress, handleSeek, endRewind, resetForStageChange, clearRewindIntent } =
    useLiveDvr(shell.effectiveMainCameraId);

  const effectiveTrackingEventId = trackingEventId ?? eventId;
  useViewerTracking(effectiveTrackingEventId, shell.activeCameraIds, user?.id);
  const { currentViewers } = useViewerCount(effectiveTrackingEventId);
  // Only open the SSE connection (and hit the recent-messages endpoint) when
  // chat is actually enabled for this event — see Task 7 addendum.
  const chat = useChat(chatEnabled ? eventId : null);

  // Once the viewer turns sound on, the autoplay prompt is done for the session.
  useEffect(() => {
    if (!audio.globalMuted) setAutoplayBlocked(false);
  }, [audio.globalMuted]);

  // Null for a channel (no archive behind the origin window) and until the
  // seekable window is bigger than the player's own buffer.
  const scrubber = liveScrubber(dvr, handleSeek, !isChannel);

  return (
    <Player.Root
      shell={shell}
      mode={isChannel ? 'channel' : 'live'}
      eventId={eventId}
      playbackEventId={effectiveTrackingEventId}
      title={title}
      adsEnabled={adsEnabled}
    >
      <Player.Header
        badge="live"
        exitHref={exitHref}
        metaLine={metaLineOverride}
        currentViewers={currentViewers}
        chat={chatEnabled ? { open: chatOpen, onToggle: () => setChatOpen((o) => !o), messageCount: chat.messages.length } : undefined}
      />

      <Player.Stage
        onAutoplayBlocked={() => { audio.setGlobalMuted(true); setAutoplayBlocked(true); }}
        dvrActive={dvrSeeking}
        seekCommand={seekCommand}
        onProgress={handleProgress}
      />

      {chatEnabled && (
        <Player.Aside>
          <ChatDock
            open={chatOpen}
            onClose={() => setChatOpen(false)}
            messages={chat.messages}
            onSend={chat.sendMessage}
            onReact={chat.react}
            reactionCounts={chat.reactionCounts}
            me={chat.me}
            status={chat.status}
            onDeleteMessage={chat.deleteMessage}
            onMuteUser={chat.muteUser}
            onUnmuteUser={chat.unmuteUser}
            currentUserId={user?.id ?? null}
          />
        </Player.Aside>
      )}

      <Player.Transport>
        {!isChannel && <Transport.Play />}
        <Transport.Badge>
          <LiveBadge atLive={atLive} onBackToLive={() => dvr && handleSeek(dvr.edge)} />
        </Transport.Badge>
        {scrubber && <Transport.Scrubber {...scrubber} />}
        <Transport.Volume />
        {!scrubber && <Transport.Spacer />}
        <Transport.AudioCamera />
        <Transport.Quality />
        <Transport.Pip />
        <Transport.Fullscreen />
      </Player.Transport>

      <Player.Overlay />

      {autoplayBlocked && audio.globalMuted && (
        <button type="button" className={styles.unmutePrompt} onClick={() => audio.setGlobalMuted(false)}>
          <Volume2 size={16} />
          {t('unmutePrompt')}
        </button>
      )}
      <ReactionsTicker totalReactions={chat.totalReactions} />
      {overlay}
    </Player.Root>
  );
}
