'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@live-show/design-system';
import { useUpdateChannelMutation } from '../../mutations/channel.mutations';
import type { Channel, ChannelAccessMode, OrgChannel } from '../../types/channel.types';
import { ChannelAccessModeCards } from './ChannelAccessModeCards';
import styles from './ChannelForm.module.scss';

const CURRENCY_SYMBOL: Record<string, string> = { BRL: 'R$', USD: '$', EUR: '€' };

// Edit mode receives whatever the dashboard has loaded for the channel — the
// org list (with pricing) once it resolves, the public payload before that.
type PricingInitial = Channel &
  Partial<Pick<OrgChannel, 'currency' | 'monthlyPriceCents' | 'yearlyPriceCents'>>;

export interface PricingValue {
  accessMode: ChannelAccessMode;
  currency: string;
  monthlyPrice: string;
  yearlyPrice: string;
}

const CURRENCIES = ['BRL', 'USD', 'EUR'] as const;
export const MIN_PRICE_CENTS = 100;

// Major-unit input ("19,90" or "19.90") -> integer cents. Blank means "clear
// this interval's price" (`null`, sent to the backend to wipe it out) —
// distinct from an unparseable value, which is left `undefined` so it's
// simply omitted from the payload (canSubmit blocks it via pricingIsValid
// anyway).
export function toCents(value: string): number | null | undefined {
  const normalized = value.trim().replace(',', '.');
  if (!normalized) return null;
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) return undefined;
  return Math.round(parsed * 100);
}

export function toMajorUnits(cents: number | null | undefined): string {
  return cents == null ? '' : (cents / 100).toFixed(2);
}

export function pricingValueFromChannel(initial: PricingInitial): PricingValue {
  return {
    accessMode: initial.accessMode,
    currency: initial.currency ?? 'BRL',
    monthlyPrice: toMajorUnits(initial.monthlyPriceCents),
    yearlyPrice: toMajorUnits(initial.yearlyPriceCents),
  };
}

export const emptyPricingValue: PricingValue = {
  accessMode: 'FREE',
  currency: 'BRL',
  monthlyPrice: '',
  yearlyPrice: '',
};

// Cada preço, se informado, precisa valer pelo menos 1,00 — e a assinatura
// exige ao menos um plano configurado.
export function isPricingValid(value: PricingValue): boolean {
  const monthlyPriceCents = toCents(value.monthlyPrice);
  const yearlyPriceCents = toCents(value.yearlyPrice);
  return (
    value.accessMode !== 'SUBSCRIPTION' ||
    (Boolean(value.currency) &&
      (typeof monthlyPriceCents === 'number' || typeof yearlyPriceCents === 'number') &&
      (value.monthlyPrice.trim() === '' ||
        (typeof monthlyPriceCents === 'number' && monthlyPriceCents >= MIN_PRICE_CENTS)) &&
      (value.yearlyPrice.trim() === '' ||
        (typeof yearlyPriceCents === 'number' && yearlyPriceCents >= MIN_PRICE_CENTS)))
  );
}

interface FieldsProps {
  value: PricingValue;
  onChange: (value: PricingValue) => void;
}

function PricingFields({ value, onChange }: FieldsProps) {
  const t = useTranslations('channels');
  const tEdit = useTranslations('channels.dashboard.edit');
  const symbol = CURRENCY_SYMBOL[value.currency] ?? 'R$';

  const yearlyEquiv = useMemo(() => {
    const cents = toCents(value.yearlyPrice);
    if (typeof cents !== 'number' || cents <= 0) return null;
    return `${symbol} ${(cents / 12 / 100).toFixed(2).replace('.', ',')}`;
  }, [value.yearlyPrice, symbol]);

  return (
    <>
      <ChannelAccessModeCards
        value={value.accessMode}
        onChange={(accessMode) => onChange({ ...value, accessMode })}
      />

      {value.accessMode === 'SUBSCRIPTION' && (
        <div className={styles.pricingGroup}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="channel-currency">
              {t('dashboard.pricing.currency')}
            </label>
            {/* ponytail: a real <select> stays the accessible/tested control —
                keeping the visual a segmented toggle would need a second,
                unlabeled control just for looks. */}
            <select
              id="channel-currency"
              className={`${styles.select} ${styles.currencySelect}`}
              value={value.currency}
              onChange={(e) => onChange({ ...value, currency: e.target.value })}
            >
              {CURRENCIES.map((code) => (
                <option key={code} value={code}>
                  {code}
                </option>
              ))}
            </select>
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
                  type="number"
                  min="1"
                  step="0.01"
                  inputMode="decimal"
                  placeholder="0,00"
                  value={value.monthlyPrice}
                  onChange={(e) => onChange({ ...value, monthlyPrice: e.target.value })}
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
                  type="number"
                  min="1"
                  step="0.01"
                  inputMode="decimal"
                  placeholder="0,00"
                  value={value.yearlyPrice}
                  onChange={(e) => onChange({ ...value, yearlyPrice: e.target.value })}
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
    </>
  );
}

interface StandaloneProps {
  initial: PricingInitial;
  onDone?: () => void;
}

interface EmbeddedProps {
  value: PricingValue;
  onChange: (value: PricingValue) => void;
}

function StandaloneChannelPricingForm({ initial, onDone }: StandaloneProps) {
  const t = useTranslations('channels');
  const update = useUpdateChannelMutation();
  const [value, setValue] = useState<PricingValue>(() => pricingValueFromChannel(initial));

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!isPricingValid(value) || update.isPending) return;

    update.mutate(
      {
        id: initial.id,
        slug: initial.slug,
        organizationId: initial.organizationId,
        input: {
          accessMode: value.accessMode,
          ...(value.accessMode === 'SUBSCRIPTION'
            ? {
                currency: value.currency,
                monthlyPriceCents: toCents(value.monthlyPrice),
                yearlyPriceCents: toCents(value.yearlyPrice),
              }
            : {}),
        },
      },
      { onSuccess: () => onDone?.() },
    );
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <PricingFields value={value} onChange={setValue} />
      <Button type="submit" disabled={update.isPending}>
        {t('dashboard.save')}
      </Button>
    </form>
  );
}

/**
 * Acesso e preço de um canal. Modo standalone (`initial`/`onDone`) submete
 * sozinho via `useUpdateChannelMutation`; modo embutido (`value`/`onChange`)
 * só expõe os campos controlados, para o formulário de criação decidir
 * quando enviar.
 */
export function ChannelPricingForm(props: StandaloneProps | EmbeddedProps) {
  if ('value' in props) return <PricingFields value={props.value} onChange={props.onChange} />;
  return <StandaloneChannelPricingForm {...props} />;
}
