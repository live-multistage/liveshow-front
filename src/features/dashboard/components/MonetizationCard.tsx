'use client';

import { isAxiosError } from 'axios';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import {
  useAdPartnershipQuery,
  useApplyForPartnershipMutation,
} from '@/features/ad-partner/queries/use-ad-partnership';
import styles from './MonetizationCard.module.scss';

// Maps the apply endpoint's known failure shapes to an i18n key. 409 means the
// org already has a partnership in flight; the 400 codes come from the
// eligibility/Connect checks re-run server-side at apply time.
function applyErrorKey(error: unknown): string {
  if (!isAxiosError(error)) return 'applyError';
  if (error.response?.status === 409) return 'applyErrorAlreadyApplied';
  const code = (error.response?.data as { code?: string } | undefined)?.code;
  if (code === 'connect_not_ready') return 'applyErrorConnectNotReady';
  if (code === 'not_eligible') return 'applyErrorNotEligible';
  return 'applyError';
}

const brl = (amount: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(amount);

function Progress({ label, value, target }: { label: string; value: number; target: number }) {
  const pct = target > 0 ? Math.min(100, (value / target) * 100) : 100;
  return (
    <div className={styles.metric}>
      <span className={styles.metricLabel}>{label}</span>
      <span className={styles.track}>
        <span className={styles.bar} style={{ width: `${pct}%` }} />
      </span>
      <span className={styles.metricValue}>{`${value} / ${target}`}</span>
    </div>
  );
}

export function MonetizationCard({ organizationId }: { organizationId: string }) {
  const t = useTranslations('dashboard.monetization');
  const { data, isLoading } = useAdPartnershipQuery(organizationId);
  const apply = useApplyForPartnershipMutation(organizationId);

  if (isLoading || !data) return <section className={styles.card}>{t('loading')}</section>;

  const canApply =
    data.eligible && data.connectReady && (data.status === 'ELIGIBLE' || data.status === 'REJECTED');

  return (
    <section className={styles.card} aria-label={t('title')}>
      <header className={styles.header}>
        <h2 className={styles.title}>{t('title')}</h2>
        <span className={styles.badge} data-status={data.status}>{t(`status.${data.status}`)}</span>
      </header>

      <p className={styles.subtitle}>{t('window', { days: data.windowDays })}</p>

      <Progress label={t('liveViews')} value={data.liveViews} target={data.thresholds.minLiveViews} />
      <Progress label={t('payingBuyers')} value={data.payingBuyers} target={data.thresholds.minPayingBuyers} />

      {!data.connectReady && <p className={styles.warning}>{t('connectNotReady')}</p>}
      {data.reviewNote && <p className={styles.warning}>{data.reviewNote}</p>}

      {data.status === 'APPROVED' && (
        <p className={styles.rate}>{t('rate')} {Math.round(data.revenueShareRate * 100)}%</p>
      )}

      {/* Money already earned stays visible after a suspension — it is still owed. */}
      {data.earnings.length > 0 && (
        <ul className={styles.earnings}>
          {data.earnings.map((e) => (
            <li key={e.day} className={styles.earningRow}>
              <time dateTime={e.day}>{new Date(`${e.day}T00:00:00Z`).toLocaleDateString('pt-BR')}</time>
              <span>{brl(e.amount)}</span>
            </li>
          ))}
        </ul>
      )}
      {data.status === 'APPROVED' && data.earnings.length === 0 && (
        <p className={styles.subtitle}>{t('noEarningsYet')}</p>
      )}

      {/* SUSPENDED has no route back through Apply — only the review note explains
          what happened, so a permanently disabled button would just be noise. */}
      {data.status !== 'APPROVED' && data.status !== 'APPLIED' && data.status !== 'SUSPENDED' && (
        <>
          <button
            type="button"
            className={styles.apply}
            disabled={!canApply || apply.isPending}
            onClick={() =>
              apply.mutate(undefined, { onError: (error) => toast.error(t(applyErrorKey(error))) })
            }
          >
            {t('apply')}
          </button>
          {!data.eligible && data.connectReady && <p className={styles.warning}>{t('applyHint')}</p>}
        </>
      )}
    </section>
  );
}
