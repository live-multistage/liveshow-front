import styles from './DashboardLoading.module.scss';

function S({ w, h, r }: { w?: string; h?: string; r?: string }) {
  return (
    <div
      className={`${styles.shimmer}`}
      style={{ width: w ?? '100%', height: h ?? '100%', borderRadius: r }}
    />
  );
}

export function DashboardLoading() {
  return (
    <div className={styles.layout}>
      <aside className={styles.sidebar}>
        <div className={styles.logoRow}>
          <S w="26px" h="26px" r="6px" />
          <S w="90px" h="14px" r="4px" />
        </div>

        <nav className={styles.nav}>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className={`${styles.navItem} ${styles.shimmer}`} />
          ))}
        </nav>

        <div className={styles.userBlock}>
          <S w="34px" h="34px" r="50%" />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <S w="80px" h="12px" r="4px" />
            <S w="110px" h="10px" r="4px" />
          </div>
        </div>
      </aside>

      <main className={styles.main}>
        <div className={styles.headerRow}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <S w="60px" h="10px" r="4px" />
            <S w="200px" h="28px" r="6px" />
          </div>
          <S w="130px" h="38px" r="10px" />
        </div>

        <div className={styles.cards}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className={`${styles.card} ${styles.shimmer}`} />
          ))}
        </div>

        <div className={`${styles.chart} ${styles.shimmer}`} />
      </main>
    </div>
  );
}
