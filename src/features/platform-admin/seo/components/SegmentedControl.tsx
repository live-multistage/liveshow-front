'use client';

import styles from './SegmentedControl.module.scss';

interface Option<T extends string> {
  value: T;
  label: string;
}

interface Props<T extends string> {
  label: string;
  value: T;
  options: Option<T>[];
  onChange: (value: T) => void;
  // Option rendered in the amber warning tone (e.g. "Não", "Substituir").
  warnValue?: T;
}

// 3-state selector (Default / Yes / No) for the robots meta controls.
export function SegmentedControl<T extends string>({ label, value, options, onChange, warnValue }: Props<T>) {
  return (
    <div role="radiogroup" aria-label={label} className={styles.group}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            data-tone={option.value === warnValue ? 'warn' : undefined}
            className={selected ? `${styles.option} ${styles.selected}` : styles.option}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
