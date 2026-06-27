import styles from './DashboardContentLoading.module.scss';

function S({ w, h, r }: { w?: string; h?: string; r?: string }) {
  return (
    <div
      className={styles.shimmer}
      style={{ width: w ?? '100%', height: h ?? '100%', borderRadius: r }}
    />
  );
}

export function DashboardContentLoading() {
  return (
    <div className={styles.wrapper}>
      <div className={styles.header}>
        <div className={styles.titles}>
          <S w="60px" h="10px" r="4px" />
          <S w="220px" h="28px" r="6px" />
        </div>
        <S w="130px" h="38px" r="10px" />
      </div>

      <div className={styles.grid}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className={`${styles.card} ${styles.shimmer}`} />
        ))}
      </div>

      <div className={`${styles.chart} ${styles.shimmer}`} />

      <div className={styles.eventsGrid}>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className={`${styles.eventRow} ${styles.shimmer}`} />
        ))}
      </div>
    </div>
  );
}
