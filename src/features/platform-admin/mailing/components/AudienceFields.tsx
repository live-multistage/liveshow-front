'use client';

import { useId } from 'react';
import { useTranslations } from 'next-intl';
import {
  CustomSelect, CustomSelectContent, CustomSelectItem, CustomSelectTrigger, CustomSelectValue, Input,
} from '@live-show/design-system';
import {
  mailingAudienceSchema, type AudienceCountResponse, type MailingAudience, type MailingAudienceType, type MailingCategory,
} from '@live-show/api-contracts';
import { useChannelsQuery } from '@/features/channels';
import { ChoiceSelect, Field, fieldA11y } from './BlockInspector';
import { EventPicker } from './EventPicker';
import styles from './CampaignWizard.module.scss';

const TYPES: MailingAudienceType[] = ['ALL_VERIFIED', 'EVENT_BUYERS', 'EVENT_SAVERS', 'CHANNEL_SUBSCRIBERS'];

function emptyAudience(type: MailingAudienceType): MailingAudience {
  if (type === 'ALL_VERIFIED') return { type };
  if (type === 'CHANNEL_SUBSCRIBERS') return { type, channelId: '' };
  return { type, eventId: '' };
}

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
  const channels = useChannelsQuery({ enabled: value.type === 'CHANNEL_SUBSCRIBERS' });
  const countryError = value.country === undefined
    ? undefined
    : mailingAudienceSchema.safeParse(value).error?.issues.find((issue) => issue.path[0] === 'country')?.message;

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
          onChange={(type) => type !== value.type && onChange(emptyAudience(type as MailingAudienceType))}
          options={TYPES.map((type) => ({ value: type, label: t(`audience.type.${type}`) }))}
        />
      </Field>

      {(value.type === 'EVENT_BUYERS' || value.type === 'EVENT_SAVERS') && (
        <div className={styles.full}>
          <EventPicker
            max={1}
            value={value.eventId ? [value.eventId] : []}
            onChange={(ids) => onChange({ ...value, eventId: ids[0] ?? '' })}
          />
        </div>
      )}

      {value.type === 'CHANNEL_SUBSCRIBERS' && (
        <Field id={id('channel')} label={t('audience.channel')}>
          {/* Primitives, not SimpleCustomSelect: its trigger takes no id, so the <Label> could not name it. */}
          <CustomSelect value={value.channelId || undefined} onValueChange={(channelId) => channelId && onChange({ ...value, channelId })}>
            <CustomSelectTrigger id={id('channel')}>
              <CustomSelectValue placeholder={t('audience.channelPlaceholder')} />
            </CustomSelectTrigger>
            <CustomSelectContent>
              {(channels.data ?? []).map((channel) => (
                <CustomSelectItem key={channel.id} value={channel.id}>{channel.name}</CustomSelectItem>
              ))}
            </CustomSelectContent>
          </CustomSelect>
        </Field>
      )}

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
