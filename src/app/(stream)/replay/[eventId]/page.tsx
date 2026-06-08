'use client';

import { useParams } from 'next/navigation';
import styles from './page.module.scss';

export default function ReplayPage() {
  const { eventId } = useParams() as { eventId: string };
  return (
    <div className={styles.page}>
      <p className={styles.text}>Replay: {eventId}</p>
    </div>
  );
}
