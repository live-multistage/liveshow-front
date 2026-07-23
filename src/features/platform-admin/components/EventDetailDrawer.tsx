'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { X, Accessibility, HandMetal } from 'lucide-react';
import { useGetEventQuery } from '@/features/events/queries/get-event';
import { useModerateEventMutation, useApproveAccessibilityMutation } from '../queries/get-platform-directory';
import type { PlatformEventRow } from '../types/platform-admin.types';
import styles from './EventDetailDrawer.module.scss';

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });

const STATUS_LABEL: Record<string, string> = {
  DRAFT: 'Rascunho', PUBLISHED: 'Publicado', SCHEDULED: 'Agendado',
  LIVE: 'Ao vivo', FINISHED: 'Finalizado', CANCELLED: 'Cancelado',
};

interface Props {
  event: PlatformEventRow;
  onClose: () => void;
}

// Super-admin event detail — full submission + accessibility/moderation state
// and every moderation action in one place.
export function EventDetailDrawer({ event: row, onClose }: Props) {
  const t = useTranslations('platformAdmin');
  const { data: event, isLoading } = useGetEventQuery(row.id);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');
  const moderate = useModerateEventMutation();
  const approveA11y = useApproveAccessibilityMutation();
  const busy = moderate.isPending || approveA11y.isPending;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const canPublish = row.status === 'DRAFT';
  const canUnpublish = row.status === 'SCHEDULED' || row.status === 'PUBLISHED';
  const canCancel = row.status !== 'FINISHED' && row.status !== 'CANCELLED';
  const location = event ? [event.venue, event.city, event.country].filter(Boolean).join(', ') : '';

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <aside className={styles.drawer} onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Detalhes do evento">
        <div className={styles.header}>
          <div>
            <div className={styles.eyebrow}>EVENTO</div>
            <h2 className={styles.title}>{event?.title ?? row.title}</h2>
            <div className={styles.org}>{row.orgName}</div>
          </div>
          <button className={styles.close} onClick={onClose} aria-label="Fechar"><X size={18} /></button>
        </div>

        <div className={styles.body}>
          {/* Banner */}
          {event?.bannerUrl
            ? <img src={event.bannerUrl} alt={event.title} className={styles.banner} />
            : <div className={styles.bannerPlaceholder}>Sem banner</div>}

          {/* Seals */}
          <div className={styles.badges}>
            <span className={`${styles.badge} ${styles.statusBadge}`}>{STATUS_LABEL[row.status] ?? row.status}</span>
            {row.moderationStatus === 'APPROVED' && <span className={`${styles.badge} ${styles.ok}`}>Aprovado</span>}
            {row.moderationStatus === 'REJECTED' && <span className={`${styles.badge} ${styles.danger}`}>Rejeitado</span>}
            {row.publiclyFunded && <span className={`${styles.badge} ${styles.info}`}>Financiado c/ dinheiro público</span>}
          </div>

          {row.moderationStatus === 'REJECTED' && row.moderationReason && (
            <p className={styles.reasonNote}>Motivo da rejeição: {row.moderationReason}</p>
          )}

          {/* Info */}
          <dl className={styles.info}>
            <div><dt>{t('dtCategory')}</dt><dd>{event?.category ?? row.category}</dd></div>
            <div><dt>{t('dtCameras')}</dt><dd>{event?.camerasCount ?? row.camerasCount}</dd></div>
            {event && <div><dt>{t('dtStart')}</dt><dd>{fmtDate(event.startsAt)}</dd></div>}
            {event && <div><dt>{t('dtEnd')}</dt><dd>{fmtDate(event.endsAt)}</dd></div>}
            {location && <div><dt>{t('dtLocation')}</dt><dd>{location}</dd></div>}
            <div><dt>{t('dtFormat')}</dt><dd>{event?.format ?? '—'}</dd></div>
          </dl>

          {event?.description && (
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>Descrição</h3>
              <p className={styles.desc}>{event.description}</p>
            </div>
          )}

          {isLoading && <p className={styles.loading}>Carregando detalhes…</p>}

          {/* Accessibility (NBR 15290) */}
          {row.publiclyFunded && (
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}><Accessibility size={15} /> Acessibilidade (Libras)</h3>
              <ul className={styles.checklist}>
                <li className={row.hasLibrasCamera ? styles.done : styles.pending}>
                  <HandMetal size={13} /> {row.hasLibrasCamera ? t('librasMarked') : t('librasMissing')}
                </li>
                <li className={row.accessibilityApproved ? styles.done : styles.pending}>
                  {row.accessibilityApproved ? t('accApproved') : t('accPending')}
                </li>
              </ul>
              {!row.accessibilityApproved && row.hasLibrasCamera && (
                <button className={styles.btn} disabled={busy} onClick={() => approveA11y.mutate(row.id)}>
                  {t('approveAccessibility')}
                </button>
              )}
            </div>
          )}

          {/* Moderation actions */}
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Moderação</h3>
            {rejecting ? (
              <div className={styles.rejectBox}>
                <input
                  className={styles.reasonInput}
                  placeholder={t('rejectReasonPlaceholder')}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  autoFocus
                />
                <div className={styles.actions}>
                  <button
                    className={`${styles.btn} ${styles.btnDanger}`}
                    disabled={busy || !reason.trim()}
                    onClick={() => moderate.mutate({ id: row.id, action: 'REJECT', reason: reason.trim() }, { onSuccess: () => { setRejecting(false); setReason(''); } })}
                  >
                    Confirmar rejeição
                  </button>
                  <button className={styles.btn} onClick={() => { setRejecting(false); setReason(''); }}>Cancelar</button>
                </div>
              </div>
            ) : (
              <div className={styles.actions}>
                {canPublish && <button className={styles.btn} disabled={busy} onClick={() => moderate.mutate({ id: row.id, action: 'PUBLISH' })}>{t('publish')}</button>}
                {canUnpublish && <button className={styles.btn} disabled={busy} onClick={() => moderate.mutate({ id: row.id, action: 'UNPUBLISH' })}>{t('unpublish')}</button>}
                <button className={styles.btn} disabled={busy || row.moderationStatus === 'APPROVED'} onClick={() => moderate.mutate({ id: row.id, action: 'APPROVE' })}>{t('approve')}</button>
                <button className={styles.btn} disabled={busy} onClick={() => setRejecting(true)}>{t('reject')}</button>
                <button className={`${styles.btn} ${styles.btnDanger}`} disabled={busy || !canCancel} onClick={() => moderate.mutate({ id: row.id, action: 'CANCEL' })}>Remover</button>
              </div>
            )}
          </div>
        </div>
      </aside>
    </div>
  );
}
