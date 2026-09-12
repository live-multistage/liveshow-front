'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useMailingCampaignsQuery } from '../queries/mailing.queries';
import tableStyles from '../../components/PlatformTable.module.scss';
import styles from './MailingTable.module.scss';

const dateFormatter = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Sao_Paulo' });

export function CampaignsTab() {
  const t = useTranslations('platformAdmin.mailing');
  const { data, isLoading, isError } = useMailingCampaignsQuery();

  if (isLoading) return <p className={tableStyles.empty}>{t('common.loading')}</p>;
  if (isError) return <p className={tableStyles.empty}>{t('common.loadError')}</p>;
  if (!data || data.length === 0) return <p className={tableStyles.empty}>{t('campaigns.empty')}</p>;

  return (
    <div className={tableStyles.card}>
      <div className={tableStyles.scroll}>
        <table className={styles.table}>
          <thead>
            <tr className={styles.headRow}>
              <th>{t('campaigns.colName')}</th>
              <th>{t('campaigns.colTemplate')}</th>
              <th>{t('campaigns.colAudience')}</th>
              <th>{t('campaigns.colStatus')}</th>
              <th>{t('campaigns.colProgress')}</th>
              <th>{t('campaigns.colDate')}</th>
            </tr>
          </thead>
          <tbody>
            {data.map((campaign) => {
              const total = campaign.totalRecipients ?? 0;
              return (
                <tr key={campaign.id} className={styles.bodyRow}>
                  <td>
                    <Link className={tableStyles.primary} href={`/dashboard/platform/mailing/campaigns/${campaign.id}`}>
                      {campaign.name}
                    </Link>
                  </td>
                  <td className={tableStyles.mono}>{campaign.templateName}</td>
                  <td className={tableStyles.mono}>
                    {t(`audience.type.${campaign.audience.type}`)}
                    {'country' in campaign.audience && campaign.audience.country ? ` · ${campaign.audience.country}` : ''}
                  </td>
                  <td>
                    <span className={`${tableStyles.badge} ${styles[`status${campaign.status}`]}`}>
                      {t(`campaigns.status.${campaign.status}`)}
                    </span>
                  </td>
                  <td>
                    {/* null until materialized: no bar, never 0/0. Counters can overshoot on retries, so clamp. */}
                    {campaign.totalRecipients === null ? (
                      <span className={tableStyles.mono}>{campaign.status === 'SENDING' ? t('detail.materializing') : '—'}</span>
                    ) : (
                      <div className={styles.progress}>
                        <progress value={Math.min(campaign.sentCount, total)} max={total || 1} />
                        <span className={tableStyles.mono}>
                          {t('campaigns.progress', { sent: Math.min(campaign.sentCount, total), total })}
                        </span>
                      </div>
                    )}
                  </td>
                  <td className={tableStyles.mono}>
                    {dateFormatter.format(new Date(campaign.scheduledAt ?? campaign.createdAt))}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
