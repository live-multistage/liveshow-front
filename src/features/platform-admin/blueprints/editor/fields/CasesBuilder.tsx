'use client';

import { useTranslations } from 'next-intl';
import { X } from 'lucide-react';
import type { BlueprintSwitchCase } from '@live-show/api-contracts';
import { Input, cn } from '@live-show/design-system';
import { casesOf } from '../expr-builders';
import styles from '../Inspector.module.scss';

const PORT_RE = /^[A-Za-z0-9_-]{1,32}$/;

interface Props {
  id: string;
  label: string;
  value?: unknown;
  maxCases: number;
  onChange(cases: BlueprintSwitchCase[]): void;
}

// "Casos" grid (design C3/C4): each row maps a literal match to a port; a
// fixed, non-editable "todos os outros → padrão" row always trails the list.
export function CasesBuilder({ id, label, value, maxCases, onChange }: Props) {
  const t = useTranslations('platformAdmin.blueprints');
  const rows = casesOf(value);
  const atMax = rows.length >= maxCases;

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
          const portMsg = portError(row, index);
          return (
            <div key={index} className={styles.caseRow}>
              <div className={styles.caseRowGrid}>
                <Input
                  id={`${id}-${index}-value`}
                  aria-label={t('editor.fields.cases.value')}
                  className={styles.mono}
                  aria-invalid={valueInvalid}
                  value={String(row.match)}
                  onChange={(e) => update(index, { match: e.target.value })}
                />
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
              {(valueInvalid || portMsg) && (
                <p className={styles.stale}>{valueInvalid ? t('editor.fields.cases.errValue') : portMsg}</p>
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
