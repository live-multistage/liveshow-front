import styles from './SettingsPageContent.module.scss';

// Shared by the notification preferences panel and the privacy/analytics
// toggle in SettingsPageContent — extracted, not duplicated.
export function Toggle({ on, onClick, disabled }: { on: boolean; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      className={`${styles.toggle} ${on ? styles.toggleOn : ''}`}
      onClick={onClick}
      disabled={disabled}
      aria-pressed={on}
    >
      <span className={styles.toggleKnob} />
    </button>
  );
}
