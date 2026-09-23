'use client';

import { ShieldCheck } from 'lucide-react';
import type { WizardDraft } from './useHouseAdWizardForm';
import styles from './HouseAdWizardDialog.module.scss';

const PRIORITY_LABEL: Record<WizardDraft['housePriority'], string> = {
  FILL: 'Preenchimento',
  PRIORITY: 'Prioritário',
};

const FORMAT_LABEL: Record<string, string> = {
  HORIZONTAL_728x90: 'Banner 728×90',
  VERTICAL_300x600: 'Banner 300×600',
  WIDE_16_9: 'Imagem 16:9',
  VIDEO_16_9: 'Vídeo 16:9',
};

function fmtDateTime(local: string): string {
  if (!local) return '—';
  return new Date(local).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

interface Props {
  draft: WizardDraft;
  submitError: string | null;
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className={styles.summaryRow}>
      <span className={styles.summaryKey}>{k}</span>
      <span className={styles.summaryValue}>{v}</span>
    </div>
  );
}

export function Step4Review({ draft, submitError }: Props) {
  const destination =
    draft.destinationMode === 'EVENT'
      ? draft.destinationEventTitle || draft.destinationEventId || '—'
      : draft.destinationUrl;

  return (
    <>
      <div className={styles.banner}>
        <ShieldCheck size={18} aria-hidden />
        <span>Anúncios da plataforma não passam pela fila de aprovação.</span>
      </div>

      <div className={styles.card}>
        <div className={styles.cardHead}><span>CRIATIVO E DESTINO</span></div>
        <Row k="Título" v={draft.title} />
        <Row k="Formato" v={draft.format ? FORMAT_LABEL[draft.format] : '—'} />
        <Row k="Criativo" v={draft.creativeFileName ?? 'mantém o atual'} />
        <Row k="Destino" v={destination} />
      </div>

      <div className={styles.card}>
        <div className={styles.cardHead}><span>POSIÇÕES E PÚBLICO</span></div>
        <Row k="Posições" v={draft.placements.join(', ') || '—'} />
        <Row k="Interesses" v={draft.targetDomains.join(', ') || 'todos'} />
        <Row k="Categorias" v={draft.targetCategories.join(', ') || 'todas'} />
        <Row k="Faixas etárias" v={draft.targetAgeBrackets.join(', ') || 'todas (18+)'} />
        <Row
          k="Limite de frequência"
          v={draft.frequencyCapMax ? `${draft.frequencyCapMax} ${draft.frequencyCapWindow === 'day' ? 'por dia' : 'no total'}` : 'sem limite'}
        />
      </div>

      <div className={styles.card}>
        <div className={styles.cardHead}><span>PERÍODO E PRIORIDADE</span></div>
        <Row k="Início" v={fmtDateTime(draft.startsAt)} />
        <Row k="Fim" v={fmtDateTime(draft.endsAt)} />
        <Row k="Prioridade" v={PRIORITY_LABEL[draft.housePriority]} />
      </div>

      {submitError && <div className={styles.errorBanner}>{submitError}</div>}
    </>
  );
}
