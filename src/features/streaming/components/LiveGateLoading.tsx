'use client';

import styles from './LiveGateLoading.module.scss';

interface Props {
  message?: string;
  eventTitle?: string;
  onCancel?: () => void;
}

export function LiveGateLoading({ message, eventTitle, onCancel }: Props) {
  return (
    <div className={styles.root}>
      {/* Ambient glows */}
      <div className={styles.glowPink} aria-hidden="true" />
      <div className={styles.glowPurple} aria-hidden="true" />
      <div className={styles.grid} aria-hidden="true" />
      <div className={styles.scanline} aria-hidden="true" />

      {/* Header */}
      <header className={styles.header}>
        <div className={styles.logo}>
          <svg width="24" height="24" viewBox="0 0 24 24" className={styles.logoMark} aria-hidden="true">
            <g fill="#fff">
              <rect x="2" y="9" width="2.4" height="6" rx="1.2" />
              <rect x="6" y="5" width="2.4" height="14" rx="1.2" />
              <rect x="10" y="2" width="2.4" height="20" rx="1.2" />
              <rect x="14" y="6" width="2.4" height="12" rx="1.2" />
              <rect x="18" y="9" width="2.4" height="6" rx="1.2" />
            </g>
          </svg>
          <span className={styles.logoText}>LIVESHOW</span>
        </div>
        {onCancel && (
          <button className={styles.cancelBtn} onClick={onCancel} type="button">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
            CANCELAR
          </button>
        )}
      </header>

      {/* Center */}
      <main className={styles.main}>

        {/* Eyebrow pill */}
        <div className={styles.eyebrow} aria-live="polite">
          <span className={styles.eyebrowDot} aria-hidden="true" />
          CONECTANDO AO LIVE
        </div>

        {/* Radar + EQ cluster */}
        <div className={styles.cluster} aria-hidden="true">
          <div className={styles.radarRings}>
            <div className={styles.radarRing} />
            <div className={styles.radarRing} />
            <div className={styles.radarRingPurple} />
          </div>
          <div className={styles.ringOuter} />
          <div className={styles.ringInner} />
          <div className={styles.eqCircle}>
            <div className={styles.eqBar} />
            <div className={styles.eqBar} />
            <div className={styles.eqBar} />
            <div className={styles.eqBar} />
            <div className={styles.eqBar} />
            <div className={styles.eqBar} />
            <div className={styles.eqBar} />
            <div className={styles.eqBar} />
          </div>
        </div>

        {/* Event info */}
        {eventTitle && (
          <div className={styles.eventInfo}>
            <div className={styles.eventMeta}>VOCÊ ESTÁ ENTRANDO EM</div>
            <h1 className={styles.eventTitle}>{eventTitle}</h1>
          </div>
        )}

        {/* Progress + status */}
        <div className={styles.progressSection}>
          <div className={styles.statusRow}>
            <div className={styles.statusMessages}>
              <div className={styles.statusMsg}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#ff7ec2" strokeWidth="2" aria-hidden="true">
                  <circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c2.5 2.5 2.5 15 0 18M12 3c-2.5 2.5-2.5 15 0 18" />
                </svg>
                VERIFICANDO INGRESSO…
              </div>
              <div className={styles.statusMsg}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#ff7ec2" strokeWidth="2" aria-hidden="true">
                  <path d="M3 9a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4v6a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4z" />
                </svg>
                NEGOCIANDO QUALIDADE DE VÍDEO…
              </div>
              <div className={styles.statusMsg}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#ff7ec2" strokeWidth="2" aria-hidden="true">
                  <path d="M23 7l-7 5 7 5V7Z" /><rect x="1" y="5" width="15" height="14" rx="2" />
                </svg>
                CONECTANDO ÀS CÂMERAS…
              </div>
              <div className={styles.statusMsg}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#7fe0a0" strokeWidth="2.4" aria-hidden="true">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
                SINCRONIZANDO ÁUDIO AO VIVO…
              </div>
            </div>
          </div>
          <div className={styles.progressTrack}>
            <div className={styles.progressFill} />
          </div>
        </div>

        {/* Info chips */}
        <div className={styles.chips}>
          <span className={styles.chip}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#46d6d8" strokeWidth="2.4" aria-hidden="true">
              <path d="M20 6L9 17l-5-5" />
            </svg>
            1080P
          </span>
          <span className={styles.chip}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#46d6d8" strokeWidth="2" aria-hidden="true">
              <path d="M23 7l-7 5 7 5V7Z" /><rect x="1" y="5" width="15" height="14" rx="2" />
            </svg>
            MULTI-CÂMERAS
          </span>
          <span className={styles.chip}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#bba6ff" strokeWidth="2" aria-hidden="true">
              <path d="M3 12a9 9 0 0 1 18 0 9 9 0 0 1-18 0z" /><path d="M3 12h18" />
            </svg>
            LATÊNCIA BAIXA
          </span>
          <span className={`${styles.chip} ${styles.chipPink}`}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" />
            </svg>
            ÁUDIO ESPACIAL
          </span>
        </div>
      </main>

      {/* Footer */}
      <footer className={styles.footer}>
        <div className={styles.footerTip}>
          <span className={styles.footerTipLabel}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#ffd166" strokeWidth="2" aria-hidden="true">
              <path d="M12 2l2.5 7H22l-6 4.5L18.5 21 12 16.8 5.5 21l2.5-7.5L2 9h7.5z" />
            </svg>
            DICA
          </span>
          Pressione <kbd className={styles.kbd}>F</kbd> para tela cheia · <kbd className={styles.kbd}>C</kbd> para trocar câmera
        </div>
        <div className={styles.footerServer}>
          <span className={styles.serverDot} aria-hidden="true" />
          SERVIDOR ATIVO
        </div>
      </footer>
    </div>
  );
}
