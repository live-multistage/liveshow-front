import type { StatsProps } from '@live-show/api-contracts';
import styles from './sections.module.scss';

export function StatsSection({ props: p }: { props: StatsProps }) {
  return (
    <>
      {p.title && <h2 className={styles.title}>{p.title}</h2>}
      <div className={styles.grid}>
        {p.items.map((s, i) => (
          <div key={i} className={styles.stat}><b>{s.value}</b><span>{s.label}</span></div>
        ))}
      </div>
    </>
  );
}
