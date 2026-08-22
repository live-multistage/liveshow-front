'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Plus, Repeat } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Badge } from '@live-show/design-system';
import { useMyOrganizationsQuery } from '@/features/organizations/queries/get-my-organizations';
import { useOrgSeriesQuery } from '../../queries/series.queries';
import styles from './SeriesPageContent.module.scss';

export function SeriesPageContent() {
  const t = useTranslations('series');
  const tDashboard = useTranslations('dashboard');
  const tCommon = useTranslations('common');
  const { data: organizations = [] } = useMyOrganizationsQuery();
  const [organizationId, setOrganizationId] = useState('');

  const activeOrganizationId = organizationId || organizations[0]?.id || '';
  const { data: seriesList = [], isLoading } = useOrgSeriesQuery(activeOrganizationId, {
    enabled: Boolean(activeOrganizationId),
  });

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.heading}>{t('dashboard.title')}</h1>

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
            <Plus size={14} />
            {t('dashboard.new')}
          </Link>
        </div>
      </header>

      {isLoading && <p className={styles.state}>{tCommon('loading')}</p>}

      {!isLoading && seriesList.length === 0 && (
        <div className={styles.empty}>
          <Repeat size={32} className={styles.emptyIcon} />
          <p>{t('dashboard.empty')}</p>
          <Link href="/dashboard/series/new" className={styles.newLink}>
            <Plus size={14} />
            {t('dashboard.new')}
          </Link>
        </div>
      )}

      {seriesList.length > 0 && (
        <ul className={styles.list}>
          {seriesList.map((series) => (
            <li key={series.id}>
              <Link href={`/dashboard/series/${series.slug}`} className={styles.row}>
                <span className={styles.rowName}>{series.name}</span>
                <span className={styles.rowSlug}>@{series.slug}</span>
                <Badge variant="outline">{t(`dashboard.status.${series.status}`)}</Badge>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
