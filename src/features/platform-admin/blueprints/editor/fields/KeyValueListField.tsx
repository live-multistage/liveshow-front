'use client';

import { useRef, type ChangeEvent, type SyntheticEvent } from 'react';
import { useTranslations } from 'next-intl';
import { Lock, X } from 'lucide-react';
import type { BlueprintKeyValue } from '@live-show/api-contracts';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, Input, cn } from '@live-show/design-system';
import { useBlueprintSecretsQuery } from '../../queries/blueprint-secrets.queries';
import { refOf } from '../expr-builders';
import type { AvailableField } from '../useEditorGraph';
import styles from '../Inspector.module.scss';

interface RowProps {
  id: string;
  value: string;
  fields: AvailableField[];
  secretNames: string[];
  onChange(value: string): void;
}

// Value side of a header row: a plain template input plus a "+ variável"
// menu listing upstream fields and, when allowed, `secrets.NAME` entries
// (rendered as amber lock chips, matching the design's secret token style).
function RowValue({ id, value, fields, secretNames, onChange }: RowProps) {
  const t = useTranslations('platformAdmin.blueprints');
  const caret = useRef<number | null>(null);
  const hasOptions = fields.length > 0 || secretNames.length > 0;

  function insert(token: string) {
    const at = Math.min(caret.current ?? value.length, value.length);
    onChange(value.slice(0, at) + token + value.slice(at));
    caret.current = at + token.length;
  }

  const onText = (e: ChangeEvent<HTMLInputElement>) => onChange(e.target.value);
  const onCaret = (e: SyntheticEvent<HTMLInputElement>) => { caret.current = e.currentTarget.selectionStart; };

  return (
    <div className={styles.headerValue}>
      <Input id={id} aria-label={t('editor.fields.headerValue')} value={value} onChange={onText} onSelect={onCaret} />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button type="button" className={styles.iconBtn} disabled={!hasOptions}>{t('editor.fields.addVariable')}</button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          {fields.map((f) => (
            <DropdownMenuItem key={`${f.nodeId}.${f.field}`} onSelect={() => insert(refOf(f.nodeId, f.field))}>
              <span className={styles.mono}>{refOf(f.nodeId, f.field)}</span>
            </DropdownMenuItem>
          ))}
          {secretNames.map((name) => (
            <DropdownMenuItem key={`secrets.${name}`} onSelect={() => insert(refOf('secrets', name))}>
              <span className={cn(styles.mono, styles.secretChip)}><Lock size={9} />{`secrets.${name}`}</span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

interface Props {
  id: string;
  label: string;
  value?: BlueprintKeyValue[];
  maxItems: number;
  fields: AvailableField[];
  allowSecrets: boolean;
  onChange(value: BlueprintKeyValue[]): void;
}

// "Headers" and any other name/value list config field. Personal outputs are
// never offered here — headers/query params etc. aren't message text.
export function KeyValueListField({ id, label, value, maxItems, fields, allowSecrets, onChange }: Props) {
  const t = useTranslations('platformAdmin.blueprints');
  const rows = value ?? [];
  const secretsQuery = useBlueprintSecretsQuery({ enabled: allowSecrets });
  const secretNames = allowSecrets ? (secretsQuery.data ?? []).map((s) => s.name) : [];
  const publicFields = fields.filter((f) => f.out.class !== 'PERSONAL');

  const update = (index: number, patch: Partial<BlueprintKeyValue>) =>
    onChange(rows.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  const remove = (index: number) => onChange(rows.filter((_, i) => i !== index));
  const add = () => onChange([...rows, { name: '', value: '' }]);

  return (
    <div className={styles.field}>
      <label className={styles.fieldLabel}>{label}</label>
      <div className={styles.headerRows}>
        {rows.map((row, index) => (
          <div key={index} className={styles.headerRow}>
            <Input
              aria-label={t('editor.fields.headerName')}
              className={cn(styles.mono, styles.headerName)}
              value={row.name}
              onChange={(e) => update(index, { name: e.target.value })}
            />
            <RowValue
              id={`${id}-${index}-value`}
              value={row.value}
              fields={publicFields}
              secretNames={secretNames}
              onChange={(v) => update(index, { value: v })}
            />
            <button type="button" className={styles.iconBtn} aria-label={t('editor.fields.removeRow')} onClick={() => remove(index)}>
              <X size={13} />
            </button>
          </div>
        ))}
      </div>
      <button type="button" className={styles.linkBtn} disabled={rows.length >= maxItems} onClick={add}>
        {t('editor.fields.addHeader')}
      </button>
      <p className={styles.help}>{t('editor.fields.headerLimit', { max: maxItems })}</p>
    </div>
  );
}
