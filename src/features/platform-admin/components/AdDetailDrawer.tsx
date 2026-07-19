'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { X, Check, Ban } from 'lucide-react';
import { useAdDetailQuery, useReviewAdMutation } from '../queries/get-platform-directory';
import type { AdDestination, AdReviewRecord } from '../types/platform-admin.types';
import { brlCompact } from '../utils/format';
import styles from './AdDetailDrawer.module.scss';

const REAIS = (cents: number) => brlCompact(cents / 100);
const fmtDate = (iso: string) => new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
const list = (arr: string[]) => (arr.length ? arr.join(', ') : '—');
const FORMAT_LABEL: Record<string, string> = {
  HORIZONTAL_728x90: 'Horizontal · 728×90',
  VERTICAL_300x600: 'Vertical · 300×600',
};

const OUTCOME_LABEL: Record<AdReviewRecord['outcome'], string> = {
  SUBMITTED: 'enviado p/ revisão', APPROVE: 'aprovou', REJECT: 'rejeitou', PENDING: 'escalou p/ humano',
};

interface Props {
  adId: string;
  orgName?: string;
  onClose: () => void;
}

// Ad detail + review history drawer — shows the full submission (creative +
// every config). When the ad is in REVIEW, a super-admin approves/rejects here.
export function AdDetailDrawer({ adId, orgName, onClose }: Props) {
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
            {/* Creative — the actual banner submitted, or a clear "no creative". */}
            <div className={styles.sectionLabel}>Criativo</div>
            {ad.bannerUrl ? (
              <a href={ad.bannerUrl} target="_blank" rel="noopener noreferrer" className={styles.bannerLink}>
                <img src={ad.bannerUrl} alt={ad.title} className={styles.banner} />
              </a>
            ) : (
              <div className={styles.bannerEmpty}>Sem criativo enviado — anúncio apenas textual.</div>
            )}
            <dl className={styles.fields}>
              <Field label="Status" value={ad.status} />
              <Field label="Formato" value={FORMAT_LABEL[ad.format] ?? ad.format} />
              <Field label="Organização" value={orgName ?? ad.advertiserAccountId} />
              <DestinationField destination={ad.destination} />
            </dl>

            <div className={styles.sectionLabel}>Segmentação</div>
            <dl className={styles.fields}>
              <Field label="Placements" value={list(ad.placements)} wide />
              <Field label="Categorias-alvo" value={list(ad.targetCategories)} />
              <Field label="Domínios-alvo" value={list(ad.targetDomains)} />
              <Field
                label="Frequency cap"
                value={ad.frequencyCapMax != null ? `${ad.frequencyCapMax} / ${ad.frequencyCapWindow ?? '—'}` : 'sem limite'}
              />
            </dl>

            <div className={styles.sectionLabel}>Orçamento & entrega</div>
            <dl className={styles.fields}>
              <Field label="Modelo" value={ad.billingModel} />
              <Field label="Lance" value={REAIS(ad.bidCents)} />
              <Field label="Orçamento diário" value={REAIS(ad.dailyBudgetCents)} />
              <Field label="Limite total" value={REAIS(ad.totalLimitCents)} />
              <Field label="Gasto até agora" value={REAIS(ad.totalSpendCents)} />
              <Field label="Período" value={`${fmtDate(ad.startsAt)} → ${fmtDate(ad.endsAt)}`} wide />
              <Field label="Criado em" value={fmtDate(ad.createdAt)} />
              <Field label="Atualizado em" value={fmtDate(ad.updatedAt)} />
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

function Field({ label, value, wide }: { label: string; value: string; wide?: boolean }) {
  return (
    <div className={`${styles.field} ${wide ? styles.fieldWide : ''}`}>
      <dt className={styles.fieldLabel}>{label}</dt>
      <dd className={styles.fieldValue}>{value}</dd>
    </div>
  );
}

// Lets the reviewer inspect the landing page before approving: EVENT opens the
// internal event page, EXTERNAL_URL opens the (untrusted) sponsor URL in a new
// tab, and a legacy ad (destination === null) is flagged instead of dead-ending.
function DestinationField({ destination }: { destination: AdDestination | null }) {
  return (
    <div className={styles.field}>
      <dt className={styles.fieldLabel}>Destino</dt>
      <dd className={styles.fieldValue}>
        {destination === null && <span className={styles.legacyBadge}>sem destino (legado)</span>}
        {destination?.type === 'EXTERNAL_URL' && (
          <a href={destination.url} target="_blank" rel="noopener noreferrer">{destination.url}</a>
        )}
        {destination?.type === 'EVENT' && (
          <Link href={`/events/${destination.eventId}`}>Ver evento →</Link>
        )}
      </dd>
    </div>
  );
}
