'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Clapperboard, Ticket, History } from 'lucide-react';
import { HeroPlayerMock } from '@/features/marketing/components/organizers/HeroPlayerMock';
import { OrganizerCtaLink } from '@/features/marketing/components/shared/OrganizerCtaLink';
import styles from './OrganizerAcquisitionHero.module.scss';

// Shown on the home when the platform has no events to headline, so a first
// visit (usually a prospect following a shared link) lands on an invitation to
// stream instead of an empty page.
export function OrganizerAcquisitionHero({ applicationsOpen = true }: { applicationsOpen?: boolean }) {
  const t = useTranslations('home.acquisition');
  const cta = (
    <OrganizerCtaLink
      size="lg"
      withArrow={applicationsOpen}
      disabled={!applicationsOpen}
      disabledLabel={t('ctaClosed')}
    >
      {t('cta')}
    </OrganizerCtaLink>
  );
  const proofs = [
    { key: 'cameras', Icon: Clapperboard },
    { key: 'tickets', Icon: Ticket },
    { key: 'replay', Icon: History },
  ] as const;

  return (
    <section className={styles.root} aria-labelledby="home-acquisition-title">
      <div className={styles.glow} aria-hidden="true" />
      <div className={styles.hero}>
        <div className={styles.copy}>
          <span className={styles.label}>
            <span className={styles.dot} aria-hidden="true" />
            {t('label')}
          </span>
          <h2 id="home-acquisition-title" className={styles.title}>
            {t('title')} <em>{t('titleAccent')}</em>
          </h2>
          <p className={styles.subtitle}>{t('subtitle')}</p>
          <div className={styles.cta}>
            {cta}
            <Link href="/be-partner" className={styles.secondary}>
              {t('secondary')}
            </Link>
            {applicationsOpen ? <p className={styles.hint}>{t('ctaHint')}</p> : null}
          </div>
        </div>
        <div className={styles.player} aria-hidden="true">
          <HeroPlayerMock />
        </div>
      </div>
      <ul className={styles.proofs} aria-label={t('proofsLabel')}>
        {proofs.map(({ key, Icon }) => (
          <li key={key} className={styles.proof}>
            <span className={styles.icon}>
              <Icon size={22} strokeWidth={1.8} aria-hidden="true" />
            </span>
            <h3>{t(`${key}.title`)}</h3>
            <p>{t(`${key}.text`)}</p>
          </li>
        ))}
      </ul>
      <div className={styles.final}>
        <h3>{t('finalTitle')}</h3>
        {cta}
      </div>
    </section>
  );
}
