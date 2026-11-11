import type { FinalProps } from '@live-show/api-contracts';
import { PageLink } from './PageLink';
import styles from './sections.module.scss';

export function FinalSection({ props: p }: { props: FinalProps }) {
  return (
    <>
      <h2 className={styles.title}>{p.title}</h2>
      {p.subtitle && <p className={styles.lead}>{p.subtitle}</p>}
      <div className={styles.ctas}>
        <PageLink href={p.cta.href} className={`${styles.cta} ${styles.ctaPrimary}`}>{p.cta.label}</PageLink>
      </div>
    </>
  );
}
