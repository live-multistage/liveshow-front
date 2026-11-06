import type { FaqProps } from '@live-show/api-contracts';
import styles from './sections.module.scss';

export function FaqSection({ props: p }: { props: FaqProps }) {
  return (
    <>
      <h2 className={styles.title}>{p.title}</h2>
      <div className={styles.faq}>
        {p.items.map((it, i) => (
          <details key={i}>
            <summary>{it.question}</summary>
            <p>{it.answer}</p>
          </details>
        ))}
      </div>
    </>
  );
}
