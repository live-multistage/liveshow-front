'use client';

import Link from 'next/link';
import { DurationField, SummaryBox, WeekdayToggles } from '@/features/channels/components/dashboard';
import {
  useSeriesForm,
  DURATION_PRESETS,
  DESCRIPTION_MAX,
  NAME_MAX,
  SLUG_MAX,
  SLUG_MIN,
  SLUG_PATTERN,
} from '../../hooks/useSeriesForm';
import type { SeriesResponse } from '../../types/series.types';
import { SeriesNextStepsAside } from './SeriesNextStepsAside';
import styles from './SeriesForm.module.scss';

interface Props {
  mode?: 'create' | 'edit';
  initial?: SeriesResponse;
  onDone?: () => void;
}

const SERIES_HREF = '/dashboard/series';
const DESCRIPTION_COUNTER_WARN = 450;

export function SeriesForm({ mode = 'create', initial, onDone }: Props) {
  const form = useSeriesForm({ mode, initial, onDone });
  const t = form.t;

  const fields = (
    <>
      {!form.isEdit && form.organizations.length > 1 && (
        <div className={styles.field}>
          <label className={styles.label} htmlFor="series-organization">
            {t('organizationLabel')}
            <span className={styles.required}>*</span>
          </label>
          <select
            id="series-organization"
            className={styles.control}
            value={form.activeOrganizationId}
            onChange={(event) => form.setOrganizationId(event.target.value)}
          >
            {form.organizations.map((organization) => (
              <option key={organization.id} value={organization.id}>
                {organization.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className={styles.field}>
        <label className={styles.label} htmlFor="series-name">
          {t('nameLabel')}
          <span className={styles.required}>*</span>
        </label>
        <input
          id="series-name"
          className={styles.control}
          value={form.name}
          maxLength={NAME_MAX}
          placeholder={t('namePlaceholder')}
          onChange={(event) => form.changeName(event.target.value)}
        />
      </div>

      {!form.isEdit && (
        <div className={styles.field}>
          <label className={styles.label} htmlFor="series-slug">
            {t('slugLabel')}
            <span className={styles.required}>*</span>
          </label>
          <input
            id="series-slug"
            className={`${styles.control} ${styles.controlMono}`}
            value={form.slug}
            pattern={SLUG_PATTERN}
            minLength={SLUG_MIN}
            maxLength={SLUG_MAX}
            onChange={(event) => form.changeSlug(event.target.value)}
          />
          <span className={styles.slugPreview}>
            {form.slugPreviewOrigin}/series/
            <span className={styles.slugPreviewValue}>{form.slug || t('slugPlaceholder')}</span>
          </span>
        </div>
      )}

      <div className={styles.field}>
        <div className={styles.labelRow}>
          <label className={styles.label} htmlFor="series-description">
            {t('descriptionLabel')}{' '}
            <span className={styles.optional}>({t('descriptionOptional')})</span>
          </label>
          <span
            className={`${styles.counter} ${
              form.description.length > DESCRIPTION_COUNTER_WARN ? styles.counterNear : ''
            }`}
          >
            {form.description.length}/{DESCRIPTION_MAX}
          </span>
        </div>
        <textarea
          id="series-description"
          className={`${styles.control} ${styles.textarea}`}
          rows={3}
          maxLength={DESCRIPTION_MAX}
          placeholder={t('descriptionPlaceholder')}
          value={form.description}
          onChange={(event) => form.setDescription(event.target.value)}
        />
      </div>

      <WeekdayToggles
        legend={t('weekdaysLabel')}
        dayLabels={form.dayLabels}
        days={form.days}
        onToggleDay={form.toggleDay}
        quickPicks={[
          { label: t('presetWeekdays'), onClick: form.pickWeekdays },
          { label: t('presetAllDays'), onClick: form.pickAllDays },
        ]}
        error={form.daysError}
      />

      <div className={styles.row}>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="series-first-date">
            {t('firstDateLabel')}
            <span className={styles.required}>*</span>
          </label>
          <input
            id="series-first-date"
            type="date"
            className={styles.control}
            value={form.firstDate}
            onChange={(event) => form.setFirstDate(event.target.value)}
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="series-start-time">
            {t('startLabel')}
            <span className={styles.required}>*</span>
          </label>
          <input
            id="series-start-time"
            type="time"
            className={`${styles.control} ${styles.controlMono}`}
            value={form.startTime}
            onChange={(event) => form.setStartTime(event.target.value)}
          />
          <span className={styles.hint}>
            {t('timezoneHint', { timezone: form.timezone.toUpperCase() })}
          </span>
        </div>
      </div>

      <DurationField
        id="series-duration"
        label={t('durationLabel')}
        suffix={t('durationSuffix')}
        value={form.durationMin}
        onChange={form.setDurationMin}
        presets={DURATION_PRESETS.map((minutes) => ({
          minutes,
          label: t(`durationPreset${minutes}`),
        }))}
        onPreset={form.applyDurationPreset}
        error={form.durationError}
      />

      <div className={styles.field}>
        <label className={styles.label} htmlFor="series-timezone">
          {t('timezoneLabel')}
          <span className={styles.required}>*</span>
        </label>
        <select
          id="series-timezone"
          className={styles.control}
          value={form.timezone}
          onChange={(event) => form.setTimezone(event.target.value)}
        >
          {form.timezones.map((zone) => (
            <option key={zone} value={zone}>
              {zone}
            </option>
          ))}
        </select>
        <span className={styles.help}>{t('timezoneHelp')}</span>
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="series-horizon">
          {t('horizonLabel')}
          <span className={styles.required}>*</span>
        </label>
        <input
          id="series-horizon"
          type="number"
          min={1}
          max={12}
          className={`${styles.control} ${styles.controlNarrow}`}
          value={form.horizonWeeks}
          onChange={(event) => form.setHorizonWeeks(event.target.value)}
        />
        <span className={styles.help}>{t('horizonHint')}</span>
      </div>

      <SummaryBox label={t('summaryLabel')} summary={form.summary} placeholder={t('summaryPlaceholder')} />
    </>
  );

  if (form.isEdit) {
    return (
      <form className={styles.editForm} onSubmit={form.handleSubmit} noValidate>
        {fields}
        <div className={styles.editActions}>
          <button type="submit" className={styles.submit} disabled={!form.canSubmit || form.isPending}>
            {form.isPending && <span className={styles.spinner} aria-hidden="true" />}
            {form.isPending ? t('submitting') : t('save')}
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className={styles.page}>
      <nav className={styles.breadcrumb} aria-label={t('breadcrumbSeries')}>
        <Link className={styles.breadcrumbLink} href={SERIES_HREF}>
          {t('breadcrumbSeries')}
        </Link>
        <span aria-hidden="true">/</span>
        <span className={styles.breadcrumbCurrent} aria-current="page">
          {t('breadcrumbCurrent')}
        </span>
      </nav>

      <span className={styles.eyebrow}>{t('eyebrow')}</span>
      <h1 className={styles.title}>{t('title')}</h1>
      <p className={styles.lead}>{t('lead')}</p>

      <div className={styles.layout}>
        <form className={styles.form} onSubmit={form.handleSubmit} noValidate>
          {fields}

          <div className={styles.actions}>
            <button type="submit" className={styles.submit} disabled={!form.canSubmit || form.isPending}>
              {form.isPending && <span className={styles.spinner} aria-hidden="true" />}
              {form.isPending ? t('submitting') : t('submit')}
            </button>
            <Link className={styles.cancel} href={SERIES_HREF}>
              {t('cancel')}
            </Link>
          </div>
        </form>

        <SeriesNextStepsAside />
      </div>
    </div>
  );
}
