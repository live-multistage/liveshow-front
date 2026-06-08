'use client';

import styles from './error.module.scss';

export default function GlobalError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <h2 className={styles.title}>Algo deu errado</h2>
        <p className={styles.message}>{error.message}</p>
        <button onClick={reset} className={styles.btn}>Tentar novamente</button>
      </div>
    </div>
  );
}
