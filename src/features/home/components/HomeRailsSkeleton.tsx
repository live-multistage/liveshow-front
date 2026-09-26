import { Skeleton } from '@live-show/design-system';
import styles from './HomeRailsSkeleton.module.scss';

const CARDS_PER_RAIL = 6;

// Placeholder for a page of rails that is still in flight. Card widths come
// from the same mixin the real rail card uses, so the list does not jump.
export function HomeRailsSkeleton({ rails }: { rails: number }) {
  return (
    <>
      {Array.from({ length: rails }, (_, railIndex) => (
        <div key={railIndex} className={styles.rail} aria-hidden data-testid="rail-skeleton">
          <Skeleton className={styles.title} />
          <div className={styles.track}>
            {Array.from({ length: CARDS_PER_RAIL }, (_, cardIndex) => (
              <div key={cardIndex} className={styles.card}>
                <Skeleton className={styles.poster} />
                <Skeleton className={styles.lineShort} />
                <Skeleton className={styles.lineLong} />
                <Skeleton className={styles.lineShort} />
              </div>
            ))}
          </div>
        </div>
      ))}
    </>
  );
}
