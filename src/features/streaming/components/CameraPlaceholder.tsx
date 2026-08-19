'use client';

import { Logo } from '@live-show/design-system';
import styles from './CameraPlaceholder.module.scss';

interface Props {
  className?: string;
}

export function CameraPlaceholder({ className }: Props) {
  return (
    <div className={[styles.root, className].filter(Boolean).join(' ')} aria-hidden="true">
      <Logo size={44} showWordmark={false} color="#ff2e9e" className={styles.logo} />
    </div>
  );
}
