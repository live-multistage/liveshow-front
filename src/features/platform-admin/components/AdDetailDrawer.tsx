'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { X, Check, Ban } from 'lucide-react';
import { useAdDetailQuery, useReviewAdMutation } from '../queries/get-platform-directory';
import { usePlatformSettingsQuery } from '../queries/get-settings';
import type { AdDestination, AdReviewRecord, PlatformSettingsView } from '../types/platform-admin.types';
import { brlCompact } from '../utils/format';
import { adKindFromFormat } from '../utils/ad-kind';
import styles from './AdDetailDrawer.module.scss';

const REAIS = (cents: number) => brlCompact(cents / 100);
// Lance e mínimo são centavos que importam (R$ 0,40 por clique): sem arredondar.
const REAIS_EXACT = (cents: number) => (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtDate = (iso: string) => new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
const list = (arr: string[]) => (arr.length ? arr.join(', ') : '—');
const FORMAT_LABEL: Record<string, string> = {
  HORIZONTAL_728x90: 'Horizontal · 728×90',
  VERTICAL_300x600: 'Vertical · 300×600',
  WIDE_16_9: 'Tela ampla · 16:9',
  VIDEO_16_9: 'Vídeo · 16:9',
};

const PAUSE_VARIANT_LABEL = { STANDARD: 'Padrão', FULLSCREEN: 'Tela cheia' } as const;

type PauseVariant = keyof typeof PAUSE_VARIANT_LABEL;

// Mínimo atual (centavos) da variante e do modelo de cobrança, das Configurações.
function pauseMinimumCents(
  settings: PlatformSettingsView | undefined,
  variant: PauseVariant,
  billingModel: string,
): number | null {
  if (!settings) return null;
  const perMille = billingModel === 'CPM';
  if (variant === 'FULLSCREEN') return perMille ? settings.adPauseMinCpmFullscreenCents : settings.adPauseMinCpcFullscreenCents;
  return perMille ? settings.adPauseMinCpmStandardCents : settings.adPauseMinCpcStandardCents;
}

const OUTCOME_LABEL: Record<AdReviewRecord['outcome'], string> = {
  SUBMITTED: 'adSUBMITTED', APPROVE: 'adAPPROVE', REJECT: 'adREJECT', PENDING: 'adPENDING',
};

interface Props {
  adId: string;
  orgName?: string;
  onClose: () => void;
}

// Ad detail + review history drawer — shows the full submission (creative +
// every config). When the ad is in REVIEW, a super-admin approves/rejects here.
export function AdDetailDrawer({ adId, orgName, onClose }: Props) {
  const t = useTranslations('platformAdmin');
  const { data, isLoading } = useAdDetailQuery(adId);
  const { data: platformSettings } = usePlatformSettingsQuery();
  const [reason, setReason] = useState('');
  const [watchedVideo, setWatchedVideo] = useState(false);
  const review = useReviewAdMutation(onClose);

  // Close on Escape.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const ad = data?.ad;
  const inReview = ad?.status === 'REVIEW';
  const isVideo = ad ? adKindFromFormat(ad.format) === 'preroll' : false;
  const isPause = ad ? adKindFromFormat(ad.format) === 'pause' : false;
  // Vídeo só é aprovado depois de o revisor ver e ouvir o arquivo; sem arquivo, nunca.
  const pauseVariant: PauseVariant = ad?.pauseVariant ?? 'STANDARD';
  const minCents = ad && isPause ? pauseMinimumCents(platformSettings, pauseVariant, ad.billingModel) : null;
  const bidLabel = ad
    ? minCents === null
      ? REAIS(ad.bidCents)
      : `${REAIS_EXACT(ad.bidCents)} · mínimo ${REAIS_EXACT(minCents)} (${PAUSE_VARIANT_LABEL[pauseVariant]})`
    : '';
  const bidBelowMinimum = ad !== undefined && minCents !== null && ad.bidCents < minCents;
  const approveLocked = isVideo && (!ad?.videoUrl || !watchedVideo);

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
            {isVideo ? (
              ad.videoUrl ? (
                <video className={styles.banner} src={ad.videoUrl} controls preload="metadata" aria-label={ad.title} />
              ) : (
                <div className={styles.bannerEmpty}>Vídeo não enviado — não pode ser aprovado.</div>
              )
            ) : ad.bannerUrl ? (
              <a href={ad.bannerUrl} target="_blank" rel="noopener noreferrer" className={styles.bannerLink}>
                <img src={ad.bannerUrl} alt={ad.title} className={styles.banner} />
              </a>
            ) : (
              <div className={styles.bannerEmpty}>Sem criativo enviado — anúncio apenas textual.</div>
            )}
            <dl className={styles.fields}>
              <Field label="Status" value={ad.status} />
              <Field label="Formato" value={FORMAT_LABEL[ad.format] ?? ad.format} />
              {isPause && <Field label="Variante" value={PAUSE_VARIANT_LABEL[ad.pauseVariant ?? 'STANDARD']} />}
              {isVideo && ad.videoDurationSec != null && <Field label="Duração" value={`${ad.videoDurationSec} s`} />}
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
              <Field label="Lance" value={bidLabel} wide={isPause} />
              {bidBelowMinimum && (
                <p className={styles.warn} role="alert">
                  Lance abaixo do mínimo atual da variante: o anúncio não entra no leilão da pausa.
                </p>
              )}
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
                {isVideo && (
                  <label className={styles.watchConfirm}>
                    <input type="checkbox" checked={watchedVideo} onChange={(e) => setWatchedVideo(e.target.checked)} />
                    Assisti ao vídeo inteiro com som
                  </label>
                )}
                <textarea
                  className={styles.reason}
                  placeholder={t('adReasonPlaceholder')}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  aria-label={t('adReasonLabel')}
                />
                {review.isError && <div className={styles.err}>{review.error.message}</div>}
                <div className={styles.reviewActions}>
                  <button
                    className={styles.approve}
                    onClick={() => review.mutate({ id: adId, decision: 'APPROVE', reason: reason.trim() || undefined })}
                    disabled={review.isPending || approveLocked}
                    title={approveLocked ? 'Assista ao vídeo inteiro com som para aprovar' : undefined}
                  >
                    <Check size={15} /> {t('approve')}
                  </button>
                  <button
                    className={styles.reject}
                    onClick={() => review.mutate({ id: adId, decision: 'REJECT', reason: reason.trim() })}
                    disabled={review.isPending || !reason.trim()}
                    title={!reason.trim() ? t('adReasonRequired') : undefined}
                  >
                    <Ban size={15} /> {t('reject')}
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
                  <span className={styles.histAction}>{t(OUTCOME_LABEL[r.outcome])}</span>
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
  const t = useTranslations('platformAdmin');
  return (
    <div className={styles.field}>
      <dt className={styles.fieldLabel}>Destino</dt>
      <dd className={styles.fieldValue}>
        {destination === null && <span className={styles.legacyBadge}>sem destino (legado)</span>}
        {destination?.type === 'EXTERNAL_URL' && (
          <a href={destination.url} target="_blank" rel="noopener noreferrer">{destination.url}</a>
        )}
        {destination?.type === 'EVENT' && (
          <Link href={`/events/${destination.eventId}`}>{t('viewEvent')}</Link>
        )}
      </dd>
    </div>
  );
}
