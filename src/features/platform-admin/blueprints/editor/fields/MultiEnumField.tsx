'use client';

import { useTranslations } from 'next-intl';
import type { BlueprintConfigField } from '@live-show/api-contracts';
import styles from '../Inspector.module.scss';

type MultiEnumSpec = Extract<BlueprintConfigField, { kind: 'multiEnum' }>;

interface Props {
  id: string;
  spec: MultiEnumSpec;
  value: string[];
  onChange(value: string[]): void;
  /** Overrides spec.values — data.query lists the chosen entity's fields. */
  optionKeys?: string[];
}

export function MultiEnumField({ id, spec, value, onChange, optionKeys }: Props) {
  const t = useTranslations('platformAdmin.blueprints');
  const options = optionKeys ?? [...spec.values];
  const full = value.length >= spec.maxItems;
  const toggle = (option: string, checked: boolean) =>
    onChange(checked ? [...value, option] : value.filter((v) => v !== option));

  return (
    <div className={styles.field} role="group" aria-labelledby={`${id}-label`}>
      <div className={styles.labelRow}>
        <span id={`${id}-label`} className={styles.fieldLabel}>{spec.description}</span>
        <span className={styles.counter}>{t('editor.fields.counter', { count: value.length, max: spec.maxItems })}</span>
      </div>
      {options.length === 0
        ? <p className={styles.muted}>{t('editor.fields.multiEnumEmpty')}</p>
        : (
          <ul className={styles.checkList}>
            {options.map((option) => {
              const checked = value.includes(option);
              return (
                <li key={option}>
                  <label className={styles.checkRow}>
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={!checked && full}
                      onChange={(e) => toggle(option, e.target.checked)}
                    />
                    <span className={styles.mono}>{option}</span>
                  </label>
                </li>
              );
            })}
          </ul>
        )}
    </div>
  );
}
