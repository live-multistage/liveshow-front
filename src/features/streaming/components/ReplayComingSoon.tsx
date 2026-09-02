'use client';

import type { CSSProperties } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Navbar } from '@/shared/components/Navbar';
import styles from './ReplayComingSoon.module.scss';

interface Props {
  eventId: string;
  eventTitle: string;
  coverUrl?: string | null;
}

// Waiting room shown between the end of the broadcast and the replay going
// live. The "notify me" CTA from the design is deliberately absent — there is
// no replay-ready notification API yet; add it here when one exists.
export function ReplayComingSoon({ eventId, eventTitle, coverUrl }: Props) {
  const t = useTranslations('replaySoon');

  const frameStyle = coverUrl
    ? ({ '--cover': `url('${coverUrl}')` } as CSSProperties)
    : undefined;

  return (
    <div className={styles.page}>
      <div className={styles.glow} aria-hidden="true" />
      <Navbar />

      <div className={styles.breadcrumbRow}>
        <Link href={`/events/${eventId}`} className={styles.breadcrumb}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
            <path d="M15 18l-6-6 6-6" />
          </svg>
          {t('back')}
        </Link>
      </div>

      <main className={styles.main}>
        <section>
          <div className={styles.frameCard}>
            <div className={styles.frame} style={frameStyle}>
              <div className={styles.frameOverlay} />
              <div className={styles.endedBadge}>{t('ended')}</div>

              <div className={styles.processing}>
                <div className={styles.spinnerWrap}>
                  <svg width="78" height="78" viewBox="0 0 78 78" className={styles.spinnerRing} aria-hidden="true">
                    <circle cx="39" cy="39" r="36" fill="none" stroke="rgba(255,255,255,.1)" strokeWidth="2.5" />
                    <path d="M39 3 a36 36 0 0 1 30 18" fill="none" stroke="#ff2e9e" strokeWidth="2.5" strokeLinecap="round" />
                  </svg>
                  <div className={styles.spinnerIcon}>
                    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
                      <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
                      <path d="M3 3v5h5" />
                    </svg>
                  </div>
                </div>
                <div className={styles.processingText}>
                  <div className={styles.processingLabel}>{t('processing')}</div>
                  <div className={styles.processingSub}>{t('processingSub')}</div>
                </div>
              </div>
            </div>
          </div>

          <div className={styles.includes}>
            <span className={styles.includesLabel}>{t('includesLabel')}</span>
            <div className={styles.includeRow}>
              <span className={styles.includeIcon}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
                  <path d="M23 7l-7 5 7 5V7Z" />
                  <rect x="1" y="5" width="15" height="14" rx="2" />
                </svg>
              </span>
              <span>{t('include1')}</span>
            </div>
            <div className={styles.includeRow}>
              <span className={styles.includeIcon}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 7v5l3 2" />
                </svg>
              </span>
              <span>{t('include2')}</span>
            </div>
            <div className={styles.includeRow}>
              <span className={styles.includeIcon}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
                  <rect x="2" y="4" width="20" height="14" rx="2" />
                  <path d="M8 21h8M12 18v3" />
                </svg>
              </span>
              <span>{t('include3')}</span>
            </div>
          </div>
        </section>

        <section className={styles.right}>
          <div className={styles.statusBadge}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true">
              <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
              <path d="M3 3v5h5" />
            </svg>
            {t('badge')}
          </div>

          <div>
            <div className={styles.eyebrow}>{eventTitle}</div>
            <h1 className={styles.title}>
              {t.rich('title', {
                accent: (chunks) => <span className={styles.titleAccent}>{chunks}</span>,
              })}
            </h1>
            <p className={styles.body}>{t('body')}</p>
          </div>

          <div className={styles.reassurance}>
            <span>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#7fe0a0" strokeWidth="2.4" aria-hidden="true">
                <path d="M20 6L9 17l-5-5" />
              </svg>
              {t('ticketIncluded')}
            </span>
          </div>

          <div className={styles.explore}>
            {t('meanwhile')}
            <Link href="/">{t('explore')}</Link>
          </div>
        </section>
      </main>
    </div>
  );
}
