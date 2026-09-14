'use client';

import { useTranslations } from 'next-intl';
import { X } from 'lucide-react';
import type { BlueprintFieldType, BlueprintSwitchCase } from '@live-show/api-contracts';
import { Input, cn } from '@live-show/design-system';
import { ChoiceSelect } from '../../../mailing/components/BlockInspector';
import { casesOf } from '../expr-builders';
import styles from '../Inspector.module.scss';

const PORT_RE = /^[A-Za-z0-9_-]{1,32}$/;
type ScalarType = 'string' | 'number' | 'boolean';
const isScalarType = (t?: BlueprintFieldType): t is ScalarType => t === 'string' || t === 'number' || t === 'boolean';

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
export function CasesBuilder({ id, label, value, maxCases, valueType, onChange }: Props) {
  const t = useTranslations('platformAdmin.blueprints');
  const rows = casesOf(value);
  const atMax = rows.length >= maxCases;
  const scalarType: ScalarType = isScalarType(valueType) ? valueType : 'string';

  const update = (index: number, patch: Partial<BlueprintSwitchCase>) =>
    onChange(rows.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  const remove = (index: number) => onChange(rows.filter((_, i) => i !== index));
  const add = () => onChange([...rows, { match: '', port: '' }]);

  const portError = (row: BlueprintSwitchCase, index: number): string | null => {
    if (!PORT_RE.test(row.port)) return t('editor.fields.cases.errPort');
    if (row.port === 'default') return t('editor.fields.cases.errReserved');
    if (rows.some((r, i) => i !== index && r.port === row.port)) return t('editor.fields.cases.errDuplicate');
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
        {rows.map((row, index) => {
          const valueInvalid = row.match === '';
          const numberInvalid = scalarType === 'number' && !valueInvalid && typeof row.match !== 'number';
          const portMsg = portError(row, index);
          return (
            <div key={index} className={styles.caseRow}>
              <div className={styles.caseRowGrid}>
                {scalarType === 'boolean' ? (
                  <ChoiceSelect
                    id={`${id}-${index}-value`}
                    value={row.match === true ? 'true' : row.match === false ? 'false' : ''}
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
                    value={String(row.match)}
                    onChange={(e) => setMatch(index, e.target.value)}
                  />
                )}
                <Input
                  id={`${id}-${index}-port`}
                  aria-label={t('editor.fields.cases.port')}
                  className={styles.mono}
                  aria-invalid={portMsg !== null}
                  value={row.port}
                  onChange={(e) => update(index, { port: e.target.value })}
                />
                <button type="button" className={styles.iconBtn} aria-label={t('editor.fields.removeRow')} onClick={() => remove(index)}>
                  <X size={13} />
                </button>
              </div>
              {(valueInvalid || numberInvalid || portMsg) && (
                <p className={styles.stale}>
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
