'use client';

import { useEffect, useId, useState } from 'react';
import { useQueries, useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { X } from 'lucide-react';
import { Input } from '@live-show/design-system';
import { eventsService } from '@/features/events/services/events.service';
import { eventKeys } from '@/features/events/queries/get-event';
import { platformAdminService } from '../../services/platform-admin.service';
import styles from './EventPicker.module.scss';

const dateFormatter = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Sao_Paulo' });

interface Props {
  value: string[];
  max: 1 | 3;
  onChange(ids: string[]): void;
}

export function EventPicker({ value, max, onChange }: Props) {
  const t = useTranslations('platformAdmin.mailing');
  const uid = useId();
  const [input, setInput] = useState('');
  const [q, setQ] = useState('');

  useEffect(() => {
    const handle = setTimeout(() => setQ(input.trim()), 300);
    return () => clearTimeout(handle);
  }, [input]);

  const search = useQuery({
    queryKey: ['platform-admin', 'mailing', 'event-search', q],
    queryFn: () => platformAdminService.getPlatformEvents({ q }),
    enabled: q.length >= 2,
    staleTime: 30_000,
  });
  // Titles for already-chosen ids (R20); shares the cache with the event page.
  const chosen = useQueries({
    queries: value.map((id) => ({ queryKey: eventKeys.detail(id), queryFn: () => eventsService.getEvent(id), staleTime: 5 * 60_000 })),
  });

  const full = value.length >= max;
  const items = search.data?.items ?? [];

  return (
    <fieldset className={styles.picker}>
      <legend className={styles.legend}>{t(max === 1 ? 'editor.field.event' : 'editor.field.events')}</legend>

      {value.length > 0 && (
        <ul className={styles.chips}>
          {value.map((id, i) => (
            <li key={id} className={styles.chip}>
              <span id={`${uid}-chip-${i}`} className={styles.chipTitle}>{chosen[i]?.data?.title ?? id}</span>
              <button
                type="button"
                className={styles.chipRemove}
                aria-label={t('editor.field.removeEvent')}
                aria-describedby={`${uid}-chip-${i}`}
                onClick={() => onChange(value.filter((v) => v !== id))}
              >
                <X aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <Input
        type="search"
        autoComplete="off"
        aria-label={t('editor.field.searchEvents')}
        placeholder={t('editor.field.searchEvents')}
        value={input}
        onChange={(e) => setInput(e.target.value)}
      />

      {q.length >= 2 && (
        search.isLoading ? <p role="status" className={styles.muted}>{t('common.loading')}</p>
          : search.isError ? <p role="alert" className={styles.muted}>{t('common.loadError')}</p>
            : items.length === 0 ? <p role="status" className={styles.muted}>{t('editor.field.noEvents')}</p>
              : (
                <ul className={styles.results}>
                  {items.map((event) => (
                    <li key={event.id}>
                      <button
                        type="button"
                        className={styles.result}
                        disabled={full || value.includes(event.id)}
                        onClick={() => onChange([...value, event.id])}
                      >
                        <span className={styles.resultTitle}>{event.title}</span>
                        <span className={styles.resultMeta}>{dateFormatter.format(new Date(event.startsAt))} · {event.orgName}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )
      )}
    </fieldset>
  );
}
