'use client';

import { useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { WEEKDAYS, buildRRule, parseRRule, weekdayLabels, type Weekday } from '../utils/rrule';
import { useDeleteProgramMutation, useUpsertProgramMutation } from '../mutations/channel.mutations';
import type { Program } from '../types/channel.types';

export const DURATION_PRESETS = [30, 60, 90, 120] as const;
const WEEKDAYS_MO_FR: Weekday[] = ['MO', 'TU', 'WE', 'TH', 'FR'];

interface UseProgramFormArgs {
  channelId: string;
  slug: string;
  organizationId: string;
  // Fuso do canal — usado no hint de horário do input de início.
  timezone: string;
  onDone: () => void;
  // Presente = edição: os campos vêm do programa e o upsert leva o programId.
  program?: Program;
}

const minutesToHHmm = (minutes: number) => {
  const wrapped = ((minutes % 1440) + 1440) % 1440;
  const h = String(Math.floor(wrapped / 60)).padStart(2, '0');
  const m = String(wrapped % 60).padStart(2, '0');
  return `${h}:${m}`;
};

export function useProgramForm({
  channelId,
  slug,
  timezone,
  onDone,
  program,
}: UseProgramFormArgs) {
  const t = useTranslations('channels.program');
  const locale = useLocale();
  const mutation = useUpsertProgramMutation(channelId);
  const deleteMutation = useDeleteProgramMutation(channelId);

  const [name, setName] = useState(program?.name ?? '');
  // O backend guarda HH:mm:ss em alguns casos; o input type="time" só aceita HH:mm.
  const [startTime, setStartTime] = useState(program?.startTime.slice(0, 5) ?? '20:00');
  const [durationMin, setDurationMin] = useState(String(program?.durationMin ?? 60));
  const [days, setDays] = useState<Weekday[]>(() => (program ? parseRRule(program.rrule) : []));
  const [daysTouched, setDaysTouched] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const duration = Number(durationMin);
  const durationValid = duration >= 5 && duration <= 1440;

  const dayLabels = useMemo(() => weekdayLabels(locale), [locale]);

  const toggleDay = (day: Weekday) => {
    setDaysTouched(true);
    setDays((current) => (current.includes(day) ? current.filter((d) => d !== day) : [...current, day]));
  };

  const pickWeekdays = () => {
    setDaysTouched(true);
    setDays(WEEKDAYS_MO_FR);
  };

  const pickAllDays = () => {
    setDaysTouched(true);
    setDays([...WEEKDAYS]);
  };

  const daysError = daysTouched && days.length === 0 ? t('weekdaysError') : null;
  const durationError = !durationValid ? t('durationError') : null;

  // Resumo: "20:00–22:00 · Seg, Qua, Sex" (ou "todos os dias"). Só aparece
  // quando horário + duração + dias já formam uma janela válida — o resto é
  // um placeholder pedindo para completar o form.
  const summary = useMemo(() => {
    if (!startTime || !durationValid || days.length === 0) return null;
    const [h, m] = startTime.split(':').map(Number);
    const endLabel = minutesToHHmm(h * 60 + m + duration);
    const daysLabel =
      days.length === WEEKDAYS.length
        ? t('summaryAllDays')
        : WEEKDAYS.filter((day) => days.includes(day))
            .map((day) => dayLabels[WEEKDAYS.indexOf(day)])
            .join(', ');
    return `${startTime}–${endLabel} · ${daysLabel}`;
  }, [startTime, duration, durationValid, days, dayLabels, t]);

  // Espelha o UpsertProgramDto do backend (@Min(5) @Max(1440)): o form recusa
  // antes de gastar um round-trip que voltaria 400.
  const canSubmit = Boolean(name.trim() && startTime && durationValid && days.length > 0);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setDaysTouched(true);
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

  const requestDelete = () => {
    if (!program) return;
    if (!confirmingDelete) {
      setConfirmingDelete(true);
      return;
    }
    deleteMutation.mutate({ programId: program.id, slug }, { onSuccess: onDone });
  };

  return {
    t,
    isEdit: Boolean(program),
    name,
    setName,
    startTime,
    setStartTime,
    durationMin,
    setDurationMin,
    applyDurationPreset: (minutes: number) => setDurationMin(String(minutes)),
    durationError,
    days,
    dayLabels,
    toggleDay,
    pickWeekdays,
    pickAllDays,
    daysError,
    summary,
    canSubmit,
    isPending: mutation.isPending,
    handleSubmit,
    confirmingDelete,
    requestDelete,
    isDeleting: deleteMutation.isPending,
  };
}
