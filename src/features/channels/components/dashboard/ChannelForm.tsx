'use client';

import { useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Clock, Info, Lock, Pencil, Upload } from 'lucide-react';
import {
  useUpdateChannelMutation,
  useUploadChannelCoverMutation,
} from '../../mutations/channel.mutations';
import type { Channel, ChannelAccessMode, OrgChannel } from '../../types/channel.types';
import { supportedTimezones } from '../../utils/timezone';
import {
  toCents,
  pricingValueFromChannel,
  isPricingValid,
  type PricingValue,
} from './ChannelPricingForm';
import styles from './ChannelForm.module.scss';

// Edit mode receives whatever the dashboard has loaded — the org payload (with
// pricing) once it resolves, the public payload before that.
type ChannelFormInitial = Channel &
  Partial<Pick<OrgChannel, 'currency' | 'monthlyPriceCents' | 'yearlyPriceCents'>>;

interface Props {
  initial: ChannelFormInitial;
  onDone?: () => void;
  onCancel?: () => void;
}

const COVER_MIME_TYPES = 'image/jpeg,image/png,image/webp';
const CURRENCIES = ['BRL', 'USD', 'EUR'] as const;
const CURRENCY_SYMBOL: Record<string, string> = { BRL: 'R$', USD: '$', EUR: '€' };

/**
 * Modal de edição de canal (Showon Editar Canal): identidade (nome, slug fixo,
 * descrição, fuso, capa) e acesso/assinatura (modo + moeda + preços) num só
 * formulário. Criação vive em `CreateChannelForm`, com copy e validação
 * próprias.
 */
export function ChannelForm({ initial, onDone, onCancel }: Props) {
  const t = useTranslations('channels');
  const tCreate = useTranslations('channels.create');
  const tEdit = useTranslations('channels.dashboard.edit');

  const update = useUpdateChannelMutation();
  const uploadCover = useUploadChannelCoverMutation();
  const fileRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(initial.name);
  const [description, setDescription] = useState(initial.description ?? '');
  const [timezone, setTimezone] = useState(initial.timezone);
  const [pricing, setPricing] = useState<PricingValue>(() => pricingValueFromChannel(initial));

  const timezones = useMemo(supportedTimezones, []);
  const isSub = pricing.accessMode === 'SUBSCRIPTION';
  const symbol = CURRENCY_SYMBOL[pricing.currency] ?? 'R$';

  const canSubmit = Boolean(name.trim() && timezone.trim() && isPricingValid(pricing));

  const yearlyEquiv = useMemo(() => {
    const cents = toCents(pricing.yearlyPrice);
    if (typeof cents !== 'number' || cents <= 0) return null;
    return `${symbol} ${(cents / 12 / 100).toFixed(2).replace('.', ',')}`;
  }, [pricing.yearlyPrice, symbol]);

  const status: { key: 'free' | 'ready' | 'needsPrice'; tone: string } = useMemo(() => {
    if (!isSub) return { key: 'free', tone: styles.statusMuted };
    const hasPrice =
      typeof toCents(pricing.monthlyPrice) === 'number' ||
      typeof toCents(pricing.yearlyPrice) === 'number';
    return hasPrice
      ? { key: 'ready', tone: styles.statusReady }
      : { key: 'needsPrice', tone: styles.statusWarn };
  }, [isSub, pricing.monthlyPrice, pricing.yearlyPrice]);

  function setAccess(mode: ChannelAccessMode) {
    setPricing((prev) => ({ ...prev, accessMode: mode }));
  }

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
          accessMode: pricing.accessMode,
          ...(isSub
            ? {
                currency: pricing.currency,
                monthlyPriceCents: toCents(pricing.monthlyPrice),
                yearlyPriceCents: toCents(pricing.yearlyPrice),
              }
            : {}),
        },
      },
      { onSuccess: () => onDone?.() },
    );
  };

  return (
    <form className={styles.modal} onSubmit={handleSubmit}>
      <header className={styles.header}>
        <span className={styles.headerIcon}>
          <Pencil size={18} strokeWidth={2} aria-hidden="true" />
        </span>
        <div className={styles.headerText}>
          <h2 className={styles.title}>{t('detail.editTitle')}</h2>
          <span className={styles.headerSlug}>{initial.slug}</span>
        </div>
      </header>

      <div className={styles.body}>
        <span className={styles.section}>{tEdit('identity')}</span>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="channel-name">
            {t('dashboard.name')}
          </label>
          <input
            id="channel-name"
            className={styles.input}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div className={styles.field}>
          <div className={styles.labelRow}>
            <label className={styles.label} htmlFor="channel-slug">
              {t('dashboard.slug')}
            </label>
            <span className={styles.fixedTag}>
              <Lock size={9} strokeWidth={2.4} aria-hidden="true" />
              {tEdit('slugFixed')}
            </span>
          </div>
          {/* O backend não renomeia slug — visível só como referência. */}
          <input id="channel-slug" className={styles.inputReadonly} value={initial.slug} readOnly />
          <span className={styles.hint}>{tEdit('slugHint')}</span>
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="channel-description">
            {t('dashboard.description')}
          </label>
          <textarea
            id="channel-description"
            className={styles.textarea}
            rows={3}
            placeholder={tEdit('descriptionPlaceholder')}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="channel-timezone">
            {t('dashboard.timezone')}
          </label>
          <div className={styles.selectWrap}>
            <Clock size={16} className={styles.selectIcon} aria-hidden="true" />
            <select
              id="channel-timezone"
              className={styles.select}
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
            >
              {timezones.map((zone) => (
                <option key={zone} value={zone}>
                  {zone}
                </option>
              ))}
            </select>
          </div>
          <span className={styles.hint}>{tEdit('timezoneHint')}</span>
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="channel-cover">
            {t('dashboard.cover')}
          </label>
          <div className={styles.dropzone}>
            <span className={styles.coverThumb} aria-hidden="true">
              {initial.coverUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={initial.coverUrl} alt="" className={styles.coverImage} />
              )}
            </span>
            <div className={styles.dropzoneText}>
              <button
                type="button"
                className={styles.coverButton}
                onClick={() => fileRef.current?.click()}
                disabled={uploadCover.isPending}
              >
                <Upload size={14} strokeWidth={2} aria-hidden="true" />
                {tEdit('coverChange')}
              </button>
              <span className={styles.hint}>{t('dashboard.coverHint')}</span>
            </div>
            <input
              ref={fileRef}
              id="channel-cover"
              type="file"
              accept={COVER_MIME_TYPES}
              className={styles.fileHidden}
              onChange={handleCoverChange}
            />
          </div>
        </div>

        <div className={styles.divider} />
        <span className={styles.section}>{tEdit('accessSection')}</span>

        <div className={styles.accessGroup} role="radiogroup" aria-label={t('dashboard.accessMode')}>
          <AccessCard
            selected={!isSub}
            title={tCreate('accessFreeTitle')}
            description={tCreate('accessFreeDescription')}
            onSelect={() => setAccess('FREE')}
          />
          <AccessCard
            selected={isSub}
            title={tCreate('accessSubscriptionTitle')}
            description={tCreate('accessSubscriptionDescription')}
            onSelect={() => setAccess('SUBSCRIPTION')}
          />
        </div>

        {isSub && (
          <div className={styles.pricing}>
            <p className={styles.notice}>
              <Info size={15} className={styles.noticeIcon} aria-hidden="true" />
              <span>{tCreate('subscriptionNotice')}</span>
            </p>

            <div className={styles.field}>
              <span className={styles.label}>{t('dashboard.pricing.currency')}</span>
              <div className={styles.currencyRow}>
                {CURRENCIES.map((code) => (
                  <button
                    key={code}
                    type="button"
                    className={clsxCurrency(code === pricing.currency)}
                    onClick={() => setPricing((prev) => ({ ...prev, currency: code }))}
                  >
                    {code}
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.priceGrid}>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="channel-monthly-price">
                  {t('dashboard.pricing.monthlyPrice')}
                </label>
                <div className={styles.priceInputWrap}>
                  <span className={styles.priceSymbol}>{symbol}</span>
                  <input
                    id="channel-monthly-price"
                    className={styles.priceInput}
                    inputMode="decimal"
                    placeholder="0,00"
                    value={pricing.monthlyPrice}
                    onChange={(e) => setPricing((prev) => ({ ...prev, monthlyPrice: e.target.value }))}
                  />
                </div>
                <span className={styles.priceUnit}>{tEdit('perMonth')}</span>
              </div>

              <div className={styles.field}>
                <label className={styles.label} htmlFor="channel-yearly-price">
                  {t('dashboard.pricing.yearlyPrice')}
                </label>
                <div className={styles.priceInputWrap}>
                  <span className={styles.priceSymbol}>{symbol}</span>
                  <input
                    id="channel-yearly-price"
                    className={styles.priceInput}
                    inputMode="decimal"
                    placeholder="0,00"
                    value={pricing.yearlyPrice}
                    onChange={(e) => setPricing((prev) => ({ ...prev, yearlyPrice: e.target.value }))}
                  />
                </div>
                <span className={styles.priceUnit}>
                  {yearlyEquiv ? tEdit('yearlyEquiv', { price: yearlyEquiv }) : tEdit('perYearShort')}
                </span>
              </div>
            </div>

            <span className={styles.hint}>{t('dashboard.pricing.priceChangeHint')}</span>
          </div>
        )}
      </div>

      <footer className={styles.footer}>
        <span className={`${styles.status} ${status.tone}`}>{tEdit(`status.${status.key}`)}</span>
        <button type="button" className={styles.cancel} onClick={onCancel}>
          {t('dashboard.cancel')}
        </button>
        <button type="submit" className={styles.save} disabled={!canSubmit || update.isPending}>
          {t('dashboard.save')}
        </button>
      </footer>
    </form>
  );
}

function clsxCurrency(active: boolean): string {
  return active ? `${styles.currency} ${styles.currencyActive}` : styles.currency;
}

interface AccessCardProps {
  selected: boolean;
  title: string;
  description: string;
  onSelect: () => void;
}

function AccessCard({ selected, title, description, onSelect }: AccessCardProps) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      aria-label={title}
      className={selected ? `${styles.accessCard} ${styles.accessCardSelected}` : styles.accessCard}
      onClick={onSelect}
    >
      <span className={selected ? `${styles.accessRadio} ${styles.accessRadioOn}` : styles.accessRadio}>
        {selected && <span className={styles.accessRadioDot} />}
      </span>
      <span>
        <span className={styles.accessTitle}>{title}</span>
        <span className={styles.accessDescription}>{description}</span>
      </span>
    </button>
  );
}
