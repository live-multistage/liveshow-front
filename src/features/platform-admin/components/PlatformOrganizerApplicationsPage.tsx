'use client';

import { useState } from 'react';
import { useOrganizerApplicationsQuery } from '../queries/get-organizer-applications';
import { useApproveOrganizerApplicationMutation } from '../mutations/approve-organizer-application.mutation';
import { useRejectOrganizerApplicationMutation } from '../mutations/reject-organizer-application.mutation';
import type {
  OrganizerApplicationAdmin,
  OrganizerApplicationExperience,
  OrganizerApplicationStatus,
} from '../types/platform-admin.types';
import { PlatformPageShell } from './PlatformPageShell';
import styles from './PlatformOrganizerApplicationsPage.module.scss';

const STATUS_FILTERS: { value: string; label: string }[] = [
  { value: 'PENDING', label: 'Pendentes' },
  { value: 'APPROVED', label: 'Aprovadas' },
  { value: 'REJECTED', label: 'Recusadas' },
  { value: '', label: 'Todas' },
];

const FLAG_LABELS: Record<string, string> = {
  PLACEHOLDER_ECHO: 'Copiou o exemplo',
  SPAM_KEYWORDS: 'Palavras de spam',
  GIBBERISH_LOW_STOPWORDS: 'Texto sem sentido',
  MANY_LINKS: 'Excesso de links',
  REPEATED_CHARS: 'Caracteres repetidos',
  LOW_LEXICAL_DIVERSITY: 'Pouca variedade',
  EXCESSIVE_CAPS: 'Tudo maiúsculo',
  NO_CONCRETE_DETAIL: 'Sem detalhes concretos',
  SEGMENT_MISMATCH: 'Fora do segmento',
};

const SEGMENT_LABELS: Record<string, string> = {
  SHOWS_FESTIVALS: 'Shows e festivais',
  SPORTS: 'Esportes',
  CONFERENCES: 'Conferências',
  WORSHIP: 'Cultos',
  THEATER_DANCE: 'Teatro e dança',
  CLASSES: 'Aulas',
  OTHER: 'Outro',
};

const EXPERIENCE_LABELS: Record<OrganizerApplicationExperience, string> = {
  NEVER: 'Nunca',
  SOME: 'Algumas vezes',
  REGULAR: 'Regularmente',
};

const STATUS_LABELS: Record<OrganizerApplicationStatus, string> = {
  PENDING: 'Pendente',
  APPROVED: 'Aprovada',
  REJECTED: 'Recusada',
};

function scoreTier(score: number): string {
  if (score >= 40) return styles.scoreDanger;
  if (score >= 20) return styles.scoreWarn;
  return styles.scoreOk;
}

function statusTier(status: OrganizerApplicationStatus): string {
  if (status === 'APPROVED') return styles.statusApproved;
  if (status === 'REJECTED') return styles.statusRejected;
  return styles.statusPending;
}

// Moderação — candidaturas de usuários que pedem para virar organizadores.
// A API já ordena da mais suspeita para a menos suspeita.
export function PlatformOrganizerApplicationsPage() {
  const [status, setStatus] = useState('PENDING');
  const { data, isLoading } = useOrganizerApplicationsQuery(status || undefined);
  const items = data ?? [];

  return (
    <PlatformPageShell
      group="MODERAÇÃO"
      title="Candidaturas a organizador"
      subtitle="Pessoas que se candidataram para se tornar organizadoras. Aprovar concede o papel de organizador."
      actions={
        <div className={styles.chips}>
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value || 'all'}
              type="button"
              className={`${styles.chip} ${status === f.value ? styles.chipActive : ''}`}
              onClick={() => setStatus(f.value)}
            >
              {f.label}
            </button>
          ))}
        </div>
      }
    >
      {isLoading && <div className={styles.empty}>Carregando…</div>}
      {!isLoading && items.length === 0 && (
        <div className={styles.empty}>Nenhuma candidatura para este filtro.</div>
      )}
      <div className={styles.list}>
        {items.map((app) => (
          <ApplicationCard key={app.id} app={app} />
        ))}
      </div>
    </PlatformPageShell>
  );
}

function ApplicationCard({ app }: { app: OrganizerApplicationAdmin }) {
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');
  const approve = useApproveOrganizerApplicationMutation();
  const reject = useRejectOrganizerApplicationMutation(() => {
    setRejecting(false);
    setReason('');
  });
  const busy = approve.isPending || reject.isPending;
  const error = approve.error ?? reject.error;

  return (
    <div className={styles.card}>
      <div className={styles.cardHead}>
        <div className={styles.titleBlock}>
          <span className={styles.orgName}>{app.organizationName}</span>
          <span className={styles.userId}>{app.userId}</span>
        </div>
        <div className={styles.badges}>
          <span className={`${styles.score} ${scoreTier(app.spamScore)}`} title="Score de spam">
            {app.spamScore}
          </span>
          <span className={`${styles.status} ${statusTier(app.status)}`}>
            {STATUS_LABELS[app.status]}
          </span>
        </div>
      </div>

      {app.reviewFlags.length > 0 && (
        <div className={styles.chipRow}>
          {app.reviewFlags.map((flag) => (
            <span key={flag} className={`${styles.tag} ${styles.tagFlag}`}>
              {FLAG_LABELS[flag] ?? flag}
            </span>
          ))}
        </div>
      )}

      <div className={styles.meta}>
        <div className={styles.chipRow}>
          {app.segments.map((seg) => (
            <span key={seg} className={styles.tag}>
              {SEGMENT_LABELS[seg] ?? seg}
            </span>
          ))}
        </div>
        <span className={styles.metaItem}>
          Experiência: <strong>{EXPERIENCE_LABELS[app.experience]}</strong>
        </span>
        {app.socialLink && (
          <a className={styles.social} href={app.socialLink} target="_blank" rel="noopener noreferrer">
            {app.socialLink}
          </a>
        )}
      </div>

      <p className={styles.about}>{app.about}</p>

      {app.status === 'REJECTED' && app.rejectionReason && (
        <p className={styles.outcome}>Motivo da recusa: {app.rejectionReason}</p>
      )}

      {app.status === 'PENDING' && (
        <div className={styles.actions}>
          {rejecting ? (
            <>
              <textarea
                className={styles.reason}
                placeholder="Motivo da recusa…"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                aria-label="Motivo da recusa"
              />
              <button
                type="button"
                className={`${styles.btn} ${styles.btnDanger}`}
                disabled={busy || reason.trim().length === 0}
                onClick={() => reject.mutate({ id: app.id, reason: reason.trim() })}
              >
                {reject.isPending ? '…' : 'Confirmar recusa'}
              </button>
              <button type="button" className={styles.btn} disabled={busy} onClick={() => setRejecting(false)}>
                Cancelar
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className={`${styles.btn} ${styles.btnApprove}`}
                disabled={busy}
                onClick={() => approve.mutate(app.id)}
              >
                {approve.isPending ? '…' : 'Aprovar'}
              </button>
              <button type="button" className={`${styles.btn} ${styles.btnDanger}`} disabled={busy} onClick={() => setRejecting(true)}>
                Recusar
              </button>
            </>
          )}
        </div>
      )}

      {error && <p className={styles.error}>{error.message}</p>}
    </div>
  );
}
