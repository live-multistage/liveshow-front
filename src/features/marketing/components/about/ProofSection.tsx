import { getLocale, getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { fetchReplayCatalog } from '@/features/events/queries/get-replay-catalog.server';
import { eventHref } from '@/features/events/utils/slug';
import { Reveal } from '../shared/Reveal';
import { SectionHeader } from '../shared/SectionHeader';
import styles from './ProofSection.module.scss';

const MIN_ITEMS = 3;
const MAX_CARDS = 6;

const DATE_LOCALE: Record<string, string> = { pt: 'pt-BR', en: 'en-US', es: 'es-419' };

export async function ProofSection() {
  const [{ items }, t, locale] = await Promise.all([
    fetchReplayCatalog(),
    getTranslations('aboutPage'),
    getLocale(),
  ]);

  // The catalog endpoint already scopes to finished + publicly visible events
  // (it exists solely to feed replay rails), so no extra client-side filter.
  if (items.length < MIN_ITEMS) return null;

  const dateFormatter = new Intl.DateTimeFormat(DATE_LOCALE[locale] ?? 'pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  return (
    <section className={styles.section}>
      <div className={styles.container}>
        <SectionHeader label={t('proof.label')} title={t('proof.title')} />
        <div className={styles.grid}>
          {items.slice(0, MAX_CARDS).map((event, i) => {
            const poster = event.thumbnailUrl || event.bannerUrl;
            return (
              <Reveal key={event.id} delay={i * 70}>
                <Link href={eventHref(event)} className={styles.card}>
                  <div
                    className={styles.poster}
                    style={poster ? { backgroundImage: `url(${poster})` } : undefined}
                  >
                    <span className={styles.badge}>{t('proof.badge')}</span>
                    <span className={styles.title}>{event.title}</span>
                  </div>
                  <div className={styles.meta}>
                    <span className={styles.org}>{event.organization?.name}</span>
                    <span className={styles.date}>{dateFormatter.format(new Date(event.startsAt))}</span>
                  </div>
                </Link>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
