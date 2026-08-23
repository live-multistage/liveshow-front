'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button, Input } from '@live-show/design-system';
import {
  useUpdateChannelMutation,
  useUploadChannelCoverMutation,
} from '../../mutations/channel.mutations';
import type { Channel, ChannelAccessMode, OrgChannel } from '../../types/channel.types';
import { supportedTimezones } from '../../utils/timezone';
import styles from './ChannelForm.module.scss';

// Edit mode receives whatever the dashboard has loaded for the channel — the
// org list (with pricing) once it resolves, the public payload before that.
type ChannelFormInitial = Channel &
  Partial<Pick<OrgChannel, 'currency' | 'monthlyPriceCents' | 'yearlyPriceCents'>>;

interface Props {
  initial: ChannelFormInitial;
  onDone?: () => void;
}

const CURRENCIES = ['BRL', 'USD', 'EUR'] as const;
const MIN_PRICE_CENTS = 100;

// Major-unit input ("19,90" or "19.90") -> integer cents. Blank means "clear
// this interval's price" (`null`, sent to the backend to wipe it out) —
// distinct from an unparseable value, which is left `undefined` so it's
// simply omitted from the payload (canSubmit blocks it via pricingIsValid
// anyway).
function toCents(value: string): number | null | undefined {
  const normalized = value.trim().replace(',', '.');
  if (!normalized) return null;
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) return undefined;
  return Math.round(parsed * 100);
}

function toMajorUnits(cents: number | null | undefined): string {
  return cents == null ? '' : (cents / 100).toFixed(2);
}

const COVER_MIME_TYPES = 'image/jpeg,image/png,image/webp';

/**
 * Edição de um canal existente. A criação vive em `CreateChannelForm` — ela tem
 * layout, validação e copy próprios, e nada além do modelo de dados em comum.
 */
export function ChannelForm({ initial, onDone }: Props) {
  const t = useTranslations('channels');

  const update = useUpdateChannelMutation();
  const uploadCover = useUploadChannelCoverMutation();

  const [name, setName] = useState(initial.name);
  const [description, setDescription] = useState(initial.description ?? '');
  const [timezone, setTimezone] = useState(initial.timezone);
  const [accessMode, setAccessMode] = useState<ChannelAccessMode>(initial.accessMode);
  const [currency, setCurrency] = useState(initial.currency ?? 'BRL');
  const [monthlyPrice, setMonthlyPrice] = useState(toMajorUnits(initial.monthlyPriceCents));
  const [yearlyPrice, setYearlyPrice] = useState(toMajorUnits(initial.yearlyPriceCents));

  const timezones = useMemo(supportedTimezones, []);

  const monthlyPriceCents = toCents(monthlyPrice);
  const yearlyPriceCents = toCents(yearlyPrice);
  // Cada preço, se informado, precisa valer pelo menos 1,00 — e a assinatura
  // exige ao menos um plano configurado.
  const pricingIsValid =
    accessMode !== 'SUBSCRIPTION' ||
    (Boolean(currency) &&
      (typeof monthlyPriceCents === 'number' || typeof yearlyPriceCents === 'number') &&
      (monthlyPrice.trim() === '' ||
        (typeof monthlyPriceCents === 'number' && monthlyPriceCents >= MIN_PRICE_CENTS)) &&
      (yearlyPrice.trim() === '' ||
        (typeof yearlyPriceCents === 'number' && yearlyPriceCents >= MIN_PRICE_CENTS)));

  const canSubmit = Boolean(name.trim() && timezone.trim() && pricingIsValid);

  const handleCoverChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    uploadCover.mutate({
      id: initial.id,
      slug: initial.slug,
      organizationId: initial.organizationId,
      file,
    });
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSubmit || update.isPending) return;

    update.mutate(
      {
        id: initial.id,
        slug: initial.slug,
        organizationId: initial.organizationId,
        input: {
          name: name.trim(),
          description: description.trim() || undefined,
          timezone: timezone.trim(),
          accessMode,
          ...(accessMode === 'SUBSCRIPTION'
            ? { currency, monthlyPriceCents, yearlyPriceCents }
            : {}),
        },
      },
      { onSuccess: () => onDone?.() },
    );
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <div className={styles.field}>
        <label className={styles.label} htmlFor="channel-name">
          {t('dashboard.name')}
        </label>
        <Input id="channel-name" value={name} onChange={(e) => setName(e.target.value)} />
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="channel-slug">
          {t('dashboard.slug')}
        </label>
        {/* O backend não renomeia slug — ele fica visível só como referência. */}
        <Input id="channel-slug" value={initial.slug} readOnly />
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="channel-description">
          {t('dashboard.description')}
        </label>
        <Input
          id="channel-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="channel-timezone">
          {t('dashboard.timezone')}
        </label>
        <Input
          id="channel-timezone"
          list="channel-timezone-options"
          value={timezone}
          onChange={(e) => setTimezone(e.target.value)}
        />
        <datalist id="channel-timezone-options">
          {timezones.map((zone) => (
            <option key={zone} value={zone} />
          ))}
        </datalist>
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="channel-access-mode">
          {t('dashboard.accessMode')}
        </label>
        <select
          id="channel-access-mode"
          className={styles.select}
          value={accessMode}
          onChange={(e) => setAccessMode(e.target.value as ChannelAccessMode)}
        >
          <option value="FREE">{t('dashboard.accessFree')}</option>
          <option value="SUBSCRIPTION">{t('dashboard.accessSubscription')}</option>
        </select>
      </div>

      {accessMode === 'SUBSCRIPTION' && (
        <div className={styles.pricingGroup}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="channel-currency">
              {t('dashboard.pricing.currency')}
            </label>
            <select
              id="channel-currency"
              className={styles.select}
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
            >
              {CURRENCIES.map((code) => (
                <option key={code} value={code}>
                  {code}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="channel-monthly-price">
              {t('dashboard.pricing.monthlyPrice')}
            </label>
            <Input
              id="channel-monthly-price"
              type="number"
              min="1"
              step="0.01"
              inputMode="decimal"
              value={monthlyPrice}
              onChange={(e) => setMonthlyPrice(e.target.value)}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="channel-yearly-price">
              {t('dashboard.pricing.yearlyPrice')}
            </label>
            <Input
              id="channel-yearly-price"
              type="number"
              min="1"
              step="0.01"
              inputMode="decimal"
              value={yearlyPrice}
              onChange={(e) => setYearlyPrice(e.target.value)}
            />
          </div>

          <span className={styles.hint}>{t('dashboard.pricing.priceChangeHint')}</span>
        </div>
      )}

      <div className={styles.field}>
        <label className={styles.label} htmlFor="channel-cover">
          {t('dashboard.cover')}
        </label>
        <input
          id="channel-cover"
          type="file"
          accept={COVER_MIME_TYPES}
          className={styles.file}
          onChange={handleCoverChange}
        />
        <span className={styles.hint}>{t('dashboard.coverHint')}</span>
      </div>

      <Button type="submit" disabled={update.isPending}>
        {t('dashboard.save')}
      </Button>
    </form>
  );
}
