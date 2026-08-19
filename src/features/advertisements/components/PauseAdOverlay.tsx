'use client';

import { useEffect, useRef, useState } from 'react';
import styles from './PauseAdOverlay.module.scss';
import { AdBanner } from './AdBanner';

// Mostrar o anúncio só depois de uma pausa "de verdade": uma pausa de um
// segundo para ler o chat não deve virar impressão cobrada do anunciante.
const SHOW_DELAY_MS = 2000;

interface Props {
  paused: boolean;
}

export function PauseAdOverlay({ paused }: Props) {
  // Conta transições false→true. Zero = nunca pausou nesta sessão — cobre o
  // ReplayPlayer, que MONTA pausado e não deve mostrar anúncio na carga.
  const pauseCount = useRef(0);
  const prevPaused = useRef(paused);
  const [visibleFor, setVisibleFor] = useState(0);

  useEffect(() => {
    const was = prevPaused.current;
    prevPaused.current = paused;

    if (!paused) {
      setVisibleFor(0);
      return;
    }
    if (was) return;

    pauseCount.current += 1;
    const count = pauseCount.current;
    const timer = setTimeout(() => setVisibleFor(count), SHOW_DELAY_MS);
    return () => clearTimeout(timer);
  }, [paused]);

  if (!paused || visibleFor === 0) return null;

  return (
    <div className={styles.pauseAdOverlay}>
      {/* ponytail: key remonta o AdBanner a cada pausa (dismiss e impressão
          zerados), mas o staleTime de 5min do React Query pode repetir o mesmo
          criativo em pausas seguidas — refetch por pausa se virar requisito. */}
      <AdBanner placement="PLAYER_PAUSE" key={visibleFor} />
    </div>
  );
}
