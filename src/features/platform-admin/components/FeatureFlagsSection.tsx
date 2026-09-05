'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Search } from 'lucide-react';
import { useGlobalFlagsQuery, useFlagAuditQuery, lastFlagChange } from '../queries/get-settings';
import { FLAG_GROUP_ORDER, flagMeta, type FlagGroup } from '../data/flag-catalog';
import { FlagRow } from './FlagRow';
import styles from './PlatformSettingsPage.module.scss';

type FilterValue = 'all' | 'on' | 'off' | 'beta';
const FILTERS: FilterValue[] = ['all', 'on', 'off', 'beta'];

// Feature flags card (design: "Feature flags"). Counters run over every
// flag; search + segmented filter narrow what's rendered, grouped by
// FLAG_GROUP_ORDER. id="feature-flags" is the redirect target from the old
// /dashboard/platform/feature-flags route.
export function FeatureFlagsSection() {
  const t = useTranslations('platformAdmin.featureFlags');
  const tSettings = useTranslations('platformAdmin.settings.flags');
  const { data: flags, isLoading, isError } = useGlobalFlagsQuery();
  const { data: auditEntries } = useFlagAuditQuery();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterValue>('all');

  const entries = useMemo(() => Object.entries(flags ?? {}), [flags]);

  const onCount = entries.filter(([, enabled]) => enabled).length;
  const offCount = entries.length - onCount;
  const betaCount = entries.filter(([key]) => flagMeta(key).beta).length;

  const query = search.trim().toLowerCase();
  const filtered = entries.filter(([key, enabled]) => {
    const meta = flagMeta(key);
    if (filter === 'on' && !enabled) return false;
    if (filter === 'off' && enabled) return false;
    if (filter === 'beta' && !meta.beta) return false;
    if (!query) return true;
    const name = t.has(`${key}.name`) ? t(`${key}.name`) : key;
    return name.toLowerCase().includes(query) || key.toLowerCase().includes(query);
  });

  const grouped: Record<FlagGroup, [string, boolean][]> = { player: [], account: [], payments: [], other: [] };
  for (const [key, enabled] of filtered) grouped[flagMeta(key).group].push([key, enabled]);

  return (
    <section className={styles.card} id="feature-flags">
      <header className={styles.sectionHeader}>
        <div className={styles.flagsHeaderTop}>
          <div>
            <div className={styles.mono10}>{tSettings('eyebrow')}</div>
            <div className={styles.sectionTitle}>{tSettings('title')}</div>
          </div>
          {flags && (
            <div className={styles.counters} aria-label={tSettings('countersLabel')} role="group">
              <strong className={styles.counterOn}>{onCount}</strong> {t('counters.on')} ·{' '}
              <strong>{offCount}</strong> {t('counters.off')} ·{' '}
              <strong className={styles.counterBeta}>{betaCount}</strong> {t('counters.beta')}
            </div>
          )}
        </div>
        <div className={styles.flagsToolbar}>
          <div className={styles.search}>
            <Search size={14} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('searchPlaceholder')}
              aria-label={t('searchPlaceholder')}
            />
          </div>
          <div className={styles.segmented}>
            {FILTERS.map((f) => (
              <button
                key={f}
                type="button"
                className={`${styles.segmentBtn} ${filter === f ? styles.segmentActive : ''}`}
                onClick={() => setFilter(f)}
              >
                {t(`filters.${f}`)}
              </button>
            ))}
          </div>
        </div>
      </header>

      {isLoading && <div className={styles.empty}>{t('loading')}</div>}
      {isError && <div className={styles.empty}>{t('error')}</div>}

      {flags && (
        <>
          {filtered.length === 0 && <div className={styles.empty}>{t('empty', { query: search })}</div>}

          {FLAG_GROUP_ORDER.map((group) =>
            grouped[group].length > 0 ? (
              <div key={group}>
                <div className={styles.groupLabel}>{t(`group.${group}`)}</div>
                {grouped[group].map(([key, enabled]) => (
                  <FlagRow
                    key={key}
                    flagKey={key}
                    enabled={enabled}
                    meta={flagMeta(key)}
                    lastChange={lastFlagChange(auditEntries ?? [], key)}
                  />
                ))}
              </div>
            ) : null,
          )}
        </>
      )}
    </section>
  );
}
