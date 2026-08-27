'use client';

import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { useTranslations } from 'next-intl';
import clsx from 'clsx';
import type { ChannelListItem } from '../types/channel.types';
import { ChannelCard } from './ChannelCard';
import styles from './ChannelsBrowser.module.scss';

type FilterKey = 'all' | 'live' | 'free' | 'sub';

function matchesFilter(channel: ChannelListItem, filter: FilterKey): boolean {
  if (filter === 'all') return true;
  if (filter === 'live') return channel.isOnAir;
  if (filter === 'free') return channel.accessMode === 'FREE';
  return channel.accessMode === 'SUBSCRIPTION';
}

interface Props {
  channels: ChannelListItem[];
}

export function ChannelsBrowser({ channels }: Props) {
  const t = useTranslations('channels');
  const [filter, setFilter] = useState<FilterKey>('all');
  const [search, setSearch] = useState('');

  const counts = useMemo(() => {
    const c = { all: channels.length, live: 0, free: 0, sub: 0 };
    for (const channel of channels) {
      if (channel.isOnAir) c.live += 1;
      if (channel.accessMode === 'FREE') c.free += 1;
      else c.sub += 1;
    }
    return c;
  }, [channels]);

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    return channels.filter((channel) => {
      if (!matchesFilter(channel, filter)) return false;
      if (!q) return true;
      return (
        channel.name.toLowerCase().includes(q) || channel.slug.toLowerCase().includes(q)
      );
    });
  }, [channels, filter, search]);

  const filters: Array<{ key: FilterKey; label: string; count: number; dot?: boolean }> = [
    { key: 'all', label: t('browse.filterAll'), count: counts.all },
    { key: 'live', label: t('browse.filterLive'), count: counts.live, dot: true },
    { key: 'free', label: t('browse.filterFree'), count: counts.free },
    { key: 'sub', label: t('browse.filterSub'), count: counts.sub },
  ];

  return (
    <>
      <div className={styles.head}>
        <div className={styles.headText}>
          <span className={styles.eyebrow}>{t('browse.eyebrow')}</span>
          <h1 className={styles.title}>{t('title')}</h1>
          <p className={styles.subtitle}>{t('browse.subtitle')}</p>
        </div>
        <div className={styles.searchBox}>
          <Search size={16} className={styles.searchIcon} />
          <input
            type="search"
            className={styles.searchInput}
            placeholder={t('browse.searchPlaceholder')}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
      </div>

      <div className={styles.filterRow}>
        <div className={styles.filters} role="tablist">
          {filters.map((f) => (
            <button
              key={f.key}
              type="button"
              role="tab"
              aria-selected={filter === f.key}
              className={clsx(styles.filter, filter === f.key && styles.filterActive)}
              onClick={() => setFilter(f.key)}
            >
              {f.dot && <span className={styles.filterDot} />}
              {f.label}
              <span className={styles.filterCount}>{f.count}</span>
            </button>
          ))}
        </div>
        <span className={styles.total}>{t('browse.countLabel', { count: shown.length })}</span>
      </div>

      {shown.length === 0 ? (
        <p className={styles.empty}>{t('browse.noMatches')}</p>
      ) : (
        <div className={styles.grid}>
          {shown.map((channel) => (
            <ChannelCard key={channel.id} channel={channel} />
          ))}
        </div>
      )}
    </>
  );
}
