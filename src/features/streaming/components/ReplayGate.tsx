'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/features/account/hooks/use-auth';
import { normalizeError } from '@/lib/http/errors';
import { usePrerollGate } from '@/features/advertisements/hooks/use-preroll-gate';
import { PreRollPlayer } from '@/features/advertisements/components/PreRollPlayer';
import { useReplayAccessQuery, useReplayPlaybackQuery } from '../queries/live.queries';
import { LiveGateLoading } from './LiveGateLoading';
import { ReplayComingSoon } from './ReplayComingSoon';
import { ReplayPlayer } from './ReplayPlayer';

interface Props {
  eventId: string;
  eventTitle: string;
  coverUrl?: string | null;
  adsEnabled?: boolean;
}

export function ReplayGate({ eventId, eventTitle, coverUrl, adsEnabled = true }: Props) {
  const t = useTranslations('liveGate');
  const { isLoading: authLoading } = useAuth();
  const access = useReplayAccessQuery(eventId, !authLoading);
  const playback = useReplayPlaybackQuery(eventId, access.data === true);
  const preroll = usePrerollGate(eventId, adsEnabled);
  const [prerollDone, setPrerollDone] = useState(false);

  if (authLoading || access.isLoading) {
    return <LiveGateLoading message={t('checkingAccess')} />;
  }

  if (!access.data) {
    return <ReplayNoAccess eventId={eventId} eventTitle={eventTitle} />;
  }

  if (playback.isLoading) {
    return <LiveGateLoading message={t('checkingAccess')} />;
  }

  // react-query keeps the last-good `data` when a background refetch fails,
  // so a revoked entitlement would otherwise leave the player running on
  // stale playback info forever (WEB-02). Drop it on a 401/403 instead of
  // waiting for `data` to catch up (it won't).
  const playbackErrorStatus = playback.error ? normalizeError(playback.error).status : null;
  if (playbackErrorStatus === 401 || playbackErrorStatus === 403) {
    return <ReplayNoAccess eventId={eventId} eventTitle={eventTitle} />;
  }

  if (!playback.data?.available) {
    return <ReplayComingSoon eventId={eventId} eventTitle={eventTitle} coverUrl={coverUrl} />;
  }

  if (!prerollDone && preroll.pending) {
    return <LiveGateLoading message={t('checkingAccess')} />;
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
    <ReplayPlayer
      cameras={playback.data.cameras}
      librasCameraId={playback.data.librasCameraId}
      title={eventTitle}
      eventId={eventId}
      // União das coberturas de todas as câmeras, calculada pelo servidor. É o
      // domínio do scrubber e o referencial que faz uma câmera que entrou
      // atrasada saber onde ela cai no evento.
      timeline={playback.data.timeline}
      adsEnabled={adsEnabled}
    />
  );
}

// Shared by "never had access" and "access refetch came back 401/403" — same
// user-facing message either way: go get/renew a ticket.
function ReplayNoAccess({ eventId, eventTitle }: { eventId: string; eventTitle: string }) {
  const t = useTranslations('liveGate');
  return (
    <div style={{ padding: 40, textAlign: 'center' }}>
      <h2>{t('accessRequired')}</h2>
      <p>{t('needTicket', { title: eventTitle })}</p>
      <Link href={`/events/${eventId}`}>{t('viewTickets')}</Link>
    </div>
  );
}
