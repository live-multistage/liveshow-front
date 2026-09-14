'use client';

import { useCallback, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Input } from '@live-show/design-system';
import { ChoiceSelect } from '../../../mailing/components/BlockInspector';
import { formatWait, parseWait, refOf, type WaitExpr, type WaitUnit } from '../expr-builders';
import { sameType, typeLabel } from '../field-types';
import type { AvailableField } from '../useEditorGraph';
import { RefSelect } from './RefSelect';
import styles from '../Inspector.module.scss';

const UNITS: WaitUnit[] = ['m', 'h', 'd'];

/** "24 h antes de Evento por id · início" — used by the builder preview and the canvas card. */
export function useWaitSummary() {
  const t = useTranslations('platformAdmin.blueprints');
  return useCallback((w: WaitExpr, field: string) => (w.amount === 0
    ? t('editor.wait.at', { field })
    : t('editor.wait.summary', {
      amount: w.amount,
      unit: t(`editor.units.${w.unit}`),
      direction: t(w.sign === '-' ? 'editor.wait.before' : 'editor.wait.after'),
      field,
    })), [t]);
}

interface Props {
  id: string;
  value: unknown;
  fields: AvailableField[];
  onChange(value: unknown): void;
}

// "Horário" for core.waitUntil.at: upstream datetime + number + unit + antes/depois,
// emitting "{{node.field}} ± N(m|h|d)". An absolute ISO value is edited as text.
export function WaitUntilBuilder({ id, value, fields, onChange }: Props) {
  const t = useTranslations('platformAdmin.blueprints');
  const summarize = useWaitSummary();
  const parsed = parseWait(value);
  const [draft, setDraft] = useState<WaitExpr>(() => parsed ?? { ref: '', sign: '-', amount: 0, unit: 'h' });

  if (typeof value === 'string' && value !== '' && !parsed) {
    return (
      <>
        <Input id={id} className={styles.mono} value={value} onChange={(e) => onChange(e.target.value || undefined)} />
        <p className={styles.help}>{t('editor.wait.absolute')}</p>
      </>
    );
  }

  function change(patch: Partial<WaitExpr>) {
    const next = { ...draft, ...patch };
    setDraft(next);
    if (next.ref) onChange(formatWait(next));
  }

  const source = fields.find((f) => refOf(f.nodeId, f.field) === draft.ref);

  return (
    <div className={styles.wait}>
      <RefSelect
        id={id}
        value={draft.ref}
        fields={fields}
        reject={(out) => {
          if (out.class === 'PERSONAL') return t('editor.fields.personalNotAllowed');
          return sameType(out.type, 'datetime') ? null : t('editor.fields.typeMismatch', { type: typeLabel(out.type) });
        }}
        onChange={(ref) => change({ ref })}
      />
      <div className={styles.waitRow}>
        <Input
          aria-label={t('editor.wait.amount')}
          type="number"
          min={0}
          value={draft.amount}
          onChange={(e) => change({ amount: Math.max(0, Math.floor(Number(e.target.value) || 0)) })}
        />
        <ChoiceSelect id={`${id}-unit`} value={draft.unit} options={UNITS.map((u) => ({ value: u, label: t(`editor.units.${u}`) }))} onChange={(u) => change({ unit: u as WaitUnit })} />
        <ChoiceSelect
          id={`${id}-sign`}
          value={draft.sign}
          options={[{ value: '-', label: t('editor.wait.before') }, { value: '+', label: t('editor.wait.after') }]}
          onChange={(s) => change({ sign: s as WaitExpr['sign'] })}
        />
      </div>
      {source && <p className={styles.preview}>{summarize(draft, `${source.nodeLabel} · ${source.out.description.toLowerCase()}`)}</p>}
    </div>
  );
}

export function IfPastRadio({ name, value, onChange }: { name: string; value: string; onChange(value: string): void }) {
  const t = useTranslations('platformAdmin.blueprints');
  return (
    <fieldset className={styles.radioGroup}>
      <legend className={styles.fieldLabel}>{t('editor.wait.ifPast')}</legend>
      {(['continue', 'end'] as const).map((v) => (
        <label key={v} className={styles.radio}>
          <input type="radio" name={name} value={v} checked={value === v} onChange={() => onChange(v)} />
          {t(`editor.wait.${v}`)}
        </label>
      ))}
    </fieldset>
  );
}
