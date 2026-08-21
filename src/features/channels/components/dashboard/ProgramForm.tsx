'use client';

import { useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Button, Input } from '@live-show/design-system';
import { WEEKDAYS, buildRRule, parseRRule, type Weekday } from '../../utils/rrule';
import { useUpsertProgramMutation } from '../../mutations/channel.mutations';
import type { Program } from '../../types/channel.types';
import styles from './ProgramForm.module.scss';

interface Props {
  channelId: string;
  slug: string;
  onDone: () => void;
  // Presente = edição: os campos vêm do programa e o upsert leva o programId.
  program?: Program;
}

// 2024-01-01 caiu numa segunda-feira: a semana começando nele dá os nomes
// localizados dos dias na mesma ordem do RRULE (MO..SU), sem chave de tradução
// nova para cada dia.
const REFERENCE_MONDAY = Date.UTC(2024, 0, 1);

export function ProgramForm({ channelId, slug, onDone, program }: Props) {
  const t = useTranslations('channels');
  const locale = useLocale();
  const mutation = useUpsertProgramMutation(channelId);

  const [name, setName] = useState(program?.name ?? '');
  // O backend guarda HH:mm:ss em alguns casos; o input type="time" só aceita HH:mm.
  const [startTime, setStartTime] = useState(program?.startTime.slice(0, 5) ?? '20:00');
  const [durationMin, setDurationMin] = useState(String(program?.durationMin ?? 60));
  const [days, setDays] = useState<Weekday[]>(() =>
    program ? parseRRule(program.rrule) : [],
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
  const canSubmit = Boolean(name.trim() && startTime && duration > 0 && days.length > 0);

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
            min={1}
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

      <Button type="submit" disabled={mutation.isPending}>
        {t('dashboard.save')}
      </Button>
    </form>
  );
}
