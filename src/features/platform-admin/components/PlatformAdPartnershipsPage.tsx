'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@live-show/design-system';
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

// Reject/suspend need a note (backend 400s without one) — approve/reinstate don't.
type NoteAction = 'reject' | 'suspend';
type NotePendingReview = { id: string; action: NoteAction };

export function PlatformAdPartnershipsPage() {
  const t = useTranslations('platformAdmin.adPartnerships');
  const tCommon = useTranslations('common');
  const [status, setStatus] = useState<AdPartnershipStatus | undefined>('APPLIED');
  const [notePending, setNotePending] = useState<NotePendingReview | null>(null);
  const [noteText, setNoteText] = useState('');
  const { data, isLoading } = useAdPartnershipsQuery(status);
  const review = useReviewPartnershipMutation();
  const setRate = useSetPartnershipRateMutation();

  const act = (id: string, action: 'approve' | 'reject' | 'suspend' | 'reinstate') => {
    if (action === 'reject' || action === 'suspend') {
      setNotePending({ id, action });
      setNoteText('');
      return;
    }
    review.mutate(
      { id, action },
      {
        onSuccess: () => toast.success(t('actionSuccess')),
        onError: () => toast.error(t('actionError')),
      },
    );
  };

  const confirmNote = () => {
    if (!notePending || noteText.trim().length === 0) return;
    review.mutate(
      { id: notePending.id, action: notePending.action, note: noteText.trim() },
      {
        onSuccess: () => toast.success(t('actionSuccess')),
        onError: () => toast.error(t('actionError')),
      },
    );
    setNotePending(null);
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
              <td><span className={styles.badge} data-status={p.status}>{t(`status.${p.status}`)}</span></td>
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
                  type="number"
                  min="0"
                  max="1"
                  step="0.01"
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

      <Dialog open={notePending !== null} onOpenChange={(open) => !open && setNotePending(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('noteDialogTitle')}</DialogTitle>
            <DialogDescription>{t('noteDialogDescription')}</DialogDescription>
          </DialogHeader>
          <textarea
            className={styles.noteTextarea}
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder={t('notePlaceholder')}
            rows={4}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setNotePending(null)}>
              {tCommon('cancel')}
            </Button>
            <Button disabled={noteText.trim().length === 0} onClick={confirmNote}>
              {tCommon('confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PlatformPageShell>
  );
}
