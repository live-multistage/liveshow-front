'use client';

import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import type { BlueprintCatalogEntry, BlueprintConfigField, BlueprintKeyValue } from '@live-show/api-contracts';
import { Input } from '@live-show/design-system';
import { ChoiceSelect } from '../../../mailing/components/BlockInspector';
import type { AvailableField } from '../useEditorGraph';
import { sameType, typeLabel } from '../field-types';
import { BooleanField } from './BooleanField';
import { ConditionBuilder } from './ConditionBuilder';
import { DurationField } from './DurationField';
import { KeyValueListField } from './KeyValueListField';
import { NumberField } from './NumberField';
import { RefSelect } from './RefSelect';
import { SecretSelect } from './SecretSelect';
import { TemplateSelect } from './TemplateSelect';
import { TextTemplateField } from './TextTemplateField';
import { IfPastRadio, WaitUntilBuilder } from './WaitUntilBuilder';
import styles from '../Inspector.module.scss';

interface Props {
  nodeId: string;
  entry: BlueprintCatalogEntry;
  name: string;
  spec: BlueprintConfigField;
  value: unknown;
  fields: AvailableField[];
  onChange(value: unknown): void;
}

// One inspector field generated from the catalog entry's config schema.
// Empty strings are stored as "absent" so `required` reports them.
export function ConfigField({ nodeId, entry, name, spec, value, fields, onChange }: Props) {
  const t = useTranslations('platformAdmin.blueprints');
  const id = `bp-${nodeId}-${name}`;
  const text = typeof value === 'string' ? value : '';
  const setText = (v: string) => onChange(v === '' ? undefined : v);

  let label = spec.description;
  let control: ReactNode;
  switch (spec.kind) {
    case 'text': {
      const dedupe = entry.kind === 'trigger' && name === 'dedupeKey';
      return (
        <TextTemplateField
          id={id}
          label={spec.description}
          spec={spec}
          value={text}
          fields={fields}
          onChange={setText}
          help={dedupe ? t('editor.fields.dedupeHelp', { example: 'compra:{{t.eventId}}:{{t.userId}}' }) : undefined}
        />
      );
    }
    case 'ref':
      control = (
        <RefSelect
          id={id}
          value={text}
          fields={fields}
          onChange={setText}
          reject={(out) => {
            if (out.class === 'PERSONAL') return t('editor.fields.personalNotAllowed');
            if (out.type === 'json' && !sameType(out.type, spec.type)) return t('editor.fields.jsonNeedsTransform');
            return sameType(out.type, spec.type) ? null : t('editor.fields.typeMismatch', { type: typeLabel(out.type) });
          }}
        />
      );
      break;
    case 'enum':
      if (entry.key === 'core.waitUntil' && name === 'ifPast') return <IfPastRadio name={id} value={text} onChange={setText} />;
      control = (
        <ChoiceSelect
          id={id}
          value={text}
          options={spec.values.map((v) => ({ value: v, label: t.has(`editor.enum.${v}`) ? t(`editor.enum.${v}`) : v }))}
          onChange={setText}
        />
      );
      break;
    case 'uuid':
      if (entry.key === 'mailing.sendEmail' && name === 'templateId') {
        label = t('editor.template.label');
        control = <TemplateSelect id={id} value={text} onChange={setText} />;
      } else {
        control = <Input id={id} className={styles.mono} value={text} onChange={(e) => setText(e.target.value.trim())} />;
      }
      break;
    case 'datetimeExpr':
      label = t('editor.wait.label');
      control = <WaitUntilBuilder id={id} value={value} fields={fields} onChange={onChange} />;
      break;
    case 'condition':
      label = t('editor.inspector.rules');
      control = <ConditionBuilder id={id} value={value} fields={fields} onChange={onChange} />;
      break;
    case 'number':
      return (
        <NumberField
          id={id}
          label={spec.description}
          value={typeof value === 'number' ? value : undefined}
          min={spec.min}
          max={spec.max}
          onChange={onChange}
        />
      );
    case 'boolean':
      return (
        <BooleanField id={id} label={spec.description} value={typeof value === 'boolean' ? value : undefined} onChange={onChange} />
      );
    case 'duration':
      return (
        <DurationField id={id} label={spec.description} value={typeof value === 'string' ? value : undefined} onChange={onChange} />
      );
    case 'keyValueList':
      return (
        <KeyValueListField
          id={id}
          label={spec.description}
          value={Array.isArray(value) ? (value as BlueprintKeyValue[]) : undefined}
          maxItems={spec.maxItems}
          fields={fields}
          allowSecrets={entry.secretFields?.includes(name) ?? false}
          onChange={onChange}
        />
      );
    case 'secret':
      control = <SecretSelect id={id} value={text} onChange={setText} />;
      break;
  }

  return (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.fieldLabel}>{label}</label>
      {control}
    </div>
  );
}
