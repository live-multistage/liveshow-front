import type { HowProps } from '@live-show/api-contracts';
import styles from './sections.module.scss';

export function HowSection({ props: p }: { props: HowProps }) {
  return (
    <>
      {p.eyebrow && <p className={styles.eyebrow}>{p.eyebrow}</p>}
      <h2 className={styles.title}>{p.title}</h2>
      <div className={styles.grid}>
        {p.steps.map((s, i) => (
          <div key={i} className={styles.card}>
            <span className={styles.num}>{String(i + 1).padStart(2, '0')}</span>
            <b>{s.title}</b>
            <p>{s.text}</p>
          </div>
        ))}
      </div>
    </>
  );
}
