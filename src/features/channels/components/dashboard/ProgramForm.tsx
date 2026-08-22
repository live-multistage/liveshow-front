'use client';

import { useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Button, Input } from '@live-show/design-system';
import { useMyEventsQuery } from '@/features/events';
import {
  WEEKDAYS,
  buildRRule,
  parseRRule,
  programOverlapsEvent,
  type Weekday,
} from '../../utils/rrule';
import { useUpsertProgramMutation } from '../../mutations/channel.mutations';
import type { Program } from '../../types/channel.types';
import styles from './ProgramForm.module.scss';

interface Props {
  channelId: string;
  slug: string;
  organizationId: string;
  // Fuso do canal — usado para conferir se o evento vinculado cai dentro da
  // janela do programa.
  timezone: string;
  onDone: () => void;
  // Presente = edição: os campos vêm do programa e o upsert leva o programId.
  program?: Program;
}

// 2024-01-01 caiu numa segunda-feira: a semana começando nele dá os nomes
// localizados dos dias na mesma ordem do RRULE (MO..SU), sem chave de tradução
// nova para cada dia.
const REFERENCE_MONDAY = Date.UTC(2024, 0, 1);

export function ProgramForm({ channelId, slug, organizationId, timezone, onDone, program }: Props) {
  const t = useTranslations('channels');
  const locale = useLocale();
  const mutation = useUpsertProgramMutation(channelId);
  const { data: myEvents = [] } = useMyEventsQuery();

  const [name, setName] = useState(program?.name ?? '');
  // O backend guarda HH:mm:ss em alguns casos; o input type="time" só aceita HH:mm.
  const [startTime, setStartTime] = useState(program?.startTime.slice(0, 5) ?? '20:00');
  const [durationMin, setDurationMin] = useState(String(program?.durationMin ?? 60));
  const [days, setDays] = useState<Weekday[]>(() =>
    program ? parseRRule(program.rrule) : [],
  );
  const [eventId, setEventId] = useState(program?.eventId ?? '');

  // Vinculável = do mesmo org, formato ao vivo, ainda não encerrado. O backend
  // valida as mesmas invariantes de novo no upsert; isto é só o filtro da lista.
  const linkableEvents = useMemo(
    () =>
      myEvents.filter(
        (event) =>
          event.organizationId === organizationId &&
          event.format === 'LIVE' &&
          (event.status === 'SCHEDULED' || event.status === 'LIVE'),
      ),
    [myEvents, organizationId],
  );

  const linkedEvent = linkableEvents.find((event) => event.id === eventId);
  const showsOverlapWarning = Boolean(
    linkedEvent &&
      days.length > 0 &&
      !programOverlapsEvent(days, startTime, Number(durationMin) || 0, timezone, linkedEvent),
  );

  const dayLabels = useMemo(() => {
    const format = new Intl.DateTimeFormat(locale, { weekday: 'short', timeZone: 'UTC' });
    return WEEKDAYS.map((_, index) => format.format(new Date(REFERENCE_MONDAY + index * 86_400_000)));
  }, [locale]);

  const toggleDay = (day: Weekday) =>
    setDays((current) =>
      current.includes(day) ? current.filter((d) => d !== day) : [...current, day],
    );

  const duration = Number(durationMin);
  // Espelha o UpsertProgramDto do backend (@Min(5) @Max(1440)): o form recusa
  // antes de gastar um round-trip que voltaria 400.
  const canSubmit = Boolean(
    name.trim() && startTime && duration >= 5 && duration <= 1440 && days.length > 0,
  );

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSubmit || mutation.isPending) return;

    mutation.mutate(
      {
        input: {
          name: name.trim(),
          description: undefined,
          startTime,
          durationMin: duration,
          rrule: buildRRule(days),
          eventId: eventId || null,
        },
        programId: program?.id,
        slug,
      },
      { onSuccess: onDone },
    );
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <div className={styles.field}>
        <label className={styles.label} htmlFor="program-name">
          {t('dashboard.programName')}
        </label>
        <Input id="program-name" value={name} onChange={(e) => setName(e.target.value)} />
      </div>

      <div className={styles.row}>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="program-start">
            {t('dashboard.startTime')}
          </label>
          <Input
            id="program-start"
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="program-duration">
            {t('dashboard.duration')}
          </label>
          <Input
            id="program-duration"
            type="number"
            min={5}
            max={1440}
            value={durationMin}
            onChange={(e) => setDurationMin(e.target.value)}
          />
        </div>
      </div>

      <fieldset className={styles.days}>
        <legend className={styles.label}>{t('dashboard.weekdays')}</legend>
        {WEEKDAYS.map((day, index) => (
          <label key={day} className={styles.day}>
            <input
              type="checkbox"
              checked={days.includes(day)}
              onChange={() => toggleDay(day)}
            />
            {dayLabels[index]}
          </label>
        ))}
      </fieldset>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="program-event">
          {t('dashboard.linkToEvent')}
        </label>
        <select
          id="program-event"
          className={styles.select}
          value={eventId}
          onChange={(e) => setEventId(e.target.value)}
        >
          <option value="">{t('dashboard.linkToEventNone')}</option>
          {linkableEvents.map((event) => (
            <option key={event.id} value={event.id}>
              {event.title}
            </option>
          ))}
        </select>
        {showsOverlapWarning && (
          <span className={styles.warning}>{t('dashboard.linkToEventOverlapWarning')}</span>
        )}
      </div>

      <Button type="submit" disabled={mutation.isPending}>
        {t('dashboard.save')}
      </Button>
    </form>
  );
}
