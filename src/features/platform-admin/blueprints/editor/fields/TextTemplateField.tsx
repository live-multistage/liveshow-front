'use client';

import { useRef, type ChangeEvent, type SyntheticEvent } from 'react';
import { useTranslations } from 'next-intl';
import { Lock } from 'lucide-react';
import type { BlueprintConfigField } from '@live-show/api-contracts';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, Input, cn } from '@live-show/design-system';
import { useBlueprintSecretsQuery } from '../../queries/blueprint-secrets.queries';
import { refOf } from '../expr-builders';
import type { AvailableField } from '../useEditorGraph';
import { ClassChip } from './RefSelect';
import styles from '../Inspector.module.scss';

type TextSpec = Extract<BlueprintConfigField, { kind: 'text' }>;

interface Props {
  id: string;
  label: string;
  spec: TextSpec;
  value: string;
  fields: AvailableField[];
  /** True when the entry's `secretFields` names this field — offers `secrets.NAME` alongside upstream fields. */
  allowSecrets?: boolean;
  help?: string;
  onChange(value: string): void;
}

// "Texto com variáveis": "+ Variável" inserts {{node.field}} at the caret.
// Personal outputs are offered only where the field accepts them; secrets are
// offered only where the catalog entry declares this field as a secret field
// (e.g. http.request's `url`/`headers`), amber lock chip matching KeyValueListField.
export function TextTemplateField({ id, label, spec, value, fields, allowSecrets = false, help, onChange }: Props) {
  const t = useTranslations('platformAdmin.blueprints');
  const caret = useRef<number | null>(null);
  const variables = spec.template ? fields.filter((f) => spec.acceptsPersonal || f.out.class !== 'PERSONAL') : [];
  const secretsQuery = useBlueprintSecretsQuery({ enabled: allowSecrets });
  const secretNames = allowSecrets ? (secretsQuery.data ?? []).map((s) => s.name) : [];

  const onText = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChange(e.target.value);
  const onCaret = (e: SyntheticEvent<HTMLInputElement | HTMLTextAreaElement>) => { caret.current = e.currentTarget.selectionStart; };

  function insert(token: string) {
    const at = Math.min(caret.current ?? value.length, value.length);
    onChange(value.slice(0, at) + token + value.slice(at));
    caret.current = at + token.length;
  }

  return (
    <div className={styles.field}>
      <div className={styles.labelRow}>
        <label htmlFor={id} className={styles.fieldLabel}>{label}</label>
        <span className={styles.counter}>{t('editor.fields.counter', { count: value.length, max: spec.maxLength })}</span>
      </div>
      {spec.maxLength > 200
        ? <textarea id={id} className={styles.textarea} rows={4} value={value} maxLength={spec.maxLength} onChange={onText} onSelect={onCaret} />
        : <Input id={id} value={value} maxLength={spec.maxLength} onChange={onText} onSelect={onCaret} />}
      {spec.template && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button type="button" className={styles.linkBtn} disabled={variables.length === 0 && secretNames.length === 0}>{t('editor.fields.addVariable')}</button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {variables.map((f) => (
              <DropdownMenuItem key={`${f.nodeId}.${f.field}.${f.path.join('.')}`} onSelect={() => insert(refOf(f.nodeId, f.field, f.path))}>
                <span className={styles.option}><span className={styles.mono}>{refOf(f.nodeId, f.field, f.path)}</span><ClassChip cls={f.out.class} /></span>
              </DropdownMenuItem>
            ))}
            {secretNames.map((name) => (
              <DropdownMenuItem key={`secrets.${name}`} onSelect={() => insert(refOf('secrets', name))}>
                <span className={cn(styles.mono, styles.secretChip)}><Lock size={9} />{`secrets.${name}`}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
      {help && <p className={styles.help}>{help}</p>}
    </div>
  );
}
