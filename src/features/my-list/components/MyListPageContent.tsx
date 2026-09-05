'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Search, Ticket, Gift, BadgeCheck } from 'lucide-react';
import { Button, Chip, Skeleton } from '@live-show/design-system';
import { useAuth } from '@/features/account/hooks/use-auth';
import { usePlaybackProgressQuery } from '@/features/playback-progress';
import { ShowCard, eventToShow, useRecommendedEventsQuery } from '@/features/events';
import { EmptyStatePanel } from '@/shared/components/EmptyStatePanel/EmptyStatePanel';
import { useAccessibleEventsQuery } from '../queries/get-accessible-events';
import {
  MY_LIST_FILTERS,
  groupAccessibleEvents,
  isEmptyGroup,
  type MyListFilter,
} from '../utils/group-events';
import { LiveEventHero } from './LiveEventHero';
import { ContinueWatchingCard } from './ContinueWatchingCard';
import { UpcomingEventRow } from './UpcomingEventRow';
import { ReplayCard } from './ReplayCard';
import { MyListEmptyIllustration } from './MyListEmptyIllustration';
import styles from './MyListPageContent.module.scss';

export function MyListPageContent() {
  const t = useTranslations('myList');
  const { data: events, isLoading, isError, refetch } = useAccessibleEventsQuery();

  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<MyListFilter>('all');

  const { isLoggedIn } = useAuth();
  const { data: progressList } = usePlaybackProgressQuery({ enabled: isLoggedIn });
  const { data: recommended } = useRecommendedEventsQuery();
  const recommendedShows = (recommended?.items ?? []).slice(0, 4).map(eventToShow);

  // Índice por evento, montado uma vez: o agrupamento consulta por id e
  // refazer o Map a cada tecla digitada na busca seria trabalho puro.
  const progress = useMemo(
    () => new Map((progressList ?? []).map((p) => [p.eventId, p])),
    [progressList],
  );

  const grouped = useMemo(
    () => groupAccessibleEvents(events ?? [], { query, filter, progress }),
    [events, query, filter, progress],
  );

  const total = events?.length ?? 0;
  const hasEvents = total > 0;

  return (
    <main className={styles.page}>
      <div className={styles.headerRow}>
        <div>
          <p className={styles.eyebrow}>{t('eyebrow')}</p>
          <h1 className={styles.heading}>{t('title')}</h1>
          <p className={styles.subtitle}>
            {hasEvents ? t('totalLabel', { count: total }) : t('subtitle')}
          </p>
        </div>

        {hasEvents && (
          <div className={styles.search}>
            <Search size={15} aria-hidden="true" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('searchPlaceholder')}
              aria-label={t('searchPlaceholder')}
              className={styles.searchInput}
            />
          </div>
        )}
      </div>

      {!isLoading && !isError && (
        <div className={styles.filters} role="group" aria-label={t('filtersLabel')}>
          {MY_LIST_FILTERS.map((key) => (
            <Chip
              key={key}
              variant={filter === key ? 'active' : 'default'}
              aria-pressed={filter === key}
              onClick={() => setFilter(key)}
            >
              {t(`filters.${key}`)}
            </Chip>
          ))}
        </div>
      )}

      {isLoading && (
        <div className={styles.loading} aria-busy="true">
          <Skeleton className={styles.heroSkeleton} />
          <div className={styles.replayGrid}>
            {Array.from({ length: 3 }, (_, i) => (
              <Skeleton key={i} className={styles.cardSkeleton} />
            ))}
          </div>
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

      {!isLoading && !isError && !hasEvents && (
        <>
          <EmptyStatePanel
            illustration={<MyListEmptyIllustration />}
            badge={t(`emptyState.${filter}.badge`)}
            title={t(`emptyState.${filter}.title`)}
            text={t(`emptyState.${filter}.text`)}
            primaryCta={{ href: '/events', label: t('exploreEvents') }}
            kindsLabel={t('kindsLabel')}
            kinds={[
              {
                icon: <Ticket size={16} aria-hidden="true" />,
                title: t('kinds.purchased.title'),
                text: t('kinds.purchased.text'),
              },
              {
                icon: <Gift size={16} aria-hidden="true" />,
                title: t('kinds.free.title'),
                text: t('kinds.free.text'),
              },
              {
                icon: <BadgeCheck size={16} aria-hidden="true" />,
                title: t('kinds.redeemed.title'),
                text: t('kinds.redeemed.text'),
              },
            ]}
          />

          {recommendedShows.length > 0 && (
            <div className={styles.teaser}>
              <div className={styles.teaserHeader}>
                <div>
                  <p className={styles.eyebrow}>{t('teaser.eyebrow')}</p>
                  <h2 className={styles.teaserTitle}>
                    {t('teaser.title')} <span className={styles.teaserAccent}>{t('teaser.titleAccent')}</span>
                  </h2>
                </div>
                <Link href="/events" className={styles.teaserLink}>
                  {t('teaser.all')} →
                </Link>
              </div>
              <div className={styles.teaserGrid}>
                {recommendedShows.map((show) => (
                  <ShowCard key={show.id} show={show} />
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {!isLoading && !isError && hasEvents && (
        <>
          {grouped.live.length > 0 && (
            <section className={styles.section}>
              <h2 className={`${styles.sectionTitle} ${styles.sectionTitleLive}`}>
                <span className={styles.pulse} aria-hidden="true" />
                {t('sections.live')}
              </h2>
              <div className={styles.stack}>
                {grouped.live.map((event) => (
                  <LiveEventHero key={event.id} event={event} />
                ))}
              </div>
            </section>
          )}

          {grouped.continueWatching.length > 0 && (
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>{t('sections.continueWatching')}</h2>
              <div className={styles.continueGrid}>
                {grouped.continueWatching.map((event) => {
                  const entry = progress.get(event.id);
                  // O agrupamento só põe aqui quem TEM progresso, mas o card
                  // exige a entrada — a guarda evita depender dessa invariante
                  // à distância.
                  return entry ? (
                    <ContinueWatchingCard key={event.id} event={event} progress={entry} />
                  ) : null;
                })}
              </div>
            </section>
          )}

          {grouped.upcoming.length > 0 && (
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>{t('sections.upcoming')}</h2>
              <div className={styles.rows}>
                {grouped.upcoming.map((event) => (
                  <UpcomingEventRow key={event.id} event={event} />
                ))}
              </div>
            </section>
          )}

          {grouped.replays.length > 0 && (
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>{t('sections.replays')}</h2>
              <div className={styles.replayGrid}>
                {grouped.replays.map((event) => (
                  <ReplayCard key={event.id} event={event} />
                ))}
              </div>
            </section>
          )}

          {/* Vazio POR FILTRO, não vazio de conta: o usuário tem eventos, só
              nenhum que case com o que ele pediu. Dizer "você não tem acesso a
              nada" aqui seria mentira. */}
          {isEmptyGroup(grouped) && (
            <div className={styles.noResults}>
              <p className={styles.noResultsTitle}>{t('noResults')}</p>
              <p className={styles.noResultsHint}>
                {query.trim() ? t('noResultsQuery', { query: query.trim() }) : t('noResultsFilter')}
              </p>
            </div>
          )}
        </>
      )}
    </main>
  );
}
