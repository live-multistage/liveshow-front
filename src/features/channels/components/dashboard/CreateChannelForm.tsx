'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { ChevronDown, Clock } from 'lucide-react';
import { publicOrigin } from '@/features/events/utils/slug';
import {
  DESCRIPTION_MAX,
  NAME_MAX,
  SLUG_MAX,
  SLUG_MIN,
  SLUG_PATTERN,
  useCreateChannelForm,
} from '../../hooks/useCreateChannelForm';
import { ChannelPricingForm, toCents } from './ChannelPricingForm';
import { CoverDropzone } from './CoverDropzone';
import { NextStepsAside } from './NextStepsAside';
import styles from './CreateChannelForm.module.scss';

const CHANNELS_HREF = '/dashboard/channels';
const DESCRIPTION_COUNTER_WARN = 450;

export function CreateChannelForm() {
  const t = useTranslations('channels.create');
  const tStatus = useTranslations('channels.dashboard.edit');
  const form = useCreateChannelForm();

  const isSub = form.pricing.accessMode === 'SUBSCRIPTION';
  const status: { key: 'free' | 'ready' | 'needsPrice'; tone: string } = useMemo(() => {
    if (!isSub) return { key: 'free', tone: styles.statusMuted };
    const hasPrice =
      typeof toCents(form.pricing.monthlyPrice) === 'number' ||
      typeof toCents(form.pricing.yearlyPrice) === 'number';
    return hasPrice
      ? { key: 'ready', tone: styles.statusReady }
      : { key: 'needsPrice', tone: styles.statusWarn };
  }, [isSub, form.pricing.monthlyPrice, form.pricing.yearlyPrice]);

  return (
    <div className={styles.page}>
      <nav className={styles.breadcrumb} aria-label={t('breadcrumbChannels')}>
        <Link className={styles.breadcrumbLink} href={CHANNELS_HREF}>
          {t('breadcrumbChannels')}
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
        <form className={styles.form} onSubmit={form.submit} noValidate>
          {form.organizations.length > 1 && (
            <div className={styles.field}>
              <label className={styles.label} htmlFor="channel-organization">
                {t('organizationLabel')}
                <span className={styles.required}>*</span>
              </label>
              <div className={styles.selectWrap}>
                <select
                  id="channel-organization"
                  className={`${styles.control} ${styles.controlSelect}`}
                  value={form.activeOrganizationId}
                  onChange={(event) => form.setOrganizationId(event.target.value)}
                >
                  {form.organizations.map((organization) => (
                    <option key={organization.id} value={organization.id}>
                      {organization.name}
                    </option>
                  ))}
                </select>
                <ChevronDown size={16} className={styles.selectChevron} aria-hidden="true" />
              </div>
            </div>
          )}

          <div className={styles.field}>
            <label className={styles.label} htmlFor="channel-name">
              {t('nameLabel')}
              <span className={styles.required}>*</span>
            </label>
            <input
              id="channel-name"
              className={styles.control}
              value={form.name}
              maxLength={NAME_MAX}
              placeholder={t('namePlaceholder')}
              aria-invalid={Boolean(form.nameError)}
              aria-describedby={form.nameError ? 'channel-name-error' : undefined}
              onChange={(event) => form.changeName(event.target.value)}
              onBlur={form.blurName}
            />
            {form.nameError && (
              <span className={styles.error} id="channel-name-error" role="alert">
                {form.nameError}
              </span>
            )}
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="channel-slug">
              {t('slugLabel')}
              <span className={styles.required}>*</span>
            </label>
            <input
              id="channel-slug"
              className={`${styles.control} ${styles.controlMono}`}
              value={form.slug}
              pattern={SLUG_PATTERN}
              minLength={SLUG_MIN}
              maxLength={SLUG_MAX}
              placeholder={t('slugPlaceholder')}
              aria-invalid={Boolean(form.slugError)}
              aria-describedby={form.slugError ? 'channel-slug-error' : undefined}
              onChange={(event) => form.changeSlug(event.target.value)}
              onBlur={form.blurSlug}
            />
            <span className={styles.slugPreview}>
              {publicOrigin().replace(/^https?:\/\//, '')}/channels/
              <span className={styles.slugPreviewValue}>
                {form.slug || t('slugPlaceholder')}
              </span>
            </span>
            {form.slugError && (
              <span className={styles.error} id="channel-slug-error" role="alert">
                {form.slugError}
              </span>
            )}
          </div>

          <div className={styles.field}>
            <div className={styles.labelRow}>
              <label className={styles.label} htmlFor="channel-description">
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
              id="channel-description"
              className={`${styles.control} ${styles.textarea}`}
              rows={3}
              maxLength={DESCRIPTION_MAX}
              placeholder={t('descriptionPlaceholder')}
              value={form.description}
              onChange={(event) => form.setDescription(event.target.value)}
            />
          </div>

          <CoverDropzone file={form.cover} error={form.coverError} onChange={form.changeCover} />

          <div className={styles.field}>
            <label className={styles.label} htmlFor="channel-timezone">
              {t('timezoneLabel')}
              <span className={styles.required}>*</span>
            </label>
            <div className={styles.selectWrap}>
              <Clock size={16} className={styles.selectIconLeft} aria-hidden="true" />
              <select
                id="channel-timezone"
                className={`${styles.control} ${styles.controlSelect} ${styles.controlSelectIndent}`}
                value={form.timezone}
                onChange={(event) => form.setTimezone(event.target.value)}
              >
                {form.timezones.map((zone) => (
                  <option key={zone} value={zone}>
                    {zone}
                  </option>
                ))}
              </select>
              <ChevronDown size={16} className={styles.selectChevron} aria-hidden="true" />
            </div>
            <span className={styles.help}>{t('timezoneHelp')}</span>
          </div>

          <ChannelPricingForm value={form.pricing} onChange={form.setPricing} />

          <div className={styles.actions}>
            <button type="submit" className={styles.submit} disabled={!form.canSubmit}>
              {form.isPending && <span className={styles.spinner} aria-hidden="true" />}
              {form.isPending ? t('submitting') : t('submit')}
            </button>
            <Link className={styles.cancel} href={CHANNELS_HREF}>
              {t('cancel')}
            </Link>
            <span className={styles.actionsSpacer} />
            <span className={`${styles.statusLine} ${status.tone}`}>
              {tStatus(`status.${status.key}`)}
            </span>
          </div>
        </form>

        <NextStepsAside />
      </div>
    </div>
  );
}
