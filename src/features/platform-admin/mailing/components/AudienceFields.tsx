'use client';

import { useId } from 'react';
import { useTranslations } from 'next-intl';
import { Input } from '@live-show/design-system';
import {
  MAILING_APPLICATION_KINDS, MAILING_APPLICATION_STATUSES, MAILING_AUDIENCE_GROUPS, MAILING_AUDIENCE_SPECS,
  MAILING_EVENT_CATEGORIES, mailingAudienceSchema,
  type AudienceCountResponse, type MailingAudience, type MailingAudienceType, type MailingCategory,
} from '@live-show/api-contracts';
import { ChoiceSelect, Field, fieldA11y } from './BlockInspector';
import { AudienceParamField } from './AudienceParamField';
import styles from './CampaignWizard.module.scss';

/** Builds a fresh audience for `type`: int params get their spec default, optional params are omitted. */
export function emptyAudience(type: MailingAudienceType): MailingAudience {
  const spec = MAILING_AUDIENCE_SPECS[type];
  const audience: Record<string, unknown> = { type };
  for (const [key, paramSpec] of Object.entries(spec)) {
    if (paramSpec.optional) continue;
    if (paramSpec.kind === 'int') audience[key] = paramSpec.default ?? paramSpec.min ?? 0;
    else if (paramSpec.kind === 'eventCategory') audience[key] = MAILING_EVENT_CATEGORIES[0];
    else if (paramSpec.kind === 'applicationKind') audience[key] = MAILING_APPLICATION_KINDS[0];
    else if (paramSpec.kind === 'applicationStatus') audience[key] = MAILING_APPLICATION_STATUSES[0];
    else audience[key] = '';
  }
  return audience as MailingAudience;
}

// ChoiceSelect (a flat CustomSelect) can't render group headers, so each option is
// prefixed with its group label instead.
const TYPE_OPTIONS = MAILING_AUDIENCE_GROUPS.flatMap((group) => group.types.map((type) => ({ type, groupId: group.id })));

// Widgets that need their own row (search pickers), vs. compact controls sharing the grid.
const FULL_WIDTH_KINDS = new Set(['eventId', 'organizationId', 'artistId']);

interface Props {
  value: MailingAudience;
  onChange(a: MailingAudience): void;
  category: MailingCategory;
  count: { data?: AudienceCountResponse; isLoading: boolean; isError: boolean };
}

export function AudienceFields({ value, onChange, count }: Props) {
  const t = useTranslations('platformAdmin.mailing');
  const uid = useId();
  const id = (key: string) => `${uid}-${key}`;
  const parsed = mailingAudienceSchema.safeParse(value);
  const errorFor = (key: string) => parsed.error?.issues.find((issue) => issue.path[0] === key)?.message;
  const countryError = value.country === undefined ? undefined : errorFor('country');
  const spec = MAILING_AUDIENCE_SPECS[value.type];

  // R15: ISO-2 uppercase; an empty field drops the key (= every country).
  const setCountry = (raw: string) => {
    const { country: _previous, ...rest } = value;
    const country = raw.toUpperCase().replace(/[^A-Z]/g, '');
    onChange((country ? { ...rest, country } : rest) as MailingAudience);
  };

  return (
    <div className={styles.fields}>
      <Field id={id('type')} label={t('audience.typeLabel')} className={styles.full}>
        <ChoiceSelect
          id={id('type')}
          value={value.type}
          onChange={(type) => {
            if (type === value.type) return;
            const next = emptyAudience(type as MailingAudienceType);
            onChange(value.country ? ({ ...next, country: value.country } as MailingAudience) : next);
          }}
          options={TYPE_OPTIONS.map(({ type, groupId }) => ({
            value: type,
            label: `${t(`audience.group.${groupId}`)} — ${t(`audience.type.${type}`)}`,
          }))}
        />
      </Field>

      {Object.entries(spec).map(([key, paramSpec]) => (
        <div key={key} className={FULL_WIDTH_KINDS.has(paramSpec.kind) ? styles.full : undefined}>
          <AudienceParamField paramKey={key} spec={paramSpec} value={value} onChange={onChange} id={id(key)} error={errorFor(key)} />
        </div>
      ))}

      <Field id={id('country')} label={t('audience.country')} error={countryError}>
        <Input
          id={id('country')}
          value={value.country ?? ''}
          maxLength={2}
          autoComplete="off"
          placeholder={t('audience.countryAll')}
          onChange={(e) => setCountry(e.target.value)}
          {...fieldA11y(id('country'), countryError)}
        />
      </Field>

      <div role="status" className={`${styles.count} ${styles.full}`}>
        {count.isLoading ? <p className={styles.muted}>{t('audience.counting')}</p>
          : count.isError ? <p className={styles.fail}>{t('audience.countError')}</p>
            : count.data && (
              <>
                <p className={styles.summary}>
                  {t('audience.summary', { eligible: count.data.eligible, skipped: count.data.skipped.optedOut, days: count.data.estimatedDays })}
                </p>
                {count.data.skipped.unverified + count.data.skipped.deleted > 0 && (
                  <p className={styles.muted}>
                    {t('audience.summaryOther', { unverified: count.data.skipped.unverified, deleted: count.data.skipped.deleted })}
                  </p>
                )}
              </>
            )}
      </div>
    </div>
  );
}
