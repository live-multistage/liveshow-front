import styles from './HomeFooter.module.scss';

export function HomeFooter() {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <span className={styles.brand}>Liveshow</span>
        <span>© {new Date().getFullYear()}</span>
      </div>
    </footer>
  );
}
