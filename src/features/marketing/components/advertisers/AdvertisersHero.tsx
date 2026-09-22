'use client';

import { useEffect, useRef, useState, type RefObject } from 'react';
import { useTranslations } from 'next-intl';
import { ArrowRight } from 'lucide-react';
import { Reveal } from '../shared/Reveal';
import { useIsCompact } from '../../hooks/useStickySteps';
import { PauseAdMock } from './PauseAdMock';
import { ADS_SIGNUP_URL, ADS_LOGIN_URL } from '../../constants';
import styles from './AdvertisersHero.module.scss';

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Scroll progress (0→1) driving the pinned hero's mock scale-up — same
 * rect.top/scrollRange math as shared/ScrollExpandMedia's computeProgress.
 * ponytail: kept local instead of reusing ScrollExpandMedia itself — that
 * component's overlay/media layout is centered & single-column, while this
 * hero keeps its own two-column grid (per the design's S1 HERO markup), so
 * reusing it would mean reshaping its shared CSS just for this page. Small
 * duplication now; extract a shared hook if a third pinned hero shows up.
 */
function useHeroScrollProgress(sectionRef: RefObject<HTMLElement | null>) {
  const [progress, setProgress] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    if (prefersReducedMotion()) {
      setReducedMotion(true);
      setProgress(1);
      return undefined;
    }

    let ticking = false;

    const computeProgress = () => {
      ticking = false;
      const section = sectionRef.current;
      if (!section) return;
      const rect = section.getBoundingClientRect();
      const scrollRange = rect.height - window.innerHeight;
      if (scrollRange <= 0) {
        setProgress(1);
        return;
      }
      const next = -rect.top / scrollRange;
      setProgress(Math.min(Math.max(next, 0), 1));
    };

    const onScrollOrResize = () => {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(computeProgress);
    };

    computeProgress();
    window.addEventListener('scroll', onScrollOrResize, { passive: true });
    window.addEventListener('resize', onScrollOrResize, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScrollOrResize);
      window.removeEventListener('resize', onScrollOrResize);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { progress, reducedMotion };
}

function HeroCopy({ t, guarantees }: { t: ReturnType<typeof useTranslations>; guarantees: string[] }) {
  return (
    <>
      <div className={styles.label}>
        <span className={styles.dot} aria-hidden="true" />
        {t('label')}
      </div>
      <h1 className={styles.title}>
        {t('title')} <span className={styles.accent}>{t('titleAccent')}</span>
      </h1>
      <p className={styles.subtitle}>{t('subtitle')}</p>
      <div className={styles.ctaRow}>
        <a href={ADS_SIGNUP_URL} className={styles.primaryCta}>
          {t('cta')}
          <ArrowRight size={17} strokeWidth={2.4} />
        </a>
        <a href="#posicoes" className={styles.secondaryLink}>
          {t('secondary')}
        </a>
      </div>
      <div className={styles.guarantees}>
        {guarantees.map((item, i) => (
          <span key={item}>
            {i > 0 ? (
              <span className={styles.dividerDot} aria-hidden="true">
                ·
              </span>
            ) : null}
            {item}
          </span>
        ))}
      </div>
      <div className={styles.loginLine}>
        {t.rich('login', { link: (chunks) => <a href={ADS_LOGIN_URL}>{chunks}</a> })}
      </div>
    </>
  );
}

export function AdvertisersHero() {
  const t = useTranslations('advertisersPage.hero');
  const guarantees = t.raw('guarantees') as string[];
  // Design's `narrow` state: window.innerWidth < 900 drops the pin entirely.
  const isNarrow = useIsCompact(900);
  const sectionRef = useRef<HTMLElement | null>(null);
  const { progress, reducedMotion } = useHeroScrollProgress(sectionRef);

  const copy = <HeroCopy t={t} guarantees={guarantees} />;

  // ≤900px, or prefers-reduced-motion: the non-pinned stacked hero — no
  // sticky pin, no scroll-driven scale, same layout the page always had.
  if (isNarrow || reducedMotion) {
    return (
      <section className={styles.section}>
        <div className={styles.glowTop} aria-hidden="true" />
        <div className={styles.blob} aria-hidden="true" />
        <div className={styles.container}>
          <Reveal as="div" className={styles.text}>
            {copy}
          </Reveal>
          <Reveal as="div" delay={120} variant="scale" className={styles.mockCol}>
            <PauseAdMock />
          </Reveal>
        </div>
      </section>
    );
  }

  const scale = 0.92 + progress * 0.08;

  return (
    <section ref={sectionRef as RefObject<HTMLElement>} className={styles.pinnedSection} data-testid="pinned-hero">
      <div className={styles.pinnedSticky}>
        <div className={styles.glowTop} aria-hidden="true" />
        <div className={styles.blob} aria-hidden="true" />
        <div className={styles.pinnedContainer}>
          <div className={styles.text}>{copy}</div>
          <div className={styles.mockCol} style={{ transform: `scale(${scale})` }}>
            <PauseAdMock />
          </div>
        </div>
      </div>
    </section>
  );
}
