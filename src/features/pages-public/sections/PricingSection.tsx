import type { PricingProps } from '@live-show/api-contracts';
import { PageLink } from './PageLink';
import styles from './sections.module.scss';

export function PricingSection({ props: p }: { props: PricingProps }) {
  return (
    <>
      <h2 className={styles.title}>{p.title}</h2>
      <div className={styles.grid}>
        {p.plans.map((plan, i) => (
          <div key={i} className={styles.card}>
            <b>{plan.name}</b>
            <span className={styles.price}>{plan.price}</span>
            {plan.description && <p>{plan.description}</p>}
            {plan.cta && (
              <PageLink href={plan.cta.href} className={`${styles.cta} ${styles.ctaPrimary}`}>{plan.cta.label}</PageLink>
            )}
          </div>
        ))}
      </div>
    </>
  );
}
