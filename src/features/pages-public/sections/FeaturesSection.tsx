import type { FeaturesProps } from '@live-show/api-contracts';
import styles from './sections.module.scss';

export function FeaturesSection({ props: p }: { props: FeaturesProps }) {
  return (
    <>
      <h2 className={styles.title}>{p.title}</h2>
      <div className={styles.grid}>
        {p.items.map((it, i) => (
          <div key={i} className={styles.card}>
            {it.icon && <span className={styles.icon} aria-hidden="true">{it.icon}</span>}
            <b>{it.title}</b>
            <p>{it.text}</p>
          </div>
        ))}
      </div>
    </>
  );
}
