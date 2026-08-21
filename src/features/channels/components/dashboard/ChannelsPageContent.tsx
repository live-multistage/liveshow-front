'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Plus, Tv } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Badge } from '@live-show/design-system';
import { useMyOrganizationsQuery } from '@/features/organizations/queries/get-my-organizations';
import { useOrgChannelsQuery } from '../../queries/channel.queries';
import styles from './ChannelsPageContent.module.scss';

export function ChannelsPageContent() {
  const t = useTranslations('channels');
  const tDashboard = useTranslations('dashboard');
  const tCommon = useTranslations('common');
  const { data: organizations = [] } = useMyOrganizationsQuery();
  const [organizationId, setOrganizationId] = useState('');

  const activeOrganizationId = organizationId || organizations[0]?.id || '';
  const { data: channels = [], isLoading } = useOrgChannelsQuery(activeOrganizationId, {
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
          <Link href="/dashboard/channels/new" className={styles.newLink}>
            <Plus size={14} />
            {t('dashboard.new')}
          </Link>
        </div>
      </header>

      {isLoading && <p className={styles.state}>{tCommon('loading')}</p>}

      {!isLoading && channels.length === 0 && (
        <div className={styles.empty}>
          <Tv size={32} className={styles.emptyIcon} />
          <Link href="/dashboard/channels/new" className={styles.newLink}>
            <Plus size={14} />
            {t('dashboard.new')}
          </Link>
        </div>
      )}

      {channels.length > 0 && (
        <ul className={styles.list}>
          {channels.map((channel) => (
            <li key={channel.id}>
              <Link href={`/dashboard/channels/${channel.slug}`} className={styles.row}>
                <span className={styles.rowName}>{channel.name}</span>
                <span className={styles.rowSlug}>@{channel.slug}</span>
                <Badge variant="outline">{t(`dashboard.status.${channel.status}`)}</Badge>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
