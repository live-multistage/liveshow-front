import type { AudienceProps } from '@live-show/api-contracts';
import styles from './sections.module.scss';

export function AudienceSection({ props: p }: { props: AudienceProps }) {
  return (
    <>
      <p className={styles.audienceText}>{p.text}</p>
      {p.counters.length > 0 && (
        <div className={styles.counters}>
          {p.counters.map((c, i) => (
            <div key={i} className={styles.counter}><b>{c.value}</b><span>{c.label}</span></div>
          ))}
        </div>
      )}
    </>
  );
}
