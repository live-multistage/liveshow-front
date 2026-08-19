'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Home, Search } from 'lucide-react';
import styles from './NotFoundContent.module.scss';

/** Alturas das barras do equalizador, em px — o desenho é simétrico. */
const BAR_HEIGHTS = [20, 32, 44, 32, 20];

export function NotFoundContent() {
  const t = useTranslations('notFound');

  return (
    <main className={styles.main}>
      {/* Puramente decorativo: dois halos de cor que dão profundidade ao fundo
          chapado. Fora da árvore de acessibilidade de propósito. */}
      <div className={`${styles.glow} ${styles.glowPink}`} aria-hidden="true" />
      <div className={`${styles.glow} ${styles.glowViolet}`} aria-hidden="true" />

      <div className={styles.content}>
        <div className={styles.equalizer} aria-hidden="true">
          {BAR_HEIGHTS.map((height, i) => (
            <span
              key={i}
              className={styles.bar}
              style={{ height, animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>

        <p className={styles.eyebrow}>{t('eyebrow')}</p>
        <h1 className={styles.title}>{t('title')}</h1>
        <p className={styles.description}>{t('description')}</p>

        <div className={styles.actions}>
          <Link href="/" className={styles.primary}>
            <Home size={14} strokeWidth={2.4} aria-hidden="true" />
            {t('goHome')}
          </Link>
          <Link href="/events" className={styles.secondary}>
            <Search size={14} strokeWidth={2.2} aria-hidden="true" />
            {t('seeSchedule')}
          </Link>
        </div>

        {/* A pergunta que traz mais gente ao 404 do que qualquer link quebrado:
            comprou e não acha. Manda direto para a lista de acessos. */}
        <p className={styles.help}>
          {t('ticketHelp')}{' '}
          <Link href="/my-list" className={styles.helpLink}>
            {t('ticketHelpLink')}
          </Link>
        </p>
      </div>
    </main>
  );
}
