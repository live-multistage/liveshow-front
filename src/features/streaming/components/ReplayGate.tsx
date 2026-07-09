'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/features/account/hooks/use-auth';
import { useReplayAccessQuery, useReplayPlaybackQuery } from '../queries/live.queries';
import { LiveGateLoading } from './LiveGateLoading';
import { ReplayPlayer } from './ReplayPlayer';

interface Props {
  eventId: string;
  eventTitle: string;
}

export function ReplayGate({ eventId, eventTitle }: Props) {
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
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <h2>{eventTitle}</h2>
        <p>Replay em breve.</p>
      </div>
    );
  }

  return <ReplayPlayer cameras={playback.data.cameras} title={eventTitle} eventId={eventId} />;
}
