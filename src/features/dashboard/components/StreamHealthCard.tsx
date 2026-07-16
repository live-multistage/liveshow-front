'use client';

import { useStreamHealthQuery } from '@/features/platform-admin/queries/get-ops';
import styles from './SuperAdminDashboard.module.scss';

// Operational health card (design: "Saúde das transmissões"). F1 = the
// counters; the per-stream table (event/health/bitrate) is deferred (no
// event_id/bitrate on transcode_jobs).
export function StreamHealthCard() {
  const { data } = useStreamHealthQuery();

  const stats = [
    { label: 'TRANSCODE JOBS', value: data?.transcodeActive ?? 0, sub: 'ativos', tone: 'ok' as const },
    { label: 'SESSÕES INGEST', value: data?.ingestConnected ?? 0, sub: 'conectadas', tone: 'muted' as const },
    { label: 'JOBS COM FALHA', value: data?.transcodeFailed ?? 0, sub: 'retry', tone: 'danger' as const },
  ];

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
        {stats.map((s) => (
          <div key={s.label} className={`${styles.opsStat} ${s.tone === 'danger' ? styles.opsStatDanger : ''}`}>
            <div className={styles.opsLabel}>{s.label}</div>
            <div className={styles.opsValueRow}>
              <span className={`${styles.opsValue} ${s.tone === 'danger' ? styles.opsValueDanger : ''}`}>{s.value}</span>
              <span className={styles.opsSub}>{s.sub}</span>
            </div>
          </div>
        ))}
      </div>

      <div className={styles.opsNote}>
        Lista por transmissão (health · bitrate) chega na próxima fase.
      </div>
    </div>
  );
}
