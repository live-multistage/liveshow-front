'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@live-show/design-system';
import { useMyEventsQuery } from '@/features/events';
import {
  useClearChannelSourceOverrideMutation,
  useSetChannelSourceOverrideMutation,
} from '../../mutations/channel.mutations';
import { filterLinkableEvents } from '../../utils/filterLinkableEvents';
import type { ChannelSource, ChannelSourceOverride } from '../../types/channel.types';
import styles from './ChannelOnAirPanel.module.scss';

interface Props {
  channelId: string;
  slug: string;
  organizationId: string;
  source: ChannelSource;
  sourceOverride: ChannelSourceOverride | null;
}

// "No ar agora" — carries an Event manually (source-override) on top of the
// automatic program-window carry. See spec §4.4.
export function ChannelOnAirPanel({ channelId, slug, organizationId, source, sourceOverride }: Props) {
  const t = useTranslations('channels.dashboard.onAir');
  const { data: myEvents = [] } = useMyEventsQuery();
  const setOverride = useSetChannelSourceOverrideMutation();
  const clearOverride = useClearChannelSourceOverrideMutation();
  const [selectedEventId, setSelectedEventId] = useState('');

  const linkableEvents = useMemo(
    () => filterLinkableEvents(myEvents, organizationId),
    [myEvents, organizationId],
  );

  const target = { id: channelId, slug, organizationId };
  // Override set but the resolver isn't actually reflecting it yet (still on
  // "own", or carrying an event for some other reason e.g. an overlapping
  // program window) — the carry hasn't caught up with the override.
  const isWaiting =
    Boolean(sourceOverride) && !(source.mode === 'event' && source.reason === 'override');

  const handlePutOnAir = () => {
    if (!selectedEventId) return;
    setOverride.mutate(
      { ...target, eventId: selectedEventId },
      { onSuccess: () => setSelectedEventId('') },
    );
  };

  const handleClear = () => clearOverride.mutate(target);

  return (
    <section className={styles.section}>
      <h2 className={styles.heading}>{t('title')}</h2>

      <p className={styles.current}>
        {source.mode === 'event' && source.event
          ? t('currentEvent', { title: source.event.title })
          : t('currentOwn')}
      </p>

      {isWaiting && <p className={styles.waiting}>{t('waiting')}</p>}

      {sourceOverride && (
        <Button
          size="sm"
          variant="outline"
          disabled={clearOverride.isPending}
          onClick={handleClear}
        >
          {t('backToChannel')}
        </Button>
      )}

      {/* Kept visible even with an override active — swapping to a different
          event is one select + submit, not clear-then-pick-again. */}
      <div className={styles.putOnAir}>
        <select
          className={styles.select}
          aria-label={t('selectEvent')}
          value={selectedEventId}
          onChange={(e) => setSelectedEventId(e.target.value)}
        >
          <option value="">{t('selectEvent')}</option>
          {linkableEvents.map((event) => (
            <option key={event.id} value={event.id}>
              {event.title}
            </option>
          ))}
        </select>
        <Button
          size="sm"
          disabled={!selectedEventId || setOverride.isPending}
          onClick={handlePutOnAir}
        >
          {t('putOnAir')}
        </Button>
      </div>
    </section>
  );
}
