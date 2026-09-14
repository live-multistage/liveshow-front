'use client';

import { useTranslations } from 'next-intl';
import { X } from 'lucide-react';
import type { BlueprintFieldType, BlueprintSwitchCase } from '@live-show/api-contracts';
import { Input, cn } from '@live-show/design-system';
import { ChoiceSelect } from '../../../mailing/components/BlockInspector';
import { isCase } from '../expr-builders';
import styles from '../Inspector.module.scss';

// Mirrors the orchestrator's PORT_NAME (analyzer.ts): a letter, then letters/digits/_.
const PORT_RE = /^[a-z][a-z0-9_]{0,31}$/i;
// Collide with a fixed handle (true/false/next/error) or the switch's own
// fallthrough (default) — the analyzer's SWITCH_CASES check mirrors this set.
const RESERVED_PORTS = new Set(['default', 'true', 'false', 'next', 'error']);
type ScalarType = 'string' | 'number' | 'boolean';
const isScalarType = (t?: BlueprintFieldType): t is ScalarType => t === 'string' || t === 'number' || t === 'boolean';
const asRecord = (v: unknown): Record<string, unknown> => (v && typeof v === 'object' ? (v as Record<string, unknown>) : {});
const portOf = (v: unknown): string => (typeof asRecord(v).port === 'string' ? (asRecord(v).port as string) : '');

interface Props {
  id: string;
  label: string;
  value?: unknown;
  maxCases: number;
  /** The resolved type of the sibling "value" ref — dictates how each case's match is entered/stored. Non-scalar (or unresolved) behaves as string. */
  valueType?: BlueprintFieldType;
  onChange(cases: BlueprintSwitchCase[]): void;
}

// "Casos" grid (design C3/C4): each row maps a literal match to a port; a
// fixed, non-editable "todos os outros → padrão" row always trails the list.
// The backend's matchesCase() compares strictly typed, so the match must be
// stored as the same JS type as the resolved value ref (number/boolean/string).
//
// Rows mirror the raw `config.cases` array (like the orchestrator's
// ports-of.ts), not just the entries that parse as a complete case: an entry
// with an unparsable `match` (e.g. imported/legacy data) still keeps its slot
// — and its port — so editing a sibling row never silently drops it.
export function CasesBuilder({ id, label, value, maxCases, valueType, onChange }: Props) {
  const t = useTranslations('platformAdmin.blueprints');
  const rows: unknown[] = Array.isArray(value) ? value : [];
  const ports = rows.map(portOf);
  const atMax = rows.length >= maxCases;
  const scalarType: ScalarType = isScalarType(valueType) ? valueType : 'string';

  const update = (index: number, patch: Partial<BlueprintSwitchCase>) =>
    onChange(rows.map((r, i) => (i === index ? { ...asRecord(r), ...patch } : r)) as BlueprintSwitchCase[]);
  const remove = (index: number) => onChange(rows.filter((_, i) => i !== index) as BlueprintSwitchCase[]);
  const add = () => onChange([...rows, { match: '', port: '' }] as BlueprintSwitchCase[]);

  const portError = (index: number): string | null => {
    const port = ports[index];
    if (!PORT_RE.test(port)) return t('editor.fields.cases.errPort');
    if (RESERVED_PORTS.has(port)) return t('editor.fields.cases.errReserved');
    if (ports.some((p, i) => i !== index && p === port)) return t('editor.fields.cases.errDuplicate');
    return null;
  };

  const setMatch = (index: number, text: string) => {
    if (scalarType !== 'number') { update(index, { match: text }); return; }
    const n = Number(text);
    update(index, { match: text.trim() !== '' && Number.isFinite(n) ? n : text });
  };

  return (
    <div className={styles.field}>
      <label className={styles.fieldLabel}>{label}</label>
      <div className={cn(styles.mono, styles.casesHeader)}>
        <span>{t('editor.fields.cases.value')}</span>
        <span>{t('editor.fields.cases.port')}</span>
        <span />
      </div>
      <div className={styles.casesRows}>
        {rows.map((raw, index) => {
          const parsed = isCase(raw) ? raw : null;
          const match = parsed ? parsed.match : '';
          const port = ports[index];
          const valueInvalid = match === '';
          const numberInvalid = scalarType === 'number' && !valueInvalid && typeof match !== 'number';
          const portMsg = portError(index);
          const errorId = `${id}-${index}-error`;
          const hasError = valueInvalid || numberInvalid || portMsg !== null;
          return (
            <div key={index} className={styles.caseRow}>
              <div className={styles.caseRowGrid}>
                {scalarType === 'boolean' ? (
                  <ChoiceSelect
                    id={`${id}-${index}-value`}
                    aria-label={t('editor.fields.cases.value')}
                    aria-describedby={hasError ? errorId : undefined}
                    value={match === true ? 'true' : match === false ? 'false' : ''}
                    options={[
                      { value: 'true', label: t('editor.fields.cases.true') },
                      { value: 'false', label: t('editor.fields.cases.false') },
                    ]}
                    onChange={(v) => update(index, { match: v === 'true' })}
                  />
                ) : (
                  <Input
                    id={`${id}-${index}-value`}
                    aria-label={t('editor.fields.cases.value')}
                    className={styles.mono}
                    type="text"
                    inputMode={scalarType === 'number' ? 'decimal' : undefined}
                    aria-invalid={valueInvalid || numberInvalid}
                    aria-describedby={hasError ? errorId : undefined}
                    value={String(match)}
                    onChange={(e) => setMatch(index, e.target.value)}
                  />
                )}
                <Input
                  id={`${id}-${index}-port`}
                  aria-label={t('editor.fields.cases.port')}
                  className={styles.mono}
                  aria-invalid={portMsg !== null}
                  aria-describedby={hasError ? errorId : undefined}
                  value={port}
                  onChange={(e) => update(index, { port: e.target.value })}
                />
                <button type="button" className={styles.iconBtn} aria-label={t('editor.fields.removeRow')} onClick={() => remove(index)}>
                  <X size={13} />
                </button>
              </div>
              {hasError && (
                <p id={errorId} className={styles.stale}>
                  {valueInvalid ? t('editor.fields.cases.errValue') : numberInvalid ? t('editor.fields.cases.errNumber') : portMsg}
                </p>
              )}
            </div>
          );
        })}
        <div className={styles.caseRowGrid}>
          <span className={styles.help}>{t('editor.fields.cases.otherwise')}</span>
          <span className={cn(styles.mono, styles.caseDefault)}>{t('editor.fields.cases.default')}</span>
          <span />
        </div>
      </div>
      <button type="button" className={styles.linkBtn} disabled={atMax} onClick={add}>
        {t('editor.fields.cases.add')}{atMax ? ` · ${t('editor.fields.cases.limit', { max: maxCases })}` : ''}
      </button>
    </div>
  );
}
