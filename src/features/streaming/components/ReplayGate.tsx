'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/features/account/hooks/use-auth';
import { useReplayAccessQuery, useReplayPlaybackQuery } from '../queries/live.queries';
import { LiveGateLoading } from './LiveGateLoading';
import { ReplayComingSoon } from './ReplayComingSoon';
import { ReplayPlayer } from './ReplayPlayer';

interface Props {
  eventId: string;
  eventTitle: string;
  coverUrl?: string | null;
}

export function ReplayGate({ eventId, eventTitle, coverUrl }: Props) {
  const t = useTranslations('liveGate');
  const { isLoading: authLoading } = useAuth();
  const access = useReplayAccessQuery(eventId, !authLoading);
  const playback = useReplayPlaybackQuery(eventId, access.data === true);

  if (authLoading || access.isLoading) {
    return <LiveGateLoading message={t('checkingAccess')} />;
  }

  if (!access.data) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <h2>{t('accessRequired')}</h2>
        <p>{t('needTicket', { title: eventTitle })}</p>
        <Link href={`/events/${eventId}`}>{t('viewTickets')}</Link>
      </div>
    );
  }

  if (playback.isLoading) {
    return <LiveGateLoading message={t('checkingAccess')} />;
  }

  if (!playback.data?.available) {
    return <ReplayComingSoon eventId={eventId} eventTitle={eventTitle} coverUrl={coverUrl} />;
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
    />
  );
}
