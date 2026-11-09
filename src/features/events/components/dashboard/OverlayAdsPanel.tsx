'use client';

import { Megaphone } from 'lucide-react';
import { Switch } from '@live-show/design-system';
import { useSetOverlayAdsMutation } from '../../mutations/set-overlay-ads.mutation';
import type { EventOverlayAds } from '../../types/event.types';
import styles from './OverlayAdsPanel.module.scss';

interface Props {
  eventId: string;
  overlayAds: EventOverlayAds;
  // Colaborador: a API só aceita OWNER/ADMIN da organização.
  readOnly?: boolean;
}

// Vitrine neste evento: o organizador liga/desliga (padrão ligado) e escolhe se
// vale também no replay. Pausa e vídeo antes da transmissão não passam por aqui.
export function OverlayAdsPanel({ eventId, overlayAds, readOnly = false }: Props) {
  const save = useSetOverlayAdsMutation(eventId);
  const locked = readOnly || save.isPending;
  const { allowed, onReplay } = overlayAds;

  return (
    <section className={styles.panel} aria-labelledby="overlay-ads-title">
      <header className={styles.header}>
        <Megaphone size={18} />
        <h2 id="overlay-ads-title" className={styles.title}>
          Anúncios no player
        </h2>
      </header>
      <p className={styles.hint}>
        A vitrine é uma logo pequena que entra por alguns segundos em cantos do player. Ela nunca cobre a transmissão, a
        janela de Libras nem os controles. Você recebe parte da receita.
      </p>

      <div className={styles.row}>
        <div>
          <label htmlFor="overlay-allowed" className={styles.label}>
            Permitir vitrine neste evento
          </label>
          <p className={styles.hint}>
            {allowed ? 'Ligada: anunciantes aprovados podem aparecer.' : 'Desligada: nenhuma vitrine aparece neste evento.'}
          </p>
        </div>
        <Switch
          id="overlay-allowed"
          aria-label="Permitir vitrine neste evento"
          checked={allowed}
          disabled={locked}
          onCheckedChange={(checked) => save.mutate({ allowed: checked, onReplay })}
        />
      </div>

      <div className={`${styles.row} ${allowed ? '' : styles.rowOff}`}>
        <div>
          <label htmlFor="overlay-replay" className={styles.label}>
            Mostrar também no replay
          </label>
          <p className={styles.hint}>O replay se comporta como a live.</p>
        </div>
        <Switch
          id="overlay-replay"
          aria-label="Mostrar também no replay"
          checked={allowed && onReplay}
          disabled={locked || !allowed}
          onCheckedChange={(checked) => save.mutate({ allowed, onReplay: checked })}
        />
      </div>

      {readOnly && <p className={styles.hint}>Só o dono ou administrador da organização altera isto.</p>}
      {save.isError && (
        <p className={styles.error} role="alert">
          Não foi possível salvar. Tente de novo.
        </p>
      )}
      <p className={styles.hint}>Pausa e vídeo antes da transmissão seguem as regras atuais.</p>
    </section>
  );
}
