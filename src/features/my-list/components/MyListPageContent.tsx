'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Button, Skeleton } from '@live-show/design-system';
import { useAccessibleEventsQuery } from '../queries/get-accessible-events';
import { AccessibleEventCard } from './AccessibleEventCard';
import styles from './MyListPageContent.module.scss';

export function MyListPageContent() {
  const t = useTranslations('myList');
  const { data: events, isLoading, isError, refetch } = useAccessibleEventsQuery();

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.heading}>{t('title')}</h1>
        <p className={styles.subtitle}>{t('subtitle')}</p>
      </header>

      {isLoading && (
        <div className={styles.grid} aria-busy="true">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className={styles.skeleton} />
          ))}
        </div>
      )}

      {/* Erro é distinto de lista vazia: "não conseguimos carregar" com uma
          forma de tentar de novo, nunca o vazio, que afirmaria que o usuário
          não tem nada. */}
      {isError && (
        <div className={styles.state} role="alert">
          <p>{t('loadError')}</p>
          <Button variant="outline" onClick={() => void refetch()}>
            {t('retry')}
          </Button>
        </div>
      )}

      {!isLoading && !isError && events?.length === 0 && (
        <div className={styles.state}>
          <p>{t('empty')}</p>
          <Button asChild>
            <Link href="/events">{t('exploreEvents')}</Link>
          </Button>
        </div>
      )}

      {!isLoading && !isError && !!events?.length && (
        <div className={styles.grid}>
          {events.map((event) => (
            <AccessibleEventCard key={event.id} event={event} />
          ))}
        </div>
      )}
    </main>
  );
}
