'use client';

import type { HouseAdPriority } from '../../house-ads';
import type { WizardDraft } from './useHouseAdWizardForm';
import styles from './HouseAdWizardDialog.module.scss';

const PRIORITY_OPTIONS: { value: HouseAdPriority; label: string; copy: string; tag?: string }[] = [
  {
    value: 'FILL',
    label: 'Preenchimento',
    copy: 'Só aparece quando nenhum anúncio pago se aplica à posição. Não reduz a receita.',
    tag: 'Padrão',
  },
  {
    value: 'PRIORITY',
    label: 'Prioritário',
    copy: 'Aparece na frente dos anúncios pagos. Use para avisos da plataforma; ocupa espaço que geraria receita.',
  },
];

interface Props {
  draft: WizardDraft;
  update: <K extends keyof WizardDraft>(key: K, value: WizardDraft[K]) => void;
}

export function Step3PeriodPriority({ draft, update }: Props) {
  const invalidRange = draft.startsAt && draft.endsAt && new Date(draft.endsAt).getTime() <= new Date(draft.startsAt).getTime();
  const missingDates = !draft.startsAt || !draft.endsAt;
  const periodErrorId = invalidRange
    ? 'house-ad-period-range-error'
    : missingDates
      ? 'house-ad-period-missing-error'
      : undefined;

  return (
    <>
      <div className={styles.card}>
        <div className={styles.cardHead}><span>PERÍODO</span></div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className={styles.field}>
            <label className={styles.hint} htmlFor="house-ad-starts-at">Início</label>
            <input
              id="house-ad-starts-at"
              className={styles.input}
              type="datetime-local"
              value={draft.startsAt}
              onChange={(e) => update('startsAt', e.target.value)}
              aria-invalid={Boolean(invalidRange || missingDates)}
              aria-describedby={periodErrorId}
            />
          </div>
          <div className={styles.field}>
            <label className={styles.hint} htmlFor="house-ad-ends-at">Fim</label>
            <input
              id="house-ad-ends-at"
              className={styles.input}
              type="datetime-local"
              value={draft.endsAt}
              onChange={(e) => update('endsAt', e.target.value)}
              aria-invalid={Boolean(invalidRange || missingDates)}
              aria-describedby={periodErrorId}
            />
          </div>
        </div>
        {invalidRange && (
          <p id="house-ad-period-range-error" role="alert" className={styles.error}>O fim precisa ser depois do início.</p>
        )}
        {missingDates && (
          <p id="house-ad-period-missing-error" role="alert" className={styles.error}>Defina o início e o fim.</p>
        )}
      </div>

      <div className={styles.card}>
        <div className={styles.cardHead}><span>PRIORIDADE</span></div>
        <div className={styles.priorityGrid} role="radiogroup" aria-label="Prioridade">
          {PRIORITY_OPTIONS.map((o) => (
            <button
              key={o.value}
              type="button"
              role="radio"
              aria-checked={draft.housePriority === o.value}
              className={`${styles.priorityCard} ${draft.housePriority === o.value ? styles.priorityCardActive : ''}`}
              onClick={() => update('housePriority', o.value)}
            >
              <span className={styles.priorityPill}>{o.label}</span>
              <span className={styles.priorityCopy}>{o.copy}</span>
              {o.tag && <span className={styles.priorityTag}>{o.tag}</span>}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
