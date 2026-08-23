'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { useMyOrganizationsQuery } from '@/features/organizations/queries/get-my-organizations';
import { slugify, publicOrigin } from '@/features/events/utils/slug';
import { WEEKDAYS, buildRRule, parseRRule, weekdayLabels, type Weekday } from '@/features/channels/utils/rrule';
import { browserTimezone, supportedTimezones } from '@/features/channels/utils/timezone';
import { wallClockToUtcISOString, utcInstantToWallClock } from '../utils/wall-clock';
import { useCreateSeriesMutation, useUpdateSeriesMutation } from '../mutations/series.mutations';
import type { SeriesResponse } from '../types/series.types';

export const DURATION_PRESETS = [30, 60, 90, 120] as const;
const WEEKDAYS_MO_FR: Weekday[] = ['MO', 'TU', 'WE', 'TH', 'FR'];

export const NAME_MAX = 80;
export const SLUG_PATTERN = '[a-z0-9]+(-[a-z0-9]+)*';
const SLUG_REGEX = new RegExp(`^${SLUG_PATTERN}$`);
export const SLUG_MIN = 3;
export const SLUG_MAX = 80;
export const DESCRIPTION_MAX = 500;

interface Args {
  mode?: 'create' | 'edit';
  initial?: SeriesResponse;
  onDone?: () => void;
}

export function useSeriesForm({ mode = 'create', initial, onDone }: Args) {
  const t = useTranslations('series.create');
  const router = useRouter();
  const locale = useLocale();
  const { data: organizations = [] } = useMyOrganizationsQuery();

  const create = useCreateSeriesMutation();
  const update = useUpdateSeriesMutation();

  const isEdit = mode === 'edit' && Boolean(initial);
  const initialWallClock = initial ? utcInstantToWallClock(initial.dtstart, initial.timezone) : null;

  const [organizationId, setOrganizationId] = useState('');
  const [name, setName] = useState(initial?.name ?? '');
  const [slug, setSlug] = useState(initial?.slug ?? '');
  const [slugTouched, setSlugTouched] = useState(isEdit);
  const [description, setDescription] = useState(initial?.description ?? '');
  const [timezone, setTimezone] = useState(initial?.timezone ?? browserTimezone);
  const [days, setDays] = useState<Weekday[]>(() => (initial ? parseRRule(initial.rrule) : []));
  const [daysTouched, setDaysTouched] = useState(false);
  const [firstDate, setFirstDate] = useState(initialWallClock?.date ?? '');
  const [startTime, setStartTime] = useState(initialWallClock?.time ?? '20:00');
  const [durationMin, setDurationMin] = useState(String(initial?.durationMin ?? 60));
  const [horizonWeeks, setHorizonWeeks] = useState(String(initial?.horizonWeeks ?? 4));

  const timezones = useMemo(() => {
    const supported = supportedTimezones();
    return supported.includes(timezone) ? supported : [timezone, ...supported];
  }, [timezone]);

  const dayLabels = useMemo(() => weekdayLabels(locale), [locale]);

  const activeOrganizationId =
    initial?.organizationId || organizationId || organizations[0]?.id || '';

  const changeName = (value: string) => {
    setName(value);
    if (!slugTouched) setSlug(slugify(value, SLUG_MAX));
  };

  const changeSlug = (value: string) => {
    setSlugTouched(true);
    setSlug(value);
  };

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

  const slugIsValid = slug.length >= SLUG_MIN && slug.length <= SLUG_MAX && SLUG_REGEX.test(slug);
  const duration = Number(durationMin);
  const durationValid = duration >= 5 && duration <= 1440;
  const horizon = Number(horizonWeeks);
  const horizonValid = horizon >= 1 && horizon <= 12;
  const timezoneIsValid = timezones.length === 0 || timezones.includes(timezone);

  const daysError = daysTouched && days.length === 0 ? t('weekdaysError') : null;
  const durationError = !durationValid ? t('durationError') : null;

  const minutesToHHmm = (minutes: number) => {
    const wrapped = ((minutes % 1440) + 1440) % 1440;
    const h = String(Math.floor(wrapped / 60)).padStart(2, '0');
    const m = String(wrapped % 60).padStart(2, '0');
    return `${h}:${m}`;
  };

  // "20:00–22:00 · seg., qua., sex. · a partir de 28/08 · gera 4 semanas" — só
  // aparece quando horário + duração + dias + data já formam uma janela válida.
  const summary = useMemo(() => {
    if (!startTime || !durationValid || days.length === 0 || !firstDate) return null;
    const [h, m] = startTime.split(':').map(Number);
    const endLabel = minutesToHHmm(h * 60 + m + duration);
    const daysLabel =
      days.length === WEEKDAYS.length
        ? t('summaryAllDays')
        : WEEKDAYS.filter((day) => days.includes(day))
            .map((day) => dayLabels[WEEKDAYS.indexOf(day)])
            .join(', ');
    const dateLabel = new Intl.DateTimeFormat(locale, {
      day: '2-digit',
      month: '2-digit',
      timeZone: 'UTC',
    }).format(new Date(`${firstDate}T00:00:00Z`));
    const horizonLabel = horizonValid ? t('summaryHorizon', { weeks: horizon }) : '';
    return `${startTime}–${endLabel} · ${daysLabel} · ${t('summaryFrom', { date: dateLabel })}${
      horizonLabel ? ` · ${horizonLabel}` : ''
    }`;
  }, [startTime, duration, durationValid, days, dayLabels, firstDate, horizon, horizonValid, locale, t]);

  // Espelha o UpsertSeriesDto do backend: o form recusa antes de gastar um
  // round-trip que voltaria 400.
  const canSubmit = Boolean(
    name.trim() &&
      timezone.trim() &&
      timezoneIsValid &&
      firstDate &&
      startTime &&
      days.length > 0 &&
      durationValid &&
      horizonValid &&
      (isEdit || (activeOrganizationId && slugIsValid)),
  );

  const isPending = create.isPending || update.isPending;

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setDaysTouched(true);
    if (!canSubmit || isPending) return;

    const rrule = buildRRule(days);
    const dtstart = wallClockToUtcISOString(firstDate, startTime, timezone);

    if (isEdit && initial) {
      update.mutate(
        {
          id: initial.id,
          organizationId: initial.organizationId,
          slug: initial.slug,
          input: {
            name: name.trim(),
            description: description.trim() || undefined,
            rrule,
            dtstart,
            timezone: timezone.trim(),
            durationMin: duration,
            horizonWeeks: horizon,
          },
        },
        { onSuccess: () => onDone?.() },
      );
      return;
    }

    create.mutate(
      {
        organizationId: activeOrganizationId,
        slug: slug.trim(),
        name: name.trim(),
        description: description.trim() || undefined,
        rrule,
        dtstart,
        timezone: timezone.trim(),
        durationMin: duration,
        horizonWeeks: horizon,
      },
      {
        onSuccess: (created) => {
          onDone?.();
          router.push(`/dashboard/series/${created.slug}`);
        },
      },
    );
  };

  return {
    t,
    isEdit,
    organizations,
    activeOrganizationId,
    setOrganizationId,
    name,
    changeName,
    slug,
    changeSlug,
    description,
    setDescription,
    timezone,
    setTimezone,
    timezones,
    days,
    dayLabels,
    toggleDay,
    pickWeekdays,
    pickAllDays,
    daysError,
    firstDate,
    setFirstDate,
    startTime,
    setStartTime,
    durationMin,
    setDurationMin,
    applyDurationPreset: (minutes: number) => setDurationMin(String(minutes)),
    durationError,
    horizonWeeks,
    setHorizonWeeks,
    summary,
    canSubmit,
    isPending,
    handleSubmit,
    slugPreviewOrigin: publicOrigin().replace(/^https?:\/\//, ''),
  };
}
