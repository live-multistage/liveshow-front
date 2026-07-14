'use client';

import { useState } from 'react';
import { BookOpen, ChevronDown, Check, Sparkles, Ticket, LayoutTemplate } from 'lucide-react';
import styles from './CreateEventTips.module.scss';

const POSITION_TIPS = [
  <>Título claro e específico — nome do evento + artista ou tema.</>,
  <>Banner e thumbnail atraentes, na proporção certa e com pouco texto sobre a imagem.</>,
  <>Descrição que vende: o que é, quem se apresenta e qual o diferencial.</>,
  <>Categoria e tags corretas — é assim que o público te encontra na busca.</>,
  <>Data e hora realistas, publicadas com antecedência para dar tempo de divulgar.</>,
] as const;

const TICKET_TIPS = [
  <>Ofereça faixas diferentes (ao vivo, câmeras extras) para públicos diferentes.</>,
  <>Preço coerente com o valor entregue em cada faixa.</>,
] as const;

// Static best-practices help panel for the event-creation wizard. Mirrors the
// StreamsHowItWorks pattern: a self-contained collapsible panel with inline
// pt-BR copy and its own SCSS module (no i18n, no props, no data).
export function CreateEventTips() {
  const [open, setOpen] = useState(false);

  return (
    <section className={styles.panel}>
      <button
        className={styles.toggle}
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        type="button"
      >
        <BookOpen size={14} className={styles.toggleIcon} />
        <span className={styles.toggleLabel}>BOAS PRÁTICAS</span>
        <span className={styles.toggleHint}>Posicionar › Ingressos</span>
        <ChevronDown size={16} className={`${styles.chevron} ${open ? styles.chevronOpen : ''}`} />
      </button>

      {open && (
        <div className={styles.body}>
          {/* 1 — posicionar o evento */}
          <div className={styles.section}>
            <div className={styles.sectionLabel}>
              <LayoutTemplate size={12} className={styles.sectionLabelIcon} />
              POSICIONAR SEU EVENTO
            </div>
            <ul className={styles.tipList}>
              {POSITION_TIPS.map((tip, i) => (
                <li key={i} className={styles.tipItem}>
                  <Check size={14} className={styles.tipIcon} />
                  <span className={styles.tipText}>{tip}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* 2 — ingressos que vendem */}
          <div className={styles.section}>
            <div className={styles.sectionLabel}>
              <Ticket size={12} className={styles.sectionLabelIcon} />
              INGRESSOS QUE VENDEM
            </div>
            <ul className={styles.tipList}>
              {TICKET_TIPS.map((tip, i) => (
                <li key={i} className={styles.tipItem}>
                  <Check size={14} className={styles.tipIcon} />
                  <span className={styles.tipText}>{tip}</span>
                </li>
              ))}
            </ul>

            <div className={styles.highlight}>
              <div className={styles.highlightTitle}>
                <Sparkles size={14} className={styles.highlightIcon} />
                Ingresso “Somente reprise” = venda contínua
              </div>
              <p className={styles.highlightText}>
                No passo <strong>Ingressos</strong>, crie um ingresso marcando{' '}
                <strong>apenas “Reprise”</strong> (sem “Ao vivo”). Ele dá acesso à{' '}
                <strong>gravação</strong> do evento e pode continuar sendo{' '}
                <strong>vendido depois</strong> que a data passa — transformando cada evento em{' '}
                <strong>receita futura contínua</strong>, não só na noite da transmissão.
              </p>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
