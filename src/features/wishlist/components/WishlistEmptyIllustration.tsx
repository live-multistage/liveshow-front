import { Heart } from 'lucide-react';
import styles from './WishlistEmptyIllustration.module.scss';

/** Three tilted posters with a pink heart badge — purely decorative. */
export function WishlistEmptyIllustration() {
  return (
    <div className={styles.illustration} aria-hidden="true">
      <div className={`${styles.poster} ${styles.posterLeft}`} />
      <div className={`${styles.poster} ${styles.posterRight}`} />
      <div className={`${styles.poster} ${styles.posterCenter}`}>
        <span className={`${styles.bar} ${styles.barLong}`} />
        <span className={`${styles.bar} ${styles.barShort}`} />
      </div>
      <div className={styles.badge}>
        <Heart className={styles.badgeIcon} fill="currentColor" />
      </div>
    </div>
  );
}
