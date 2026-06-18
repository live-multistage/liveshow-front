'use client';

import styles from './LiveGateLoading.module.scss';

interface Props {
  message?: string;
}

export function LiveGateLoading({ message = '' }: Props) {
  return (
    <div className={styles.root}>
      <div className={styles.beams} aria-hidden="true">
        <div className={styles.beam} />
        <div className={styles.beam} />
        <div className={styles.beam} />
        <div className={styles.beam} />
        <div className={styles.beam} />
      </div>

      <div className={styles.glow} aria-hidden="true" />

      <div className={styles.center}>
        <div className={styles.eq} aria-hidden="true">
          <div className={styles.eqBar} />
          <div className={styles.eqBar} />
          <div className={styles.eqBar} />
          <div className={styles.eqBar} />
          <div className={styles.eqBar} />
          <div className={styles.eqBar} />
          <div className={styles.eqBar} />
        </div>

        <p className={styles.label}>
          {message}
          <span className={styles.cursor} aria-hidden="true">_</span>
        </p>
      </div>

      <div className={styles.floor} aria-hidden="true" />
    </div>
  );
}
