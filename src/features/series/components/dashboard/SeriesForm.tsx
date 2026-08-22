'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Button, Input } from '@live-show/design-system';
import { useMyOrganizationsQuery } from '@/features/organizations/queries/get-my-organizations';
import { WEEKDAYS, buildRRule, parseRRule, type Weekday } from '@/features/channels/utils/rrule';
import { wallClockToUtcISOString, utcInstantToWallClock } from '../../utils/wall-clock';
import { useCreateSeriesMutation, useUpdateSeriesMutation } from '../../mutations/series.mutations';
import type { SeriesResponse } from '../../types/series.types';
import { slugify } from '@/features/channels/components/dashboard/ChannelForm';
import styles from './SeriesForm.module.scss';

interface Props {
  mode?: 'create' | 'edit';
  initial?: SeriesResponse;
  onDone?: () => void;
}

const SLUG_PATTERN = '[a-z0-9]+(-[a-z0-9]+)*';
const SLUG_REGEX = new RegExp(`^${SLUG_PATTERN}$`);
const SLUG_MIN = 3;
const SLUG_MAX = 80;

const browserTimezone = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Sao_Paulo';
  } catch {
    return 'America/Sao_Paulo';
  }
};

const supportedTimezones = (): string[] => {
  try {
    return Intl.supportedValuesOf?.('timeZone') ?? [];
  } catch {
    return [];
  }
};

export function SeriesForm({ mode = 'create', initial, onDone }: Props) {
  const t = useTranslations('series');
  const tDashboard = useTranslations('dashboard');
  const router = useRouter();
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
  const [firstDate, setFirstDate] = useState(initialWallClock?.date ?? '');
  const [startTime, setStartTime] = useState(initialWallClock?.time ?? '20:00');
  const [durationMin, setDurationMin] = useState(String(initial?.durationMin ?? 60));
  const [horizonWeeks, setHorizonWeeks] = useState(String(initial?.horizonWeeks ?? 4));

  const timezones = useMemo(supportedTimezones, []);

  const activeOrganizationId =
    initial?.organizationId || organizationId || organizations[0]?.id || '';

  const slugIsValid = slug.length >= SLUG_MIN && slug.length <= SLUG_MAX && SLUG_REGEX.test(slug);
  const duration = Number(durationMin);
  const horizon = Number(horizonWeeks);
  const canSubmit = Boolean(
    name.trim() &&
      timezone.trim() &&
      firstDate &&
      startTime &&
      days.length > 0 &&
      duration >= 5 &&
      duration <= 1440 &&
      horizon >= 1 &&
      horizon <= 12 &&
      (isEdit || (activeOrganizationId && slugIsValid)),
  );
  const isPending = create.isPending || update.isPending;

  const handleNameChange = (value: string) => {
    setName(value);
    if (!slugTouched) setSlug(slugify(value));
  };

  const toggleDay = (day: Weekday) =>
    setDays((current) =>
      current.includes(day) ? current.filter((d) => d !== day) : [...current, day],
    );

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
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

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      {!isEdit && <h1 className={styles.heading}>{t('dashboard.new')}</h1>}

      {!isEdit && (
        <div className={styles.field}>
          <label className={styles.label} htmlFor="series-organization">
            {tDashboard('nav.organizations')}
          </label>
          <select
            id="series-organization"
            className={styles.select}
            value={activeOrganizationId}
            onChange={(event) => setOrganizationId(event.target.value)}
          >
            {organizations.map((organization) => (
              <option key={organization.id} value={organization.id}>
                {organization.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className={styles.field}>
        <label className={styles.label} htmlFor="series-name">
          {t('dashboard.name')}
        </label>
        <Input id="series-name" value={name} onChange={(e) => handleNameChange(e.target.value)} />
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="series-slug">
          {t('dashboard.slug')}
        </label>
        <Input
          id="series-slug"
          value={slug}
          readOnly={isEdit}
          pattern={SLUG_PATTERN}
          minLength={SLUG_MIN}
          maxLength={SLUG_MAX}
          onChange={(e) => {
            setSlugTouched(true);
            setSlug(e.target.value);
          }}
        />
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="series-description">
          {t('dashboard.description')}
        </label>
        <Input
          id="series-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      <fieldset className={styles.days}>
        <legend className={styles.label}>{t('dashboard.weekdays')}</legend>
        {WEEKDAYS.map((day) => (
          <label key={day} className={styles.day} htmlFor={`series-weekday-${day}`}>
            <input
              id={`series-weekday-${day}`}
              type="checkbox"
              aria-label={t(`dashboard.weekday${day}`)}
              checked={days.includes(day)}
              onChange={() => toggleDay(day)}
            />
            {t(`dashboard.weekday${day}`)}
          </label>
        ))}
      </fieldset>

      <div className={styles.row}>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="series-first-date">
            {t('dashboard.firstDate')}
          </label>
          <Input
            id="series-first-date"
            type="date"
            value={firstDate}
            onChange={(e) => setFirstDate(e.target.value)}
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="series-start-time">
            {t('dashboard.startTime')}
          </label>
          <Input
            id="series-start-time"
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
          />
        </div>
      </div>

      <div className={styles.row}>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="series-duration">
            {t('dashboard.duration')}
          </label>
          <Input
            id="series-duration"
            type="number"
            min={5}
            max={1440}
            value={durationMin}
            onChange={(e) => setDurationMin(e.target.value)}
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="series-horizon">
            {t('dashboard.horizon')}
          </label>
          <Input
            id="series-horizon"
            type="number"
            min={1}
            max={12}
            value={horizonWeeks}
            onChange={(e) => setHorizonWeeks(e.target.value)}
          />
        </div>
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="series-timezone">
          {t('dashboard.timezone')}
        </label>
        <Input
          id="series-timezone"
          list="series-timezone-options"
          value={timezone}
          onChange={(e) => setTimezone(e.target.value)}
        />
        <datalist id="series-timezone-options">
          {timezones.map((zone) => (
            <option key={zone} value={zone} />
          ))}
        </datalist>
      </div>

      <Button type="submit" disabled={isPending || !canSubmit}>
        {t('dashboard.save')}
      </Button>
    </form>
  );
}
