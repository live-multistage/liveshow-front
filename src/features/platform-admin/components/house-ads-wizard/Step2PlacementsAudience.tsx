'use client';

import { useState } from 'react';
import { AGE_BRACKET_LABELS } from '@live-show/api-contracts';
import {
  HOUSE_AD_PLACEMENT_ACCEPTED_FORMATS,
  HOUSE_AD_TARGETABLE_AGE_BRACKETS,
  type HouseAdPlacement,
} from '../../house-ads';
import type { WizardDraft } from './useHouseAdWizardForm';
import styles from './HouseAdWizardDialog.module.scss';

const PLACEMENT_META: Record<HouseAdPlacement, { name: string; desc: string }> = {
  FEED: { name: 'Feed', desc: 'Lista de eventos e canais' },
  EVENT_DETAIL: { name: 'Página do evento', desc: 'Abaixo dos detalhes do evento' },
  CHECKOUT: { name: 'Checkout', desc: 'Durante a compra do ingresso' },
  POST_PURCHASE: { name: 'Pós-compra', desc: 'Confirmação da compra' },
  PLAYER_PAUSE: { name: 'Pausa no player', desc: 'Player de vídeo pausado' },
  PRE_ROLL: { name: 'Pre-roll', desc: 'Antes do vídeo começar' },
};

interface Props {
  draft: WizardDraft;
  update: <K extends keyof WizardDraft>(key: K, value: WizardDraft[K]) => void;
  togglePlacement: (placement: HouseAdPlacement) => void;
}

function TagGroup({ label, values, onChange }: { label: string; values: string[]; onChange: (v: string[]) => void }) {
  const [input, setInput] = useState('');

  function add() {
    const value = input.trim();
    if (!value || values.includes(value)) return;
    onChange([...values, value]);
    setInput('');
  }

  return (
    <div>
      <div className={styles.cardHead}><span>{label}</span></div>
      <div className={styles.chipRow} style={{ marginBottom: 8 }}>
        {values.map((v) => (
          <button key={v} type="button" className={`${styles.chip} ${styles.chipActive}`} onClick={() => onChange(values.filter((x) => x !== v))}>
            {v} ×
          </button>
        ))}
      </div>
      <div className={styles.tagInputRow}>
        <input
          className={styles.input}
          placeholder={`Adicionar ${label.toLowerCase()}…`}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              add();
            }
          }}
          aria-label={label}
        />
      </div>
    </div>
  );
}

export function Step2PlacementsAudience({ draft, update, togglePlacement }: Props) {
  const compatiblePlacements = draft.format
    ? (Object.keys(PLACEMENT_META) as HouseAdPlacement[]).filter((p) => HOUSE_AD_PLACEMENT_ACCEPTED_FORMATS[p].includes(draft.format!))
    : [];

  return (
    <>
      <div className={styles.card}>
        <div className={styles.cardHead}>
          <span>POSIÇÕES</span>
          <span>{draft.placements.length} de {compatiblePlacements.length} compatíveis selecionadas</span>
        </div>
        <div className={styles.placementGrid} role="group" aria-label="Posições">
          {(Object.keys(PLACEMENT_META) as HouseAdPlacement[]).map((p) => {
            const compatible = compatiblePlacements.includes(p);
            const active = draft.placements.includes(p);
            return (
              <button
                key={p}
                type="button"
                role="checkbox"
                aria-checked={active}
                disabled={!compatible}
                className={`${styles.placementCard} ${active ? styles.placementCardActive : ''}`}
                onClick={() => togglePlacement(p)}
                title={!compatible ? 'Incompatível com o formato escolhido' : undefined}
              >
                <div>
                  <div className={styles.placementName}>{PLACEMENT_META[p].name}</div>
                  <div className={styles.placementDesc}>{PLACEMENT_META[p].desc}</div>
                </div>
              </button>
            );
          })}
        </div>
        {draft.placements.length === 0 && <p className={styles.error}>Selecione ao menos uma posição.</p>}
      </div>

      <div className={styles.card}>
        <TagGroup label="INTERESSES" values={draft.targetDomains} onChange={(v) => update('targetDomains', v)} />
        <TagGroup label="CATEGORIAS" values={draft.targetCategories} onChange={(v) => update('targetCategories', v)} />
        <p className={styles.hint}>Sem seleção = todos. Interesses e categorias somam alcance (qualquer um).</p>
      </div>

      <div className={styles.card}>
        <div className={styles.cardHead}><span>FAIXAS ETÁRIAS · 18+</span></div>
        <div className={styles.chipRow}>
          {HOUSE_AD_TARGETABLE_AGE_BRACKETS.map((age) => (
            <button
              key={age}
              type="button"
              className={`${styles.chip} ${draft.targetAgeBrackets.includes(age) ? styles.chipActive : ''}`}
              onClick={() =>
                update(
                  'targetAgeBrackets',
                  draft.targetAgeBrackets.includes(age)
                    ? draft.targetAgeBrackets.filter((a) => a !== age)
                    : [...draft.targetAgeBrackets, age],
                )
              }
            >
              {AGE_BRACKET_LABELS[age]}
            </button>
          ))}
        </div>

        <div className={styles.cardHead} style={{ marginTop: 12 }}><span>LIMITE DE FREQUÊNCIA POR PESSOA</span></div>
        <div className={styles.frequencyRow}>
          <input
            className={styles.input}
            style={{ width: 90 }}
            type="number"
            min={1}
            placeholder="Sem limite"
            value={draft.frequencyCapMax}
            onChange={(e) => update('frequencyCapMax', e.target.value.replace(/\D/g, ''))}
            aria-label="Máximo de exibições por pessoa"
          />
          <span className={styles.hint}>exibições</span>
          <div className={styles.destinationTabs} role="tablist" aria-label="Janela do limite de frequência">
            <button
              type="button"
              role="tab"
              aria-selected={draft.frequencyCapWindow === 'day'}
              className={`${styles.destinationTab} ${draft.frequencyCapWindow === 'day' ? styles.destinationTabActive : ''}`}
              onClick={() => update('frequencyCapWindow', 'day')}
            >
              por dia
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={draft.frequencyCapWindow === 'total'}
              className={`${styles.destinationTab} ${draft.frequencyCapWindow === 'total' ? styles.destinationTabActive : ''}`}
              onClick={() => update('frequencyCapWindow', 'total')}
            >
              no total
            </button>
          </div>
        </div>
        {draft.frequencyCapMax && Number(draft.frequencyCapMax) <= 0 && (
          <p className={styles.error}>O limite precisa ser maior que zero.</p>
        )}
      </div>
    </>
  );
}
