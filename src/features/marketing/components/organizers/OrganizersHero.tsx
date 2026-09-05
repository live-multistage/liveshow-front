'use client';

import { useTranslations } from 'next-intl';
import { Logo } from '@live-show/design-system';
import { ScrollExpandMedia } from '../shared/ScrollExpandMedia';
import { OrganizerCtaLink } from '../shared/OrganizerCtaLink';
import { HeroPlayerMock } from './HeroPlayerMock';
import styles from './OrganizersHero.module.scss';

function goToHowItWorks(expand: () => void) {
  expand();
  // Wait for the expand state to flush before jumping — otherwise the
  // scroll-lock effect fights the anchor navigation.
  window.requestAnimationFrame(() => {
    document.getElementById('como-funciona')?.scrollIntoView({ behavior: 'smooth' });
  });
}

export function OrganizersHero() {
  const t = useTranslations('organizersPage');

  return (
    <ScrollExpandMedia
      className={styles.section}
      hint={t('hero.scrollHint')}
      background={
        <>
          <div className={styles.glowTop} aria-hidden="true" />
          <div className={styles.blob} aria-hidden="true" />
          <div className={styles.watermark} aria-hidden="true">
            <Logo showWordmark={false} size={400} color="rgba(255, 255, 255, 0.035)" className={styles.watermarkLogo} />
          </div>
        </>
      }
      media={<HeroPlayerMock />}
      overlay={({ progress, expand }) => {
        const fade = Math.max(0, 1 - progress * 4);
        const shiftUp = -progress * 40;

        return (
          <div className={styles.text}>
            <div className={styles.label} style={{ opacity: fade, transform: `translateY(${shiftUp}px)` }}>
              <span className={styles.dot} aria-hidden="true" />
              {t('hero.label')}
            </div>
            <h1 className={styles.title} style={{ '--tp': progress } as never}>
              <span className={styles.titleMain}>{t('hero.title')}</span>{' '}
              <span className={styles.accent}>{t('hero.titleAccent')}</span>
            </h1>
            <p className={styles.subtitle} style={{ opacity: fade, transform: `translateY(${shiftUp}px)` }}>
              {t('hero.subtitle')}
            </p>
            <div className={styles.ctaRow} style={{ opacity: fade, transform: `translateY(${shiftUp}px)` }}>
              <OrganizerCtaLink size="lg" withArrow>
                {t('hero.cta')}
              </OrganizerCtaLink>
              <a
                href="#como-funciona"
                className={styles.secondaryLink}
                onClick={(event) => {
                  event.preventDefault();
                  goToHowItWorks(expand);
                }}
              >
                {t('hero.secondary')}
              </a>
            </div>
          </div>
        );
      }}
    />
  );
}
