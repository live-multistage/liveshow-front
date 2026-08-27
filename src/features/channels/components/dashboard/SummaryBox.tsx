'use client';

import { Clock3 } from 'lucide-react';
import styles from './FormControls.module.scss';

interface Props {
  label: string;
  summary: string | null;
  placeholder: string;
}

// Caixa "RESUMO" com o horário/dias já compostos — extraída do ProgramModal
// para evitar duplicar a marcação.
export function SummaryBox({ label, summary, placeholder }: Props) {
  return (
    <div className={styles.summary}>
      <Clock3
        size={14}
        className={summary ? styles.summaryIconActive : styles.summaryIcon}
        aria-hidden="true"
      />
      <div>
        <span className={styles.summaryLabel}>{label}</span>
        <p className={summary ? styles.summaryText : styles.summaryPlaceholder}>
          {summary ?? placeholder}
        </p>
      </div>
    </div>
  );
}
