'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { useTranslations } from 'next-intl';
import { Pause, Volume2, Maximize } from 'lucide-react';
import { OrganizerCtaLink } from '../shared/OrganizerCtaLink';
import styles from './OrganizersHero.module.scss';

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

interface HeroParallax {
  heroTxtO: number;
  heroTxtY: number;
  heroY: number;
  heroS: number;
}

const STATIC_PARALLAX: HeroParallax = { heroTxtO: 1, heroTxtY: 0, heroY: 0, heroS: 0.88 };

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function OrganizersHero() {
  const t = useTranslations('organizersPage');
  const mockCams = t.raw('hero.mock.cams') as Array<{ name: string; meta: string }>;

  const [reducedMotion] = useState(prefersReducedMotion);
  const [cam, setCam] = useState(0);
  const [parallax, setParallax] = useState<HeroParallax>(STATIC_PARALLAX);
  const manualRef = useRef(false);
  const sectionRef = useRef<HTMLElement | null>(null);
  const mockRef = useRef<HTMLDivElement | null>(null);
  const heroShiftRef = useRef(300);

  useEffect(() => {
    if (reducedMotion) return undefined;

    let raf = 0;

    const onScroll = () => {
      if (raf) return;
      raf = window.requestAnimationFrame(() => {
        raf = 0;
        const section = sectionRef.current;
        if (!section || window.innerWidth <= 640) {
          setParallax(STATIC_PARALLAX);
          return;
        }

        const vh = window.innerHeight;
        const pin = Math.max(1, section.offsetHeight - vh);
        const heroP = Math.min(1, Math.max(0, window.scrollY / (pin * 0.7)));

        const mock = mockRef.current;
        if (mock) {
          const naturalTop = mock.offsetTop;
          const h = mock.offsetHeight;
          heroShiftRef.current = Math.max(0, naturalTop - Math.max(72, (vh - h) / 2));
        }

        setParallax({
          heroTxtO: Math.max(0, 1 - heroP * 1.6),
          heroTxtY: -heroP * 60,
          heroY: -heroP * heroShiftRef.current,
          heroS: 0.88 + heroP * 0.12,
        });
      });
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    onScroll();

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (raf) window.cancelAnimationFrame(raf);
    };
  }, [reducedMotion]);

  useEffect(() => {
    if (reducedMotion) return undefined;
    const id = window.setInterval(() => {
      if (manualRef.current) return;
      setCam((c) => (c + 1) % CAMS.length);
    }, 3200);
    return () => window.clearInterval(id);
  }, [reducedMotion]);

  const handleSelectCam = (index: number) => {
    manualRef.current = true;
    setCam(index);
  };

  const activeCam = CAMS[cam];
  const activeMock = mockCams[cam] ?? { name: '', meta: '' };
  const audioLabel = cam === 2 ? t('hero.mock.audio.narration') : t('hero.mock.audio.ambient');

  const textStyle: CSSProperties = {
    opacity: parallax.heroTxtO,
    transform: `translateY(${parallax.heroTxtY}px)`,
  };
  const mockStyle: CSSProperties = {
    transform: `translateY(${parallax.heroY}px) scale(${parallax.heroS})`,
  };

  return (
    <section ref={sectionRef} className={styles.section}>
      <div className={styles.pin}>
        <div className={styles.glowTop} aria-hidden="true" />
        <div className={styles.blob} aria-hidden="true" />
        <div className={styles.watermark} aria-hidden="true">
          SHOWON
        </div>

        <div className={styles.text} style={textStyle}>
          <div className={styles.label}>
            <span className={styles.dot} aria-hidden="true" />
            {t('hero.label')}
          </div>
          <h1 className={styles.title}>
            {t('hero.title')} <span className={styles.accent}>{t('hero.titleAccent')}</span>
          </h1>
          <p className={styles.subtitle}>{t('hero.subtitle')}</p>
          <div className={styles.ctaRow}>
            <OrganizerCtaLink size="lg" withArrow>
              {t('hero.cta')}
            </OrganizerCtaLink>
            <a href="#como-funciona" className={styles.secondaryLink}>
              {t('hero.secondary')}
            </a>
          </div>
        </div>

        <div ref={mockRef} className={styles.mockWrap} style={mockStyle}>
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
        </div>
      </div>
    </section>
  );
}
