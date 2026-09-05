import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { Reveal } from '../shared/Reveal';
import { organizerIcon, type OrganizerIconKey } from '../../data/organizers-icons';
import styles from './AboutPageContent.module.scss';

// Reuses the Footer contact address — see src/shared/components/Footer/Footer.tsx.
const CONTACT_EMAIL = 'privacidade@showon.io';

const PILLAR_KEYS: Array<{ key: string; icon: OrganizerIconKey; tone: 'pink' | 'violet' }> = [
  { key: 'viewers', icon: 'ticket', tone: 'pink' },
  { key: 'organizers', icon: 'cams', tone: 'pink' },
  { key: 'tech', icon: 'server', tone: 'violet' },
];

export function AboutPageContent() {
  const t = useTranslations('aboutPage');

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.glowTop} aria-hidden="true" />
        <div className={styles.blob} aria-hidden="true" />
        <div className={styles.container}>
          <Reveal as="div" className={styles.label}>
            {t('hero.label')}
          </Reveal>
          <Reveal as="h1" delay={100} className={styles.title}>
            {t('hero.title')} <span className={styles.accent}>{t('hero.titleAccent')}</span>
          </Reveal>
          <Reveal as="p" delay={200} className={styles.text}>
            {t('hero.text')}
          </Reveal>
        </div>
      </section>

      <section className={styles.pillars}>
        <div className={styles.container}>
          <div className={styles.grid}>
            {PILLAR_KEYS.map((pillar, i) => (
              <Reveal as="div" key={pillar.key} delay={i * 100} className={styles.card}>
                <span className={pillar.tone === 'pink' ? styles.chipPink : styles.chipViolet}>
                  {organizerIcon(pillar.icon, 22)}
                </span>
                <div>
                  <div className={styles.cardLabel}>{t(`pillars.${pillar.key}.label`)}</div>
                  <div className={styles.cardTitle}>{t(`pillars.${pillar.key}.title`)}</div>
                  {pillar.key === 'organizers' && (
                    <Link href="/para-organizadores" className={styles.cardLink}>
                      {t('pillars.organizers.link')} <span aria-hidden="true">→</span>
                    </Link>
                  )}
                </div>
              </Reveal>
            ))}
          </div>

          <Reveal as="div" delay={260} className={styles.links}>
            <Link href="/para-organizadores" className={styles.link}>
              {t('links.organizers')} <span aria-hidden="true">→</span>
            </Link>
            <Link href="/help" className={styles.link}>
              {t('links.help')} <span aria-hidden="true">→</span>
            </Link>
            <a href={`mailto:${CONTACT_EMAIL}`} className={styles.link}>
              {t('links.contact')} <span aria-hidden="true">→</span>
            </a>
            <Link href="/privacidade" className={styles.link}>
              {t('links.privacy')} <span aria-hidden="true">→</span>
            </Link>
          </Reveal>
        </div>
      </section>
    </main>
  );
}
