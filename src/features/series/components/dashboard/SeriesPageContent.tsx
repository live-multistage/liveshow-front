'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Plus, Repeat, Search, Tv } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import clsx from 'clsx';
import { useMyOrganizationsQuery } from '@/features/organizations/queries/get-my-organizations';
import type { SeriesOrgResponse } from '../../types/series.types';
import { getRecurrenceParts, formatStartTime } from '../../utils/recurrence';
import { formatCountdown, formatEpisodeWhen } from '../../utils/countdown';
import { useOrgSeriesQuery } from '../../queries/series.queries';
import styles from './SeriesPageContent.module.scss';

type FilterKey = 'all' | 'active' | 'ended';

function statusKind(series: SeriesOrgResponse): Exclude<FilterKey, 'all'> | 'paused' {
  if (series.status === 'ENDED') return 'ended';
  if (series.status === 'PAUSED') return 'paused';
  return 'active';
}

// Earliest upcoming episode across the org, formatted compactly for the stat
// tile: short weekday + local time (now-independent, so SSR-safe).
function formatNextStat(series: SeriesOrgResponse[], locale: string): string | null {
  const upcoming = series
    .map((s) => s.nextEpisode)
    .filter((e): e is NonNullable<typeof e> => Boolean(e))
    .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
  const next = upcoming[0];
  if (!next) return null;
  const date = new Date(next.startsAt);
  const weekday = new Intl.DateTimeFormat(locale, { weekday: 'short' })
    .format(date)
    .replace('.', '');
  const time = new Intl.DateTimeFormat(locale, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
  return `${weekday} ${time}`;
}

export function SeriesPageContent() {
  const t = useTranslations('series');
  const tDashboard = useTranslations('dashboard');
  const tCommon = useTranslations('common');
  const locale = useLocale();
  const { data: organizations = [] } = useMyOrganizationsQuery();
  const [organizationId, setOrganizationId] = useState('');
  const [filter, setFilter] = useState<FilterKey>('all');
  const [search, setSearch] = useState('');

  const activeOrganizationId = organizationId || organizations[0]?.id || '';
  const { data: seriesList = [], isLoading } = useOrgSeriesQuery(activeOrganizationId, {
    enabled: Boolean(activeOrganizationId),
  });

  const counts = useMemo(() => {
    const c = { all: seriesList.length, active: 0, ended: 0, episodes: 0 };
    for (const s of seriesList) {
      const kind = statusKind(s);
      if (kind === 'active') c.active += 1;
      if (kind === 'ended') c.ended += 1;
      c.episodes += s.episodeCount;
    }
    return c;
  }, [seriesList]);

  const nextStat = useMemo(
    () => formatNextStat(seriesList, locale) ?? t('dashboard.nextStatNone'),
    [seriesList, locale, t],
  );

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    return seriesList.filter((s) => {
      if (filter === 'active' && statusKind(s) !== 'active') return false;
      if (filter === 'ended' && statusKind(s) !== 'ended') return false;
      if (!q) return true;
      return s.name.toLowerCase().includes(q) || s.slug.toLowerCase().includes(q);
    });
  }, [seriesList, filter, search]);

  const tabs: Array<{ key: FilterKey; label: string; count: number }> = [
    { key: 'all', label: t('dashboard.filters.all'), count: counts.all },
    { key: 'active', label: t('dashboard.filters.active'), count: counts.active },
    { key: 'ended', label: t('dashboard.filters.ended'), count: counts.ended },
  ];

  const stats: Array<{ key: string; label: string; value: string; live?: boolean }> = [
    { key: 'total', label: t('dashboard.stats.total'), value: String(counts.all) },
    { key: 'active', label: t('dashboard.stats.active'), value: String(counts.active), live: true },
    { key: 'episodes', label: t('dashboard.stats.episodes'), value: String(counts.episodes) },
    { key: 'next', label: t('dashboard.stats.nextEpisode'), value: nextStat },
  ];

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerText}>
          <h1 className={styles.heading}>{t('dashboard.title')}</h1>
          <p className={styles.subtitle}>{t('dashboard.subtitle')}</p>
        </div>

        <div className={styles.headerActions}>
          {organizations.length > 1 && (
            <select
              aria-label={tDashboard('nav.organizations')}
              className={styles.select}
              value={activeOrganizationId}
              onChange={(event) => setOrganizationId(event.target.value)}
            >
              {organizations.map((organization) => (
                <option key={organization.id} value={organization.id}>
                  {organization.name}
                </option>
              ))}
            </select>
          )}
          <Link href="/dashboard/series/new" className={styles.newLink}>
            <Plus size={16} strokeWidth={2.4} />
            {t('dashboard.new')}
          </Link>
        </div>
      </header>

      <div className={styles.stats}>
        {stats.map((stat) => (
          <div key={stat.key} className={clsx(styles.stat, stat.live && styles.statLive)}>
            <span className={clsx(styles.statLabel, stat.live && styles.statLabelLive)}>
              {stat.label}
            </span>
            <span className={styles.statValue}>{stat.value}</span>
          </div>
        ))}
      </div>

      <div className={styles.toolbar}>
        <div className={styles.tabs} role="tablist">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={filter === tab.key}
              className={clsx(styles.tab, filter === tab.key && styles.tabActive)}
              onClick={() => setFilter(tab.key)}
            >
              {tab.label}
              <span className={styles.tabCount}>{tab.count}</span>
            </button>
          ))}
        </div>

        <div className={styles.searchBox}>
          <Search size={15} className={styles.searchIcon} />
          <input
            type="search"
            className={styles.searchInput}
            placeholder={t('dashboard.searchPlaceholder')}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
      </div>

      {isLoading && <p className={styles.state}>{tCommon('loading')}</p>}

      {!isLoading && seriesList.length === 0 && (
        <div className={styles.empty}>
          <Repeat size={32} className={styles.emptyIcon} />
          <p className={styles.emptyText}>{t('dashboard.empty')}</p>
          <Link href="/dashboard/series/new" className={styles.newLink}>
            <Plus size={16} strokeWidth={2.4} />
            {t('dashboard.new')}
          </Link>
        </div>
      )}

      {!isLoading && seriesList.length > 0 && shown.length === 0 && (
        <p className={styles.state}>{t('dashboard.noMatches')}</p>
      )}

      {shown.length > 0 && (
        <ul className={styles.list}>
          {shown.map((series) => (
            <li key={series.id}>
              <SeriesRow
                series={series}
                statusLabel={t(`dashboard.status.${series.status}`)}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function SeriesRow({ series, statusLabel }: { series: SeriesOrgResponse; statusLabel: string }) {
  const t = useTranslations('series');
  const locale = useLocale();
  const ended = series.status === 'ENDED';

  const recurrenceParts = getRecurrenceParts(
    series.rrule,
    formatStartTime(series.dtstart, series.timezone),
    locale,
  );
  const recurrence =
    recurrenceParts.type === 'daily'
      ? t('recurrence.badgeDaily')
      : t('recurrence.badgeWeekly', { day: recurrenceParts.day });

  const cover = series.nextEpisode?.thumbnailUrl ?? null;
  const countdown = series.nextEpisode ? formatCountdown(series.nextEpisode.startsAt) : null;

  return (
    <Link
      href={`/dashboard/series/${series.slug}`}
      className={clsx(styles.row, !ended && styles.rowActive)}
    >
      <div className={styles.deck}>
        <span className={clsx(styles.deckLayer, styles.deckBack)} aria-hidden="true" />
        <span className={clsx(styles.deckLayer, styles.deckFront)} aria-hidden="true" />
        <div className={clsx(styles.thumb, ended && styles.thumbEnded)}>
          {cover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={cover} alt="" className={styles.thumbImage} />
          ) : (
            <span className={styles.thumbFallback} aria-hidden="true" />
          )}
          <div className={styles.thumbTop}>
            <span className={styles.recurrenceBadge}>
              <Repeat size={9} strokeWidth={2.8} aria-hidden="true" />
              {recurrence}
            </span>
            <span className={styles.episodesBadge}>
              {t('episodesShort', { count: series.episodeCount })}
            </span>
          </div>
        </div>
      </div>

      <div className={styles.info}>
        <div className={styles.nameRow}>
          <span className={styles.name}>{series.name}</span>
          <span className={styles.slug}>@{series.slug}</span>
        </div>

        <div className={styles.nextBlock}>
          <span className={styles.nextLabel}>
            {ended ? t('seasonEnded') : t('nextEpisodeLabel')}
          </span>
          <span className={clsx(styles.nextTitle, ended && styles.nextTitleMuted)}>
            {series.nextEpisode ? series.nextEpisode.title : ended ? t('endedHint') : t('noUpcoming')}
          </span>
          {series.nextEpisode && (
            <span className={styles.nextWhen}>
              {formatEpisodeWhen(series.nextEpisode.startsAt, series.timezone, locale)}
            </span>
          )}
        </div>
      </div>

      <div className={styles.right}>
        <div className={styles.countdown}>
          <span
            className={clsx(styles.countdownValue, ended && styles.countdownMuted)}
            suppressHydrationWarning
          >
            {ended ? t('replayBadge') : countdown ? t('inCountdown', { value: countdown }) : '—'}
          </span>
        </div>
        <span
          className={clsx(
            styles.statusPill,
            ended ? styles.statusEnded : styles.statusActive,
          )}
        >
          {statusLabel}
        </span>
      </div>
    </Link>
  );
}
