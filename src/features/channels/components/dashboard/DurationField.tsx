'use client';

import styles from './FormControls.module.scss';

interface Preset {
  minutes: number;
  label: string;
}

interface Props {
  id: string;
  label: string;
  suffix: string;
  value: string;
  onChange: (value: string) => void;
  presets: Preset[];
  onPreset: (minutes: number) => void;
  error?: string | null;
}

// Number input com sufixo "MIN" + presets 30M/1H/1.5H/2H — extraído do
// ProgramModal para evitar duplicar a marcação.
export function DurationField({ id, label, suffix, value, onChange, presets, onPreset, error }: Props) {
  return (
    <div className={styles.field}>
      <span className={styles.label}>
        <label htmlFor={id}>{label}</label>
        <span className={styles.required} aria-hidden="true">
          *
        </span>
      </span>
      <div className={`${styles.durationBox} ${error ? styles.durationBoxError : ''}`}>
        <input
          id={id}
          type="number"
          min={5}
          max={1440}
          className={styles.durationInput}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
        <span className={styles.durationSuffix}>{suffix}</span>
      </div>
      <div className={styles.presets}>
        {presets.map((preset) => (
          <button
            key={preset.minutes}
            type="button"
            className={`${styles.preset} ${Number(value) === preset.minutes ? styles.presetActive : ''}`}
            onClick={() => onPreset(preset.minutes)}
          >
            {preset.label}
          </button>
        ))}
      </div>
      {error && <span className={styles.error}>{error}</span>}
    </div>
  );
}
