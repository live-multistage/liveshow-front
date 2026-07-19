'use client';

import { Badge, Card, cn } from '@live-show/design-system';
import styles from './Dock.module.scss';

interface StatusBadge {
  label: string;
  variant: 'live' | 'default';
}

interface EventStreamCardProps {
  title: string;
  thumbnailUrl?: string | null;
  statusBadge?: StatusBadge;
  onClick?: () => void;
  active?: boolean;
  disabled?: boolean;
}

export function EventStreamCard({ title, thumbnailUrl, statusBadge, onClick, active, disabled }: EventStreamCardProps) {
  const inner = (
    <div className={styles.cardInner}>
      {thumbnailUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={thumbnailUrl} alt="" className={styles.cardThumb} />
      )}
      <span className={styles.cardTitle}>{title}</span>
      {statusBadge && (
        <Badge variant={statusBadge.variant === 'live' ? 'destructive' : 'secondary'}>
          {statusBadge.variant === 'live' && <span className={styles.liveDot} />}
          {statusBadge.label}
        </Badge>
      )}
    </div>
  );

  return (
    <Card className={cn(styles.cardShell, active && styles.cardActive)}>
      {onClick ? (
        <button
          type="button"
          onClick={onClick}
          disabled={disabled}
          className={styles.cardButton}
        >
          {inner}
        </button>
      ) : (
        inner
      )}
    </Card>
  );
}
