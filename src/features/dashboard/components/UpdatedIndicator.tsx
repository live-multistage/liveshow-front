'use client';

import { useEffect, useState } from 'react';
import styles from './RoleDashboard.module.scss';

interface Props {
  // React Query's dataUpdatedAt (ms epoch); 0 while the first fetch is pending.
  updatedAt: number;
  isFetching: boolean;
  onRefresh: () => void;
}

function label(updatedAt: number, now: number): string {
  if (!updatedAt) return 'ATUALIZANDO…';
  const s = Math.max(0, Math.floor((now - updatedAt) / 1000));
  if (s < 45) return 'ATUALIZADO AGORA';
  const m = Math.floor(s / 60);
  if (m < 1) return `ATUALIZADO HÁ ${s}S`;
  if (m < 60) return `ATUALIZADO HÁ ${m} MIN`;
  const h = Math.floor(m / 60);
  return `ATUALIZADO HÁ ${h}H`;
}

export function UpdatedIndicator({ updatedAt, isFetching, onRefresh }: Props) {
  // Re-render on a timer so the relative label ages without a data change.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 15_000);
    return () => clearInterval(id);
  }, []);

  return (
    <button
      type="button"
      className={styles.updated}
      onClick={onRefresh}
      disabled={isFetching}
      title="Atualizar dados"
    >
      <span className={`${styles.pulseDot} ${isFetching ? styles.pulseDotBusy : ''}`} />
      {isFetching ? 'ATUALIZANDO…' : label(updatedAt, now)}
    </button>
  );
}
