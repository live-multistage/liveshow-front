'use client';

import { useState, type ReactNode } from 'react';
import { useStreamHealthQuery } from '@/features/platform-admin/queries/get-ops';
import type { StreamHealthJob, StreamHealthIngest } from '@/features/platform-admin/types/platform-admin.types';
import styles from './SuperAdminDashboard.module.scss';

type Panel = 'active' | 'ingest' | 'failed';

// Coarse relative time for the ops panel ("há 1h 30min").
function since(isoDate: string | null): string {
  if (!isoDate) return '—';
  const mins = Math.max(0, Math.floor((Date.now() - new Date(isoDate).getTime()) / 60_000));
  const h = Math.floor(mins / 60);
  return h > 0 ? `há ${h}h ${String(mins % 60).padStart(2, '0')}min` : `há ${mins % 60}min`;
}

function JobRows({ jobs, failed }: { jobs: StreamHealthJob[]; failed?: boolean }) {
  return (
    <>
      {jobs.map((j) => (
        <div key={j.id} className={styles.opsRow}>
          <span className={styles.opsRowEvent}>{j.eventTitle}</span>
          <span className={styles.opsRowCamera}>{j.cameraName}</span>
          {failed ? (
            <>
              <span className={j.status === 'FAILED' ? `${styles.opsBadge} ${styles.opsBadgeFailed}` : `${styles.opsBadge} ${styles.opsBadgeRetrying}`}>
                {j.status}
              </span>
              <span className={styles.opsRowMeta}>{since(j.endedAt ?? j.startedAt)}</span>
              {j.error && (
                <span className={styles.opsRowError} title={j.error}>{j.error}</span>
              )}
            </>
          ) : (
            <>
              <span className={styles.opsRowMeta}>{since(j.startedAt)}</span>
              <span className={styles.opsRowMeta}>{j.renditions} variantes</span>
            </>
          )}
        </div>
      ))}
    </>
  );
}

function IngestRows({ sessions }: { sessions: StreamHealthIngest[] }) {
  return (
    <>
      {sessions.map((s) => (
        <div key={s.id} className={styles.opsRow}>
          <span className={styles.opsRowEvent}>{s.eventTitle}</span>
          <span className={styles.opsRowCamera}>{s.cameraName}</span>
          <span className={styles.opsRowMeta}>{s.remoteAddr ?? '—'}</span>
          <span className={styles.opsRowMeta}>{since(s.startedAt)}</span>
        </div>
      ))}
    </>
  );
}

// Operational health card (design: "Saúde das transmissões"). Counters expand
// into detail lists (one panel at a time). Per-variant bitrate/health remains
// deferred — no data source yet.
export function StreamHealthCard() {
  const { data } = useStreamHealthQuery();
  const [open, setOpen] = useState<Panel | null>(null);

  const stats: { key: Panel; label: string; value: number; sub: string; danger?: boolean }[] = [
    { key: 'active', label: 'TRANSCODE JOBS', value: data?.transcodeActive ?? 0, sub: 'ativos' },
    { key: 'ingest', label: 'SESSÕES INGEST', value: data?.ingestConnected ?? 0, sub: 'conectadas' },
    { key: 'failed', label: 'JOBS COM FALHA', value: data?.transcodeFailed ?? 0, sub: 'últimas 24h', danger: true },
  ];

  const panels: Record<Panel, { rows: number; content: ReactNode }> = {
    active: { rows: data?.activeJobs?.length ?? 0, content: <JobRows jobs={data?.activeJobs ?? []} /> },
    ingest: { rows: data?.ingestSessions?.length ?? 0, content: <IngestRows sessions={data?.ingestSessions ?? []} /> },
    failed: { rows: data?.failedJobs?.length ?? 0, content: <JobRows jobs={data?.failedJobs ?? []} failed /> },
  };

  return (
    <div className={styles.finCard}>
      <div className={styles.finHeader}>
        <div>
          <div className={styles.finEyebrow}>OPERACIONAL</div>
          <div className={styles.finTitle}>Saúde das transmissões</div>
        </div>
        <span className={styles.liveBadge}>
          <span className={styles.liveDot} />
          {data?.liveEvents ?? 0} AO VIVO
        </span>
      </div>

      <div className={styles.opsGrid}>
        {stats.map((s) => {
          const classes = [
            styles.opsStat,
            s.danger ? styles.opsStatDanger : '',
            open === s.key ? styles.opsStatOpen : '',
          ].join(' ');
          const body = (
            <>
              <div className={styles.opsLabel}>{s.label}</div>
              <div className={styles.opsValueRow}>
                <span className={`${styles.opsValue} ${s.danger ? styles.opsValueDanger : ''}`}>{s.value}</span>
                <span className={styles.opsSub}>{s.sub}</span>
              </div>
            </>
          );
          if (s.value === 0) {
            return <div key={s.key} className={classes}>{body}</div>;
          }
          return (
            <button
              key={s.key}
              type="button"
              className={`${classes} ${styles.opsStatButton}`}
              aria-expanded={open === s.key}
              onClick={() => setOpen(open === s.key ? null : s.key)}
            >
              {body}
            </button>
          );
        })}
      </div>

      {open ? (
        <div className={styles.opsDetail}>
          {panels[open].rows === 0
            ? <div className={styles.opsNote}>Sem detalhes disponíveis.</div>
            : panels[open].content}
        </div>
      ) : (
        <div className={styles.opsNote}>
          Clique num contador para ver o detalhe. Bitrate por variante chega na próxima fase.
        </div>
      )}
    </div>
  );
}
