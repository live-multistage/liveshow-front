'use client';

import { WEEKDAYS, type Weekday } from '../../utils/rrule';
import styles from './FormControls.module.scss';

interface QuickPick {
  label: string;
  onClick: () => void;
}

interface Props {
  legend: string;
  dayLabels: string[];
  days: Weekday[];
  onToggleDay: (day: Weekday) => void;
  quickPicks: QuickPick[];
  error?: string | null;
}

// Grade MO..SU com aria-pressed + atalhos "SEG-SEX"/"TODOS" — extraído do
// ProgramModal para evitar duplicar a marcação.
export function WeekdayToggles({ legend, dayLabels, days, onToggleDay, quickPicks, error }: Props) {
  return (
    <fieldset className={styles.field}>
      <div className={styles.labelRow}>
        <legend className={styles.label}>
          {legend}
          <span className={styles.required} aria-hidden="true">
            *
          </span>
        </legend>
        <div className={styles.quickPicks}>
          {quickPicks.map((pick) => (
            <button key={pick.label} type="button" className={styles.quickPick} onClick={pick.onClick}>
              {pick.label}
            </button>
          ))}
        </div>
      </div>
      <div className={styles.days}>
        {WEEKDAYS.map((day, index) => (
          <button
            key={day}
            type="button"
            className={`${styles.day} ${days.includes(day) ? styles.dayActive : ''}`}
            aria-pressed={days.includes(day)}
            onClick={() => onToggleDay(day)}
          >
            {dayLabels[index]}
          </button>
        ))}
      </div>
      {error && <span className={styles.error}>{error}</span>}
    </fieldset>
  );
}
