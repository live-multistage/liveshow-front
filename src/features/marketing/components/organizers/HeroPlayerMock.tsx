'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Pause, Volume2, Maximize } from 'lucide-react';
import styles from './HeroPlayerMock.module.scss';

interface CamData {
  code: string;
  bg: string;
  thumb: string;
}

// Gradients ported 1:1 from design.html's camsData — kept out of i18n since
// they're purely visual, not content.
const CAMS: CamData[] = [
  {
    code: 'CAM 1',
    bg: 'linear-gradient(160deg,#2a0f24 0%,#120a13 55%,#08080a)',
    thumb: 'linear-gradient(160deg,#3a1530,#1a0d18)',
  },
  {
    code: 'CAM 2',
    bg: 'linear-gradient(160deg,#1c1030 0%,#0b0b14 60%,#08080a)',
    thumb: 'linear-gradient(160deg,#2a1a44,#14101f)',
  },
  {
    code: 'CAM 3',
    bg: 'linear-gradient(160deg,#0f1a2e 0%,#0a0d14 60%,#08080a)',
    thumb: 'linear-gradient(160deg,#17284a,#0e131f)',
  },
  {
    code: 'CAM 4',
    bg: 'linear-gradient(160deg,#2b1a0e 0%,#140d0a 60%,#08080a)',
    thumb: 'linear-gradient(160deg,#3f2613,#1a120c)',
  },
];

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function HeroPlayerMock() {
  const t = useTranslations('organizersPage');
  const mockCams = t.raw('hero.mock.cams') as Array<{ name: string; meta: string }>;

  const [cam, setCam] = useState(0);
  const manualRef = useRef(false);

  useEffect(() => {
    if (prefersReducedMotion()) return undefined;
    const id = window.setInterval(() => {
      if (manualRef.current) return;
      setCam((c) => (c + 1) % CAMS.length);
    }, 3200);
    return () => window.clearInterval(id);
  }, []);

  const handleSelectCam = (index: number) => {
    manualRef.current = true;
    setCam(index);
  };

  const activeCam = CAMS[cam];
  const activeMock = mockCams[cam] ?? { name: '', meta: '' };
  const audioLabel = cam === 2 ? t('hero.mock.audio.narration') : t('hero.mock.audio.ambient');

  return (
    <div className={styles.mockInner}>
      <div className={styles.mockGlow} aria-hidden="true" />
      <div className={styles.panel}>
        <div className={styles.topBar}>
          <span className={styles.livePill}>
            <span className={styles.liveDot} aria-hidden="true" />
            {t('hero.mock.live')}
          </span>
          <span className={styles.eventTitle}>{t('hero.mock.event')}</span>
          <span className={styles.spacer} />
          <span className={styles.meta}>{t('hero.mock.meta')}</span>
        </div>

        <div className={styles.grid}>
          <div className={styles.stage} style={{ background: activeCam.bg }}>
            <div className={styles.stageGrid} aria-hidden="true" />
            <div className={styles.stageFade} aria-hidden="true" />
            <div className={styles.camLabel}>
              {activeMock.name.toUpperCase()}
              <br />
              <span className={styles.camCode}>{activeCam.code}</span>
            </div>
            <div className={styles.libras}>
              <span>{t('hero.mock.libras')}</span>
            </div>
            <div className={styles.transport}>
              <Pause size={18} fill="currentColor" />
              <div className={styles.progress}>
                <div className={styles.progressFill} />
              </div>
              <span className={styles.audioPill}>
                <Volume2 size={11} />
                {audioLabel}
              </span>
              <Maximize size={16} />
            </div>
          </div>

          <div className={styles.camSidebar}>
            <div className={styles.camSidebarLabel}>{t('hero.mock.camsLabel')}</div>
            {CAMS.map((c, i) => {
              const info = mockCams[i];
              if (!info) return null;
              const isActive = i === cam;
              return (
                <button
                  key={c.code}
                  type="button"
                  aria-pressed={isActive}
                  className={isActive ? `${styles.camButton} ${styles.camButtonActive}` : styles.camButton}
                  onClick={() => handleSelectCam(i)}
                >
                  <span className={styles.camThumb} style={{ background: c.thumb }} />
                  <span className={styles.camInfo}>
                    <span className={styles.camName}>{info.name}</span>
                    <span className={styles.camMeta}>{info.meta}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
