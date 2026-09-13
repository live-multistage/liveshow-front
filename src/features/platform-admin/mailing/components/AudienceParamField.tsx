'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  CustomSelect, CustomSelectContent, CustomSelectItem, CustomSelectTrigger, CustomSelectValue, Input,
} from '@live-show/design-system';
import {
  MAILING_APPLICATION_KINDS, MAILING_APPLICATION_STATUSES, MAILING_EVENT_CATEGORIES,
  type MailingAudience, type MailingAudienceParamSpec,
} from '@live-show/api-contracts';
import { useChannelsQuery } from '@/features/channels';
import { ChoiceSelect, Field, fieldA11y } from './BlockInspector';
import { EventPicker } from './EventPicker';
import { OrganizationPicker } from './OrganizationPicker';
import { ArtistPicker } from './ArtistPicker';

// Radix Select can't hold '' as a real option value (see BlockInspector's ChoiceSelect
// comment), so the optional-channel "any" choice needs its own sentinel.
const ANY_CHANNEL = '__any_channel__';

interface Props {
  paramKey: string;
  spec: MailingAudienceParamSpec;
  value: MailingAudience;
  onChange(next: MailingAudience): void;
  id: string;
  error?: string;
}

// Keeps its own text buffer instead of controlling the input straight from
// the audience value: snapping every keystroke to spec.min made it impossible
// to clear the field and type a new number (each intermediate '' bounced back
// to min before the next digit landed).
function IntParamField({
  id, label, error, spec, raw, patch,
}: {
  id: string;
  label: string;
  error?: string;
  spec: MailingAudienceParamSpec;
  raw: string | number | undefined;
  patch(next: number): void;
}) {
  const initial = raw ?? spec.default ?? spec.min ?? 0;
  const [text, setText] = useState(String(initial));

  return (
    <Field id={id} label={label} error={error}>
      <Input
        id={id}
        type="number"
        min={spec.min}
        max={spec.max}
        value={text}
        onChange={(e) => {
          const next = e.target.value;
          setText(next);
          const parsed = Number.parseInt(next, 10);
          if (next.trim() !== '' && Number.isFinite(parsed)) patch(parsed);
        }}
        onBlur={() => {
          const parsed = Number.parseInt(text, 10);
          if (text.trim() === '' || !Number.isFinite(parsed)) setText(String(raw ?? spec.default ?? spec.min ?? 0));
        }}
        {...fieldA11y(id, error)}
      />
    </Field>
  );
}

export function AudienceParamField({ paramKey, spec, value, onChange, id, error }: Props) {
  const t = useTranslations('platformAdmin.mailing');
  const record = value as unknown as Record<string, string | number | undefined>;
  const raw = record[paramKey];
  const channels = useChannelsQuery({ enabled: spec.kind === 'channelId' });
  const label = t(`audience.param.${paramKey}`);

  const patch = (next: string | number | undefined) => {
    const draft = { ...value } as Record<string, unknown>;
    if (next === undefined) delete draft[paramKey];
    else draft[paramKey] = next;
    onChange(draft as MailingAudience);
  };

  if (spec.kind === 'eventId') {
    return <EventPicker max={1} value={raw ? [String(raw)] : []} onChange={(ids) => patch(ids[0] ?? '')} />;
  }

  if (spec.kind === 'channelId') {
    return (
      <Field id={id} label={label}>
        <CustomSelect
          value={raw ? String(raw) : (spec.optional ? ANY_CHANNEL : undefined)}
          onValueChange={(v) => patch(v === ANY_CHANNEL ? undefined : v)}
        >
          <CustomSelectTrigger id={id}><CustomSelectValue placeholder={t('audience.channelPlaceholder')} /></CustomSelectTrigger>
          <CustomSelectContent>
            {spec.optional && <CustomSelectItem value={ANY_CHANNEL}>{t('audience.anyChannel')}</CustomSelectItem>}
            {(channels.data ?? []).map((channel) => (
              <CustomSelectItem key={channel.id} value={channel.id}>{channel.name}</CustomSelectItem>
            ))}
          </CustomSelectContent>
        </CustomSelect>
      </Field>
    );
  }

  if (spec.kind === 'organizationId') {
    return <OrganizationPicker label={label} value={raw ? String(raw) : undefined} optional={spec.optional} onChange={patch} />;
  }

  if (spec.kind === 'artistId') {
    return <ArtistPicker label={label} value={raw ? String(raw) : undefined} onChange={patch} />;
  }

  if (spec.kind === 'couponCode') {
    return (
      <Field id={id} label={label} error={error}>
        <Input id={id} value={raw ? String(raw) : ''} maxLength={64} autoComplete="off" onChange={(e) => patch(e.target.value)} {...fieldA11y(id, error)} />
      </Field>
    );
  }

  if (spec.kind === 'int') {
    return <IntParamField id={id} label={label} error={error} spec={spec} raw={raw} patch={patch} />;
  }

  const enumOptions = spec.kind === 'eventCategory' ? MAILING_EVENT_CATEGORIES.map((v) => ({ value: v, label: t(`audience.eventCategory.${v}`) }))
    : spec.kind === 'applicationKind' ? MAILING_APPLICATION_KINDS.map((v) => ({ value: v, label: t(`audience.applicationKind.${v}`) }))
      : MAILING_APPLICATION_STATUSES.map((v) => ({ value: v, label: t(`audience.applicationStatus.${v}`) }));

  return (
    <Field id={id} label={label}>
      <ChoiceSelect id={id} value={raw ? String(raw) : String(enumOptions[0].value)} onChange={patch} options={enumOptions} />
    </Field>
  );
}
