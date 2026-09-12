'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/features/account/hooks/use-auth';
import { normalizeError } from '@/lib/http/errors';
import { usePrerollGate } from '@/features/advertisements/hooks/use-preroll-gate';
import { PreRollPlayer } from '@/features/advertisements/components/PreRollPlayer';
import { useLiveAccessQuery, useLivePlaybackQuery } from '../queries/live.queries';
import { LivePlayer } from './LivePlayer';
import { LiveGateLoading } from './LiveGateLoading';
import { LiveNoAccess } from './LiveNoAccess';
import { LiveNotStarted } from './LiveNotStarted';

interface Props {
  eventId: string;
  eventTitle?: string;
  chatEnabled: boolean;
  adsEnabled?: boolean;
}

export function LiveGate({ eventId, eventTitle, chatEnabled, adsEnabled = true }: Props) {
  const t = useTranslations('liveGate');
  const router = useRouter();
  const { isLoggedIn, isLoading: authLoading } = useAuth();
  const access = useLiveAccessQuery(eventId, !authLoading);
  const authorized = access.data === true;
  const playback = useLivePlaybackQuery(eventId, authorized);
  const preroll = usePrerollGate(eventId, adsEnabled);
  const [prerollDone, setPrerollDone] = useState(false);

  if (authLoading || access.isLoading) {
    return <LiveGateLoading message={t('checkingAccess')} />;
  }

  if (!authorized) {
    return <LiveNoAccess eventId={eventId} eventTitle={eventTitle} isLoggedIn={isLoggedIn} />;
  }

  if (playback.isLoading) {
    return <LiveGateLoading message={t('loadingStream')} eventTitle={eventTitle} />;
  }

  // react-query keeps the last-good `data` when a background refetch fails,
  // so a revoked ticket / expired session would otherwise leave the player
  // running on stale playback info forever (WEB-02). The 5s poll means a
  // 401/403 here reflects the CURRENT entitlement, not a fluke — drop the
  // player immediately instead of waiting for `data` to catch up (it won't).
  const playbackErrorStatus = playback.error ? normalizeError(playback.error).status : null;
  if (playbackErrorStatus === 401 || playbackErrorStatus === 403) {
    return <LiveNoAccess eventId={eventId} eventTitle={eventTitle} isLoggedIn={isLoggedIn} />;
  }

  // Pre-live gating keys ONLY on the top-level `live` flag ("something is
  // actually transcoding") — never on cameras/stages presence. The playback
  // response now always lists every enabled camera (live or not) so the grid
  // is never empty, and using its length here would skip straight past the
  // waiting screen while nothing is actually live.
  if (!playback.data?.live) {
    return (
      <LiveNotStarted
        eventId={eventId}
        eventTitle={eventTitle}
        cameraCount={playback.data?.cameras.length ?? 0}
        onExit={() => router.push(`/events/${eventId}`)}
      />
    );
  }

  if (!prerollDone && preroll.pending) {
    return <LiveGateLoading message={t('loadingStream')} eventTitle={eventTitle} />;
  }

  if (!prerollDone && preroll.ad) {
    return (
      <PreRollPlayer
        ad={preroll.ad}
        onFinished={() => {
          preroll.markSeen();
          setPrerollDone(true);
        }}
      />
    );
  }

  return (
    <LivePlayer
      cameras={playback.data.cameras}
      stages={playback.data.stages}
      primaryCameraId={playback.data.primaryCameraId}
      librasCameraId={playback.data.librasCameraId}
      title={eventTitle}
      eventId={eventId}
      chatEnabled={chatEnabled}
      adsEnabled={adsEnabled}
    />
  );
}
