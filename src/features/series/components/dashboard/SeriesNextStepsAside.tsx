'use client';

import { useTranslations } from 'next-intl';
import styles from './SeriesForm.module.scss';

const STEPS = [
  { title: 'camerasTitle', description: 'camerasDescription', required: true },
  { title: 'ticketsTitle', description: 'ticketsDescription', required: false },
  { title: 'episodesTitle', description: 'episodesDescription', required: false },
] as const;

export function SeriesNextStepsAside() {
  const t = useTranslations('series.create.nextSteps');

  return (
    <aside className={styles.aside} aria-labelledby="series-next-steps">
      <h2 className={styles.asideTitle} id="series-next-steps">
        {t('title')}
      </h2>
      <p className={styles.asideLead}>{t('lead')}</p>

      <ol className={styles.steps}>
        {STEPS.map((step, index) => (
          <li key={step.title} className={styles.step}>
            <span
              className={`${styles.stepNumber} ${index === 0 ? styles.stepNumberActive : ''}`}
              aria-hidden="true"
            >
              {index + 1}
            </span>
            <div>
              <div className={styles.stepTitle}>
                {t(step.title)}
                {step.required && <span className={styles.stepBadge}>{t('requiredBadge')}</span>}
              </div>
              <div className={styles.stepDescription}>{t(step.description)}</div>
            </div>
          </li>
        ))}
      </ol>

      <div className={styles.asideFooter}>
        <span className={styles.lifecycleDot} aria-hidden="true" />
        {t('lifecycle')}
      </div>
    </aside>
  );
}
