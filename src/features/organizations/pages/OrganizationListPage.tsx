'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Plus } from 'lucide-react';
import { Pagination } from '@live-show/design-system';
import { useMyOrganizationsPageQuery, useMyOrganizationsSummaryQuery } from '../hooks/use-my-organizations-page';
import { OrganizationCard } from '../components/OrganizationCard';
import { sumByCurrency } from '../utils/org-stats';
import { hrefForMyOrganizations, parseMyOrganizationsParams } from '../utils/my-organizations-params';
import type { MyOrganizationsFilter } from '../types/organization.types';
import styles from './OrganizationListPage.module.scss';

const DEFAULT_PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 300;

// ── KPI icons ─────────────────────────────────────────────────────

function KpiIcon({ kind }: { kind: 'org' | 'event' | 'team' | 'sales' }) {
  const p = { width: 13, height: 13, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2 };
  if (kind === 'org') return (
    <svg {...p}><rect x="4" y="3" width="16" height="18" rx="2" /><path d="M8 7h3M8 11h3M8 15h3M14 7h2M14 11h2M14 15h2" /></svg>
  );
  if (kind === 'event') return (
    <svg {...p}><rect x="3" y="4" width="18" height="17" rx="2" /><path d="M3 9h18M8 2v4M16 2v4" /></svg>
  );
  if (kind === 'team') return (
    <svg {...p}><circle cx="9" cy="8" r="3" /><path d="M3 21a6 6 0 0 1 12 0M16 11a3 3 0 1 0 0-6M21 21a5 5 0 0 0-4-4.9" /></svg>
  );
  return (
    <svg {...p}><path d="M3 17l5-5 4 4 8-9" /><path d="M14 7h6v6" /></svg>
  );
}

// ── Main ─────────────────────────────────────────────────────────

export function OrganizationListPage() {
  const t = useTranslations('organizations');
  const tPager = useTranslations('dashboard.pagination');
  const router = useRouter();
  const searchParams = useSearchParams();
  const { tab, q, page } = parseMyOrganizationsParams(searchParams);

  const { data: summary } = useMyOrganizationsSummaryQuery();
  const { data, isLoading, isError, isPlaceholderData } = useMyOrganizationsPageQuery({
    page,
    ...(tab && { filter: tab }),
    ...(q && { q }),
  });

  const [search, setSearch] = useState(q ?? '');

  // Back/forward can change ?q= under us; only adopt it when it really differs,
  // so a trailing space the user is still typing isn't trimmed away.
  useEffect(() => {
    if ((q ?? '') !== search.trim()) setSearch(q ?? '');
  }, [q]);

  useEffect(() => {
    const next = search.trim();
    if (next === (q ?? '')) return;
    const timer = setTimeout(() => router.replace(hrefForMyOrganizations({ tab, q: next, page: 1 })), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [search, q, tab, router]);

  const total = data?.total ?? 0;
  const pageSize = data?.pageSize ?? DEFAULT_PAGE_SIZE;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const orgs = data?.items ?? [];

  // A stale or hand-typed ?page= past the end lands on the last real page.
  // Placeholder data belongs to the previous tab/search, so it can't decide this.
  useEffect(() => {
    if (!data || isPlaceholderData || page <= pageCount) return;
    router.replace(hrefForMyOrganizations({ tab, q, page: pageCount }));
  }, [data, isPlaceholderData, page, pageCount, tab, q, router]);

  const loaded = !isLoading && !isError && !!data;
  const outOfRange = page > pageCount;
  const hrefForPage = (target: number) => hrefForMyOrganizations({ tab, q, page: target });

  const clearSearch = () => {
    setSearch('');
    router.replace(hrefForMyOrganizations({ tab, page: 1 }));
  };

  const tabs: { id?: MyOrganizationsFilter; label: string; count?: number }[] = [
    { label: t('tabAll'), count: summary?.counts.all },
    { id: 'owned', label: t('tabMine'), count: summary?.counts.owned },
    { id: 'invited', label: t('tabInvited'), count: summary?.counts.invited },
    { id: 'archived', label: t('tabArchived'), count: summary?.counts.archived },
  ];

  // No value until the summary answers: a placeholder 0 would read as fact.
  const kpi = (value?: number) => value ?? '—';
  const brlSales = summary ? sumByCurrency([summary.totals], 'BRL') : undefined;

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <div className={styles.breadcrumb}>
            <span>PAINEL</span>
            <span className={styles.breadcrumbSep}>/</span>
            <span className={styles.breadcrumbActive}>ORGANIZAÇÕES</span>
          </div>
          <h1 className={styles.heading}>{t('heading')}</h1>
          <p className={styles.subheading}>{t('subheadingFull')}</p>
        </div>
        <Link href="/dashboard/organizations/new" className={styles.btnCreate}>
          <Plus size={16} strokeWidth={2.6} />
          Nova Organização
        </Link>
      </div>

      {/* KPI strip */}
      <div className={styles.kpiStrip}>
        <div className={`${styles.kpiCard} ${styles.kpiCardAccent}`}>
          <div className={styles.kpiGlow} />
          <div className={styles.kpiLabel}><KpiIcon kind="org" /> TOTAL DE ORGS</div>
          <div className={styles.kpiValue}>
            <span className={styles.kpiNum}>{kpi(summary?.counts.all)}</span>
            <span className={styles.kpiUnit}>ativas</span>
          </div>
        </div>
        <div className={styles.kpiCard}>
          <div className={styles.kpiLabel}><KpiIcon kind="event" /> EVENTOS ATIVOS</div>
          <div className={styles.kpiValue}>
            <span className={styles.kpiNum}>{kpi(summary?.totals.activeEventsCount)}</span>
            <span className={styles.kpiUnit}>em curso</span>
          </div>
        </div>
        <div className={styles.kpiCard}>
          <div className={styles.kpiLabel}><KpiIcon kind="team" /> EQUIPE TOTAL</div>
          <div className={styles.kpiValue}>
            <span className={styles.kpiNum}>{kpi(summary?.totals.memberCount)}</span>
            <span className={styles.kpiUnit}>membros</span>
          </div>
        </div>
        <div className={styles.kpiCard}>
          <div className={styles.kpiLabel}><KpiIcon kind="sales" /> VENDAS NO MÊS</div>
          <div className={styles.kpiValue}>
            <span className={`${styles.kpiNum} ${styles.kpiNumPink}`}>
              {brlSales === undefined
                ? '—'
                : brlSales.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className={styles.kpiUnit}>BRL</span>
          </div>
        </div>
      </div>

      {/* Search row */}
      <div className={styles.searchRow}>
        <div className={styles.searchBox}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#7d7d85" strokeWidth="2" className={styles.searchIcon}>
            <circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4" />
          </svg>
          <input
            className={styles.searchInput}
            placeholder={t('searchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button className={styles.searchClear} onClick={() => setSearch('')} aria-label={t('clear')}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M5 5l14 14M19 5L5 19" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className={styles.chips} data-testid="org-tabs">
        {tabs.map((c) => {
          const active = c.id === tab;
          return (
            <Link
              key={c.id ?? 'all'}
              href={hrefForMyOrganizations({ tab: c.id, q, page: 1 })}
              aria-current={active ? 'page' : undefined}
              className={`${styles.chip} ${active ? styles.chipActive : styles.chipInactive}`}
            >
              {c.label}
              {c.count !== undefined && (
                <span className={active ? styles.chipBadgeActive : styles.chipBadgeInactive}>{c.count}</span>
              )}
            </Link>
          );
        })}
      </div>

      {/* States */}
      {isLoading && <p className={styles.state}>{t('loading')}</p>}
      {isError && <p className={`${styles.state} ${styles.stateError}`}>{t('loadErrorRetry')}</p>}

      {loaded && total === 0 && (tab || q) && (
        <div className={styles.emptyFiltered}>
          <p className={styles.state}>{t('empty')}</p>
          {q && (
            <button type="button" className={styles.clearSearchBtn} onClick={clearSearch}>
              {t('clearSearch')}
            </button>
          )}
        </div>
      )}

      {/* Grid */}
      {loaded && (
        <div className={styles.grid}>
          {orgs.map((org) => (
            <OrganizationCard key={org.id} organization={org} />
          ))}
          <Link href="/dashboard/organizations/new" className={styles.createCard}>
            <div className={styles.createCardIcon}>
              <Plus size={22} strokeWidth={2.4} />
            </div>
            <div>
              <div className={styles.createCardTitle}>{t('createCard')}</div>
              <div className={styles.createCardSub}>Convide sua equipe e comece a vender</div>
            </div>
          </Link>
        </div>
      )}

      {loaded && total > 0 && !outOfRange && (
        <div className={styles.paginationRow}>
          <span className={styles.paginationRange}>
            {t('pagination.range', {
              from: (page - 1) * pageSize + 1,
              to: Math.min(page * pageSize, total),
              total,
            })}
          </span>
          <Pagination
            page={page}
            pageCount={pageCount}
            onPageChange={(target) => router.push(hrefForPage(target))}
            hrefFor={hrefForPage}
            labels={{
              prev: tPager('prev'),
              next: tPager('next'),
              nav: tPager('nav'),
              prevAria: tPager('prevAria'),
              nextAria: tPager('nextAria'),
            }}
          />
        </div>
      )}
    </div>
  );
}
