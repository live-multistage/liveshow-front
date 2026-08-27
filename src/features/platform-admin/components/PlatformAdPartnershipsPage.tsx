'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import {
  useAdPartnershipsQuery,
  useReviewPartnershipMutation,
  useSetPartnershipRateMutation,
} from '@/features/ad-partner/queries/use-ad-partnership';
import type { AdPartnershipStatus } from '@/features/ad-partner/types/ad-partner.types';
import { PlatformPageShell } from './PlatformPageShell';
import styles from './PlatformAdPartnershipsPage.module.scss';

const FILTERS: (AdPartnershipStatus | undefined)[] = [
  undefined, 'APPLIED', 'APPROVED', 'REJECTED', 'SUSPENDED',
];

export function PlatformAdPartnershipsPage() {
  const t = useTranslations('platformAdmin.adPartnerships');
  const [status, setStatus] = useState<AdPartnershipStatus | undefined>('APPLIED');
  const { data, isLoading } = useAdPartnershipsQuery(status);
  const review = useReviewPartnershipMutation();
  const setRate = useSetPartnershipRateMutation();

  const act = (id: string, action: 'approve' | 'reject' | 'suspend' | 'reinstate') => {
    // reject/suspend require a note server-side (400 otherwise).
    const note =
      action === 'reject' || action === 'suspend'
        ? window.prompt(t('notePrompt'))?.trim()
        : undefined;
    if ((action === 'reject' || action === 'suspend') && !note) return;
    review.mutate(
      { id, action, note },
      {
        onSuccess: () => toast.success(t('actionSuccess')),
        onError: () => toast.error(t('actionError')),
      },
    );
  };

  return (
    <PlatformPageShell group="CONFIG & GOVERNANÇA" title={t('title')} subtitle={t('subtitle')}>
      <div className={styles.filters}>
        {FILTERS.map((f) => (
          <button
            key={f ?? 'ALL'}
            type="button"
            className={f === status ? styles.filterActive : styles.filter}
            onClick={() => setStatus(f)}
          >
            {t(`filters.${f ?? 'ALL'}`)}
          </button>
        ))}
      </div>

      {isLoading && <p className={styles.empty}>{t('loading')}</p>}
      {data?.length === 0 && <p className={styles.empty}>{t('empty')}</p>}

      <table className={styles.table}>
        <tbody>
          {data?.map((p) => (
            <tr key={p.id}>
              <td>{p.organizationId}</td>
              <td><span className={styles.badge} data-status={p.status}>{p.status}</span></td>
              <td>
                {p.metricsSnapshot
                  ? t('snapshot', {
                      views: p.metricsSnapshot.liveViews,
                      buyers: p.metricsSnapshot.payingBuyers,
                    })
                  : '—'}
              </td>
              <td>
                <input
                  className={styles.rateInput}
                  aria-label={t('rateFor', { org: p.organizationId })}
                  defaultValue={p.revenueShareRate ?? ''}
                  placeholder={t('globalRate')}
                  onBlur={(e) => {
                    const raw = e.target.value.trim();
                    const rate = raw === '' ? null : Number(raw);
                    if (rate !== null && (!Number.isFinite(rate) || rate < 0 || rate > 1)) {
                      toast.error(t('rateInvalid'));
                      return;
                    }
                    setRate.mutate({ id: p.id, rate });
                  }}
                />
              </td>
              <td className={styles.actions}>
                {p.status === 'APPLIED' && (
                  <>
                    <button type="button" onClick={() => act(p.id, 'approve')}>{t('approve')}</button>
                    <button type="button" onClick={() => act(p.id, 'reject')}>{t('reject')}</button>
                  </>
                )}
                {p.status === 'APPROVED' && (
                  <button type="button" onClick={() => act(p.id, 'suspend')}>{t('suspend')}</button>
                )}
                {p.status === 'SUSPENDED' && (
                  <button type="button" onClick={() => act(p.id, 'reinstate')}>{t('reinstate')}</button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </PlatformPageShell>
  );
}
