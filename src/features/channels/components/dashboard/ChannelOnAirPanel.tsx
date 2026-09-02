'use client';

import { useMemo, useState } from 'react';
import { Radio } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useMyEventsQuery } from '@/features/events';
import {
  useClearChannelSourceOverrideMutation,
  useSetChannelSourceOverrideMutation,
} from '../../mutations/channel.mutations';
import { filterLinkableEvents } from '../../utils/filterLinkableEvents';
import type { ChannelSource, ChannelSourceOverride } from '../../types/channel.types';
import styles from './ChannelDetail.module.scss';

interface Props {
  channelId: string;
  slug: string;
  organizationId: string;
  source: ChannelSource;
  sourceOverride: ChannelSourceOverride | null;
  isOnAir: boolean;
}

// "No ar agora" — carries an Event manually (source-override) on top of the
// automatic program-window carry. See spec §4.4.
export function ChannelOnAirPanel({
  channelId,
  slug,
  organizationId,
  source,
  sourceOverride,
  isOnAir,
}: Props) {
  const t = useTranslations('channels.detail.onAirPanel');
  const { data: myEvents = [] } = useMyEventsQuery();
  const setOverride = useSetChannelSourceOverrideMutation();
  const clearOverride = useClearChannelSourceOverrideMutation();
  const [selectedEventId, setSelectedEventId] = useState('');

  const linkableEvents = useMemo(
    () => filterLinkableEvents(myEvents, organizationId),
    [myEvents, organizationId],
  );

  const target = { id: channelId, slug, organizationId };
  const carriesEvent = source.mode === 'event';
  // Override set but the resolver isn't actually reflecting it yet (still on
  // "own", or carrying an event for some other reason e.g. an overlapping
  // program window) — the carry hasn't caught up with the override.
  const isWaiting = Boolean(sourceOverride) && !(carriesEvent && source.reason === 'override');

  const sourceTag = !carriesEvent
    ? t('sourceOwn')
    : source.reason === 'program'
      ? t('sourceProgram', { name: source.event?.title ?? '' })
      : t('sourceEvent');

  const description = carriesEvent
    ? t('descriptionEvent')
    : t(isOnAir ? 'descriptionOwnOn' : 'descriptionOwnOff');

  const handlePutOnAir = () => {
    if (!selectedEventId) return;
    setOverride.mutate(
      { ...target, eventId: selectedEventId },
      { onSuccess: () => setSelectedEventId('') },
    );
  };

  return (
    <section className={styles.card}>
      <div className={styles.cardHeader}>
        <h2 className={styles.cardTitle}>{t('title')}</h2>
        <span className={`${styles.pill} ${carriesEvent ? styles.pillViolet : styles.pillNeutral}`}>
          {sourceTag}
        </span>
        <span className={`${styles.health} ${isOnAir ? styles.healthLive : ''}`}>
          <span className={isOnAir ? styles.dotPulse : styles.dotIdle} />
          {t(isOnAir ? 'healthStable' : 'healthWaiting')}
        </span>
      </div>

      <div className={styles.onAirBody}>
        <div className={`${styles.preview} ${isOnAir ? styles.previewLive : ''}`}>
          <Radio size={22} aria-hidden="true" />
          <span className={styles.previewLabel}>{t(isOnAir ? 'preview' : 'previewOff')}</span>
          {isOnAir && <span className={styles.previewBadge}>{t('liveBadge')}</span>}
        </div>

        <div className={styles.onAirControls}>
          <p className={styles.onAirDescription}>{description}</p>
          {isWaiting && <p className={styles.onAirWaiting}>{t('waiting')}</p>}

          <label className={styles.monoLabel} htmlFor="channel-on-air-event">
            {t('replaceLabel')}
          </label>
          {/* Kept visible even with an override active — swapping to a different
              event is one select + submit, not clear-then-pick-again. */}
          <div className={styles.onAirRow}>
            <select
              id="channel-on-air-event"
              className={styles.select}
              aria-label={t('selectEvent')}
              value={selectedEventId}
              onChange={(event) => setSelectedEventId(event.target.value)}
            >
              <option value="">{t('selectEvent')}</option>
              {linkableEvents.map((event) => (
                <option key={event.id} value={event.id}>
                  {event.title}
                </option>
              ))}
            </select>

            <button
              type="button"
              className={styles.primaryAction}
              disabled={!selectedEventId || setOverride.isPending}
              onClick={handlePutOnAir}
            >
              {t('putOnAir')}
            </button>

            {sourceOverride && (
              <button
                type="button"
                className={styles.ghostAction}
                disabled={clearOverride.isPending}
                onClick={() => clearOverride.mutate(target)}
              >
                {t('backToFeed')}
              </button>
            )}
          </div>

          <p className={styles.help}>{t('help')}</p>
        </div>
      </div>
    </section>
  );
}
