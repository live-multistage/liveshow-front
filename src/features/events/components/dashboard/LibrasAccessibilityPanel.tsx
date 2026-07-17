'use client';

import { Accessibility, Check, Clock, AlertTriangle } from 'lucide-react';
import { useEventCamerasQuery } from '@/features/streams/queries/streams.queries';
import {
  useAccessibilityQuery,
  useSetLibrasCameraMutation,
} from '../../queries/get-accessibility';
import styles from './LibrasAccessibilityPanel.module.scss';

// NBR 15290: publicly-funded live events must carry a Libras (sign-language)
// window. Organizer picks which camera is the window; a super-admin then signs
// off accessibility. Until both are done the event can't be published/started.
export function LibrasAccessibilityPanel({ eventId }: { eventId: string }) {
  const { data: status, isLoading } = useAccessibilityQuery(eventId);
  const { cameras } = useEventCamerasQuery(eventId);
  const setLibras = useSetLibrasCameraMutation(eventId);

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

      {/* Step 1 — organizer marks the Libras camera */}
      <div className={styles.step}>
        <span className={`${styles.badge} ${librasDone ? styles.badgeOk : styles.badgeWarn}`}>
          {librasDone ? <Check size={14} /> : <AlertTriangle size={14} />}
        </span>
        <div className={styles.stepBody}>
          <p className={styles.stepTitle}>Câmera da Janela de Libras</p>
          {cameras.length === 0 ? (
            <p className={styles.hint}>
              Nenhuma câmera cadastrada. Configure a transmissão para escolher a
              Janela de Libras.
            </p>
          ) : (
            <select
              className={styles.select}
              value={status.librasCameraId ?? ''}
              disabled={setLibras.isPending}
              onChange={(e) => e.target.value && setLibras.mutate(e.target.value)}
            >
              <option value="" disabled>
                Selecione a câmera…
              </option>
              {cameras.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.stageName} · {c.name}
                </option>
              ))}
            </select>
          )}
          {setLibras.isError && (
            <p className={styles.error}>Não foi possível marcar a câmera. Tente novamente.</p>
          )}
        </div>
      </div>

      {/* Step 2 — super-admin approval (read-only for the organizer) */}
      <div className={styles.step}>
        <span className={`${styles.badge} ${approvalDone ? styles.badgeOk : styles.badgeWait}`}>
          {approvalDone ? <Check size={14} /> : <Clock size={14} />}
        </span>
        <div className={styles.stepBody}>
          <p className={styles.stepTitle}>Aprovação de acessibilidade</p>
          <p className={styles.hint}>
            {approvalDone
              ? 'Acessibilidade aprovada pela equipe da plataforma.'
              : 'Aguardando análise da equipe da plataforma.'}
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
