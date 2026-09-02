'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Plus, Search, Tv } from 'lucide-react';
import { useTranslations } from 'next-intl';
import clsx from 'clsx';
import { useMyOrganizationsQuery } from '@/features/organizations/queries/get-my-organizations';
import type { OrgChannel, ScheduledSlot } from '../../types/channel.types';
import { useOrgChannelsQuery } from '../../queries/channel.queries';
import styles from './ChannelsPageContent.module.scss';

type FilterKey = 'all' | 'live' | 'draft' | 'offline';

// A channel is "live" only while published and actually on air; a draft is
// never on air; everything else published (or archived) reads as off air.
function statusKind(channel: OrgChannel): Exclude<FilterKey, 'all'> {
  if (channel.status === 'DRAFT') return 'draft';
  if (channel.status === 'PUBLISHED' && channel.isOnAir) return 'live';
  return 'offline';
}

function slotTime(slot: ScheduledSlot, timezone: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: timezone,
  }).format(new Date(slot.startsAt));
}

export function ChannelsPageContent() {
  const t = useTranslations('channels');
  const tDashboard = useTranslations('dashboard');
  const tCommon = useTranslations('common');
  const { data: organizations = [] } = useMyOrganizationsQuery();
  const [organizationId, setOrganizationId] = useState('');
  const [filter, setFilter] = useState<FilterKey>('all');
  const [search, setSearch] = useState('');

  const activeOrganizationId = organizationId || organizations[0]?.id || '';
  const { data: channels = [], isLoading } = useOrgChannelsQuery(activeOrganizationId, {
    enabled: Boolean(activeOrganizationId),
  });

  const counts = useMemo(() => {
    const c = { all: channels.length, live: 0, draft: 0, offline: 0 };
    for (const channel of channels) c[statusKind(channel)] += 1;
    return c;
  }, [channels]);

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    return channels.filter((channel) => {
      if (filter !== 'all' && statusKind(channel) !== filter) return false;
      if (!q) return true;
      return (
        channel.name.toLowerCase().includes(q) || channel.slug.toLowerCase().includes(q)
      );
    });
  }, [channels, filter, search]);

  const tabs: Array<{ key: FilterKey; label: string; count: number }> = [
    { key: 'all', label: t('dashboard.filters.all'), count: counts.all },
    { key: 'live', label: t('dashboard.filters.live'), count: counts.live },
    { key: 'draft', label: t('dashboard.filters.draft'), count: counts.draft },
    { key: 'offline', label: t('dashboard.filters.offline'), count: counts.offline },
  ];

  const stats: Array<{ key: string; label: string; value: number; live?: boolean }> = [
    { key: 'total', label: t('dashboard.stats.total'), value: counts.all },
    { key: 'live', label: t('dashboard.stats.live'), value: counts.live, live: true },
    { key: 'draft', label: t('dashboard.stats.draft'), value: counts.draft },
    { key: 'offline', label: t('dashboard.stats.offline'), value: counts.offline },
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
          <Link href="/dashboard/channels/new" className={styles.newLink}>
            <Plus size={16} strokeWidth={2.4} />
            {t('dashboard.new')}
          </Link>
        </div>
      </header>

      <div className={styles.stats}>
        {stats.map((stat) => (
          <div
            key={stat.key}
            className={clsx(styles.stat, stat.live && styles.statLive)}
          >
            <span className={clsx(styles.statLabel, stat.live && styles.statLabelLive)}>
              {stat.live && <span className={styles.statDot} />}
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

      {!isLoading && channels.length === 0 && (
        <div className={styles.empty}>
          <Tv size={32} className={styles.emptyIcon} />
          <p className={styles.emptyText}>{t('dashboard.emptyHint')}</p>
          <Link href="/dashboard/channels/new" className={styles.newLink}>
            <Plus size={16} strokeWidth={2.4} />
            {t('dashboard.new')}
          </Link>
        </div>
      )}

      {!isLoading && channels.length > 0 && shown.length === 0 && (
        <p className={styles.state}>{t('dashboard.noMatches')}</p>
      )}

      {shown.length > 0 && (
        <ul className={styles.list}>
          {shown.map((channel) => (
            <li key={channel.id}>
              <ChannelRow channel={channel} statusLabel={t(`dashboard.status.${channel.status}`)} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ChannelRow({ channel, statusLabel }: { channel: OrgChannel; statusLabel: string }) {
  const t = useTranslations('channels');
  const kind = statusKind(channel);
  const live = kind === 'live';
  const free = channel.accessMode === 'FREE';

  return (
    <Link href={`/dashboard/channels/${channel.slug}`} className={clsx(styles.row, live && styles.rowLive)}>
      <div className={clsx(styles.thumb, !live && styles.thumbOffline)}>
        {channel.coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={channel.coverUrl} alt="" className={styles.thumbImage} />
        ) : (
          <span className={styles.thumbFallback} aria-hidden="true" />
        )}

        {kind === 'live' && (
          <span className={styles.thumbBadgeLive}>
            <span className={styles.thumbBadgeDot} />
            {t('dashboard.filters.live')}
          </span>
        )}
        {kind === 'draft' && (
          <span className={styles.thumbBadgeDraft}>{t('dashboard.filters.draft')}</span>
        )}
        {kind === 'offline' && (
          <span className={styles.thumbBadgeOffline}>{t('dashboard.filters.offline')}</span>
        )}

        <span className={styles.bug}>
          <span className={styles.bugWave} aria-hidden="true">
            <span className={clsx(styles.bugBar, live && styles.bugBarLive)} />
            <span className={clsx(styles.bugBar, live && styles.bugBarLive)} />
            <span className={clsx(styles.bugBar, live && styles.bugBarLive)} />
          </span>
          <span className={styles.bugLabel}>{channel.name}</span>
        </span>
      </div>

      <div className={styles.info}>
        <div className={styles.nameRow}>
          <span className={styles.name}>{channel.name}</span>
          <span className={styles.slug}>@{channel.slug}</span>
          <span className={clsx(styles.accessPill, free ? styles.accessFree : styles.accessSub)}>
            {free ? t('free') : t('subscriptionBadge')}
          </span>
        </div>

        {kind === 'draft' ? (
          <p className={styles.draftNote}>{t('dashboard.draftRowNote')}</p>
        ) : (
          <div className={styles.schedule}>
            {live && channel.current && (
              <div className={styles.slot}>
                <span className={clsx(styles.slotLabel, styles.slotLabelNow)}>{t('now')}</span>
                <span className={styles.slotName}>{channel.current.name}</span>
              </div>
            )}
            {channel.next && (
              <div className={styles.slot}>
                <span className={styles.slotLabel}>
                  {t('dashboard.upNextAt', { time: slotTime(channel.next, channel.timezone) })}
                </span>
                <span className={styles.slotNameMuted}>{channel.next.name}</span>
              </div>
            )}
          </div>
        )}
      </div>

      <div className={styles.right}>
        <span
          className={clsx(
            styles.statusPill,
            kind === 'live' && styles.statusLive,
            kind === 'draft' && styles.statusDraft,
            kind === 'offline' && styles.statusOffline,
          )}
        >
          {live && <span className={styles.statusDot} />}
          {statusLabel}
        </span>
      </div>
    </Link>
  );
}
