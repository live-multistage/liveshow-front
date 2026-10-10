'use client';

import { useEffect, useRef, type RefObject } from 'react';
import { useTranslations } from 'next-intl';
import { ArrowRight } from 'lucide-react';
import { PauseAdMock } from './PauseAdMock';
import { ADS_SIGNUP_URL, ADS_LOGIN_URL } from '../../constants';
import styles from './AdvertisersHero.module.scss';

/**
 * Writes the pinned hero's scroll progress (0→1) as `--hero-scale` straight
 * onto the section — same rect.top/scrollRange math as
 * shared/ScrollExpandMedia's computeProgress. No React state: scrolling never
 * re-renders the hero, and whether the pin applies at all is decided by CSS
 * (see .section in the module), so server and client render one identical
 * tree and the LCP heading is never remounted after hydration.
 */
function useHeroScrollScale(sectionRef: RefObject<HTMLElement | null>) {
  useEffect(() => {
    let ticking = false;

    const computeScale = () => {
      ticking = false;
      const section = sectionRef.current;
      if (!section) return;
      const rect = section.getBoundingClientRect();
      const scrollRange = rect.height - window.innerHeight;
      const progress = scrollRange <= 0 ? 1 : Math.min(Math.max(-rect.top / scrollRange, 0), 1);
      section.style.setProperty('--hero-scale', String(0.92 + progress * 0.08));
    };

    const onScrollOrResize = () => {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(computeScale);
    };

    computeScale();
    window.addEventListener('scroll', onScrollOrResize, { passive: true });
    window.addEventListener('resize', onScrollOrResize, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScrollOrResize);
      window.removeEventListener('resize', onScrollOrResize);
    };
  }, [sectionRef]);
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
        <a
          href={ADS_SIGNUP_URL}
          className={styles.primaryCta}
          data-track="advertiser_cta_clicked"
          data-track-props='{"placement":"hero_signup"}'
        >
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
        {t.rich('login', {
          link: (chunks) => <a href={ADS_LOGIN_URL}>{chunks}</a>,
        })}
      </div>
    </>
  );
}

export function AdvertisersHero() {
  const t = useTranslations('advertisersPage.hero');
  const guarantees = t.raw('guarantees') as string[];
  const sectionRef = useRef<HTMLElement | null>(null);
  useHeroScrollScale(sectionRef);

  return (
    <section ref={sectionRef} className={styles.section}>
      <div className={styles.sticky}>
        <div className={styles.glowTop} aria-hidden="true" />
        <div className={styles.blob} aria-hidden="true" />
        <div className={styles.container}>
          <div className={styles.text}>
            <HeroCopy t={t} guarantees={guarantees} />
          </div>
          <div className={styles.mockCol}>
            <PauseAdMock />
          </div>
        </div>
      </div>
    </section>
  );
}
