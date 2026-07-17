'use client';

import { useEffect, useState } from 'react';
import { X, Check, Ban } from 'lucide-react';
import { useAdDetailQuery, useReviewAdMutation } from '../queries/get-platform-directory';
import type { AdReviewRecord } from '../types/platform-admin.types';
import { brlCompact } from '../utils/format';
import styles from './AdDetailDrawer.module.scss';

const REAIS = (cents: number) => brlCompact(cents / 100);
const fmtDate = (iso: string) => new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });

const OUTCOME_LABEL: Record<AdReviewRecord['outcome'], string> = {
  SUBMITTED: 'enviado p/ revisão', APPROVE: 'aprovou', REJECT: 'rejeitou', PENDING: 'escalou p/ humano',
};

// Ad detail + review history drawer. When the ad is in REVIEW, a super-admin
// approves or rejects (with reason) here.
export function AdDetailDrawer({ adId, onClose }: { adId: string; onClose: () => void }) {
  const { data, isLoading } = useAdDetailQuery(adId);
  const [reason, setReason] = useState('');
  const review = useReviewAdMutation(onClose);

  // Close on Escape.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const ad = data?.ad;
  const inReview = ad?.status === 'REVIEW';

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <aside className={styles.drawer} onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Detalhes do anúncio">
        <div className={styles.header}>
          <div>
            <div className={styles.eyebrow}>ANÚNCIO</div>
            <h2 className={styles.title}>{ad?.title ?? 'Carregando…'}</h2>
          </div>
          <button className={styles.close} onClick={onClose} aria-label="Fechar"><X size={18} /></button>
        </div>

        {isLoading && <div className={styles.empty}>Carregando…</div>}

        {ad && (
          <div className={styles.body}>
            {ad.bannerUrl && <img src={ad.bannerUrl} alt={ad.title} className={styles.banner} />}

            <dl className={styles.fields}>
              <Field label="Status" value={ad.status} />
              <Field label="Formato" value={ad.format} />
              <Field label="Placements" value={ad.placements.join(', ') || '—'} />
              <Field label="Categorias-alvo" value={ad.targetCategories.join(', ') || '—'} />
              <Field label="Modelo" value={ad.billingModel} />
              <Field label="Lance" value={REAIS(ad.bidCents)} />
              <Field label="Orçamento diário" value={REAIS(ad.dailyBudgetCents)} />
              <Field label="Limite total" value={REAIS(ad.totalLimitCents)} />
              <Field label="Gasto" value={REAIS(ad.totalSpendCents)} />
              <Field label="Período" value={`${fmtDate(ad.startsAt)} → ${fmtDate(ad.endsAt)}`} />
            </dl>

            {inReview && (
              <div className={styles.reviewBox}>
                <div className={styles.reviewTitle}>Decisão de revisão</div>
                <textarea
                  className={styles.reason}
                  placeholder="Motivo (obrigatório ao rejeitar)…"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  aria-label="Motivo da decisão"
                />
                {review.isError && <div className={styles.err}>{review.error.message}</div>}
                <div className={styles.reviewActions}>
                  <button
                    className={styles.approve}
                    onClick={() => review.mutate({ id: adId, decision: 'APPROVE', reason: reason.trim() || undefined })}
                    disabled={review.isPending}
                  >
                    <Check size={15} /> Aprovar
                  </button>
                  <button
                    className={styles.reject}
                    onClick={() => review.mutate({ id: adId, decision: 'REJECT', reason: reason.trim() })}
                    disabled={review.isPending || !reason.trim()}
                    title={!reason.trim() ? 'Informe o motivo para rejeitar' : undefined}
                  >
                    <Ban size={15} /> Rejeitar
                  </button>
                </div>
              </div>
            )}

            <div className={styles.historyTitle}>Histórico de revisão</div>
            <div className={styles.history}>
              {data.reviews.length === 0 && <div className={styles.empty}>Sem registros ainda.</div>}
              {data.reviews.map((r) => (
                <div key={r.id} className={styles.histRow}>
                  <span className={styles.histActor}>{r.reviewedBy}</span>
                  <span className={styles.histAction}>{OUTCOME_LABEL[r.outcome]}</span>
                  <span className={styles.histType}>{r.reviewerType}</span>
                  {r.reason && <span className={styles.histReason}>{r.reason}</span>}
                  <span className={styles.histTime}>{fmtDate(r.createdAt)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.field}>
      <dt className={styles.fieldLabel}>{label}</dt>
      <dd className={styles.fieldValue}>{value}</dd>
    </div>
  );
}
