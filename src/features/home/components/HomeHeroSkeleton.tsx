import { Skeleton } from '@live-show/design-system';
import styles from './HomeHeroSkeleton.module.scss';

// Placeholder for the hero while the rail feed that decides it is in flight.
export function HomeHeroSkeleton() {
  return (
    <div className={styles.hero} aria-hidden data-testid="hero-skeleton">
      <Skeleton className={styles.title} />
      <Skeleton className={styles.meta} />
      <div className={styles.actions}>
        <Skeleton className={styles.button} />
        <Skeleton className={styles.button} />
      </div>
    </div>
  );
}
