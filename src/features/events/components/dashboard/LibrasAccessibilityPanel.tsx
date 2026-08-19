'use client';

import { useTranslations } from 'next-intl';
import { Accessibility, Check, Clock, AlertTriangle } from 'lucide-react';
import { useAccessibilityQuery } from '../../queries/get-accessibility';
import styles from './LibrasAccessibilityPanel.module.scss';

// NBR 15290: publicly-funded events must carry a Libras (sign-language) window.
// The organizer marks which camera is the window in the Stream configuration;
// a super-admin then signs off accessibility. Until both are done the event
// can't be published/started. This panel is a read-only status summary.
export function LibrasAccessibilityPanel({ eventId }: { eventId: string }) {
  const t = useTranslations('eventDetail');
  const { data: status, isLoading } = useAccessibilityQuery(eventId);

  if (isLoading || !status) return null;

  const librasDone = status.hasLibrasCamera;
  const approvalDone = status.approved;

  return (
    <section className={`${styles.panel} ${status.publishable ? styles.ok : ''}`}>
      <header className={styles.header}>
        <Accessibility size={18} />
        <div>
          <h2 className={styles.title}>Janela de Libras (NBR 15290)</h2>
          <p className={styles.subtitle}>
            Evento financiado com recurso público — exige uma Janela de Libras e
            aprovação de acessibilidade antes de publicar ou iniciar.
          </p>
        </div>
      </header>

      {/* Step 1 — organizer marks the Libras camera (done in Stream config) */}
      <div className={styles.step}>
        <span className={`${styles.badge} ${librasDone ? styles.badgeOk : styles.badgeWarn}`}>
          {librasDone ? <Check size={14} /> : <AlertTriangle size={14} />}
        </span>
        <div className={styles.stepBody}>
          <p className={styles.stepTitle}>{t('librasCameraTitle')}</p>
          <p className={styles.hint}>
            {librasDone
              ? t('librasCameraMarked')
              : t('librasCameraUnmarked')}
          </p>
        </div>
      </div>

      {/* Step 2 — super-admin approval (read-only for the organizer) */}
      <div className={styles.step}>
        <span className={`${styles.badge} ${approvalDone ? styles.badgeOk : styles.badgeWait}`}>
          {approvalDone ? <Check size={14} /> : <Clock size={14} />}
        </span>
        <div className={styles.stepBody}>
          <p className={styles.stepTitle}>{t('librasApprovalTitle')}</p>
          <p className={styles.hint}>
            {approvalDone
              ? 'Acessibilidade aprovada pela equipe da plataforma.'
              : t('librasApprovalWaiting')}
          </p>
        </div>
      </div>

      {status.publishable && (
        <p className={styles.readyNote}>
          <Check size={14} /> Requisitos de acessibilidade atendidos — o evento pode ser publicado.
        </p>
      )}
    </section>
  );
}
