'use client';

import { useTranslations } from 'next-intl';
import styles from './CreateChannelForm.module.scss';

const STEPS = [
  { title: 'camerasTitle', description: 'camerasDescription', required: true },
  { title: 'scheduleTitle', description: 'scheduleDescription', required: false },
  { title: 'pricingTitle', description: 'pricingDescription', required: false },
  { title: 'publishTitle', description: 'publishDescription', required: false },
] as const;

export function NextStepsAside() {
  const t = useTranslations('channels.create.nextSteps');

  return (
    <aside className={styles.aside} aria-labelledby="channel-next-steps">
      <h2 className={styles.asideTitle} id="channel-next-steps">
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
