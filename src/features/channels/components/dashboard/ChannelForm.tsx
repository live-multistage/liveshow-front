'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Button, Input } from '@live-show/design-system';
import { useMyOrganizationsQuery } from '@/features/organizations/queries/get-my-organizations';
import {
  useCreateChannelMutation,
  useUpdateChannelMutation,
  useUploadChannelCoverMutation,
} from '../../mutations/channel.mutations';
import type { Channel, ChannelAccessMode, OrgChannel } from '../../types/channel.types';
import styles from './ChannelForm.module.scss';

// Edit mode receives whatever the dashboard has loaded for the channel — the
// org list (with pricing) once it resolves, the public payload before that.
type ChannelFormInitial = Channel &
  Partial<Pick<OrgChannel, 'currency' | 'monthlyPriceCents' | 'yearlyPriceCents'>>;

interface Props {
  mode?: 'create' | 'edit';
  initial?: ChannelFormInitial;
  onDone?: () => void;
}

const CURRENCIES = ['BRL', 'USD', 'EUR'] as const;
const MIN_PRICE_CENTS = 100;

// Major-unit input ("19,90" or "19.90") -> integer cents. Empty/blank means
// "no price for this interval", not zero.
function toCents(value: string): number | undefined {
  const normalized = value.trim().replace(',', '.');
  if (!normalized) return undefined;
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) return undefined;
  return Math.round(parsed * 100);
}

function toMajorUnits(cents: number | null | undefined): string {
  return cents == null ? '' : (cents / 100).toFixed(2);
}

// Mesmo formato que o backend valida no slug do canal.
const SLUG_PATTERN = '[a-z0-9]+(-[a-z0-9]+)*';
const SLUG_REGEX = new RegExp(`^${SLUG_PATTERN}$`);
const SLUG_MIN = 3;
const SLUG_MAX = 80;

const COVER_MIME_TYPES = 'image/jpeg,image/png,image/webp';

export const slugify = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, SLUG_MAX);

// Fuso do navegador como padrão: quem cria o canal quase sempre está no fuso
// em que ele vai ao ar, e digitar "America/Sao_Paulo" à mão é um convite a erro.
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

export function ChannelForm({ mode = 'create', initial, onDone }: Props) {
  const t = useTranslations('channels');
  const tDashboard = useTranslations('dashboard');
  const router = useRouter();
  const { data: organizations = [] } = useMyOrganizationsQuery();

  const create = useCreateChannelMutation();
  const update = useUpdateChannelMutation();
  const uploadCover = useUploadChannelCoverMutation();

  const isEdit = mode === 'edit' && Boolean(initial);

  const [organizationId, setOrganizationId] = useState('');
  const [name, setName] = useState(initial?.name ?? '');
  const [slug, setSlug] = useState(initial?.slug ?? '');
  const [slugTouched, setSlugTouched] = useState(isEdit);
  const [description, setDescription] = useState(initial?.description ?? '');
  const [timezone, setTimezone] = useState(initial?.timezone ?? browserTimezone);
  const [accessMode, setAccessMode] = useState<ChannelAccessMode>(initial?.accessMode ?? 'FREE');
  const [currency, setCurrency] = useState(initial?.currency ?? 'BRL');
  const [monthlyPrice, setMonthlyPrice] = useState(toMajorUnits(initial?.monthlyPriceCents));
  const [yearlyPrice, setYearlyPrice] = useState(toMajorUnits(initial?.yearlyPriceCents));

  const timezones = useMemo(supportedTimezones, []);

  // A primeira organização é o padrão implícito: quem só tem uma nunca precisa
  // tocar no seletor.
  const activeOrganizationId =
    initial?.organizationId || organizationId || organizations[0]?.id || '';

  const slugIsValid = slug.length >= SLUG_MIN && slug.length <= SLUG_MAX && SLUG_REGEX.test(slug);

  const monthlyPriceCents = toCents(monthlyPrice);
  const yearlyPriceCents = toCents(yearlyPrice);
  // Cada preço, se informado, precisa valer pelo menos 1,00 — e a assinatura
  // exige ao menos um plano configurado.
  const pricingIsValid =
    accessMode !== 'SUBSCRIPTION' ||
    (Boolean(currency) &&
      (monthlyPriceCents !== undefined || yearlyPriceCents !== undefined) &&
      (monthlyPrice.trim() === '' || (monthlyPriceCents ?? 0) >= MIN_PRICE_CENTS) &&
      (yearlyPrice.trim() === '' || (yearlyPriceCents ?? 0) >= MIN_PRICE_CENTS));

  const canSubmit = isEdit
    ? Boolean(name.trim() && timezone.trim() && pricingIsValid)
    : Boolean(activeOrganizationId && name.trim() && slugIsValid && timezone.trim());
  const isPending = create.isPending || update.isPending;

  // O slug acompanha o nome até alguém editá-lo à mão — depois disso ele é do
  // usuário, e no modo edição ele nem muda (o backend não renomeia slug).
  const handleNameChange = (value: string) => {
    setName(value);
    if (!slugTouched) setSlug(slugify(value));
  };

  const handleCoverChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !initial) return;
    uploadCover.mutate({
      id: initial.id,
      slug: initial.slug,
      organizationId: initial.organizationId,
      file,
    });
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSubmit || isPending) return;

    if (isEdit && initial) {
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
      return;
    }

    create.mutate(
      {
        organizationId: activeOrganizationId,
        name: name.trim(),
        slug: slug.trim(),
        description: description.trim() || undefined,
        timezone: timezone.trim(),
        accessMode,
      },
      {
        onSuccess: (channel) => {
          onDone?.();
          router.push(`/dashboard/channels/${channel.slug}`);
        },
      },
    );
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      {!isEdit && <h1 className={styles.heading}>{t('dashboard.new')}</h1>}

      {!isEdit && (
        <div className={styles.field}>
          <label className={styles.label} htmlFor="channel-organization">
            {tDashboard('nav.organizations')}
          </label>
          <select
            id="channel-organization"
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
        <label className={styles.label} htmlFor="channel-name">
          {t('dashboard.name')}
        </label>
        <Input
          id="channel-name"
          value={name}
          onChange={(e) => handleNameChange(e.target.value)}
        />
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="channel-slug">
          {t('dashboard.slug')}
        </label>
        <Input
          id="channel-slug"
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

      {!isEdit && accessMode === 'SUBSCRIPTION' && (
        <span className={styles.hint}>{t('dashboard.pricing.setPriceAfterCreate')}</span>
      )}

      {isEdit && (
        <>
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
        </>
      )}

      <Button type="submit" disabled={isPending}>
        {t('dashboard.save')}
      </Button>
    </form>
  );
}
