'use client';

import { useEffect, useRef, useState } from 'react';
import styles from './VitrineReview.module.scss';

type Position = 'TOP' | 'BOTTOM' | 'SIDE';
type Phase = 'off' | 'hold';

interface Props {
  logoUrl: string;
  title: string;
  position: Position;
  animation: 'SLIDE' | 'FADE';
  durationSec: number;
  // Avisa quando o revisor olha a logo sobre fundo claro (o contraste só se confere ali).
  onViewedLight: () => void;
}

const POSITION_LABEL: Record<Position, string> = { TOP: 'Topo', BOTTOM: 'Rodapé', SIDE: 'Lateral' };
const POSITIONS: Position[] = ['TOP', 'BOTTOM', 'SIDE'];

const FIRST_PAINT_MS = 50;
const ENTER_MS = 450;
const SETTLE_MS = 1600;

const CHECKLIST: { title: string; hint: string }[] = [
  { title: 'Fundo transparente', hint: 'conferido no envio' },
  { title: 'Contraste da logo sem placa', hint: 'legível sobre vídeo claro e escuro só com a sombra sutil; alterne o fundo acima' },
  { title: 'Não imita controles do player', hint: 'sem play, fechar, "ao vivo" ou setas' },
  { title: 'Destino abre e não é golpe', hint: 'abra o link antes de aprovar' },
  { title: 'Selo "Patrocinado" visível', hint: 'sempre do player, não do arquivo' },
];

// Revisão da vitrine: a logo no player nas 3 posições e no celular, sobre
// fundo escuro e claro, e a conferência do que o revisor precisa checar.
export function VitrineReview({ logoUrl, title, position: bought, animation, durationSec, onViewedLight }: Props) {
  const [position, setPosition] = useState<Position>(bought);
  const [phone, setPhone] = useState(false);
  const [light, setLight] = useState(false);
  const [viewedLight, setViewedLight] = useState(false);
  const [phase, setPhase] = useState<Phase>('hold');
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  // No celular não há largura para a Lateral: ela aparece no Rodapé.
  const shown: Position = phone && position === 'SIDE' ? 'BOTTOM' : position;

  function chooseBackground(next: boolean) {
    setLight(next);
    if (!next) return;
    setViewedLight(true);
    onViewedLight();
  }

  function play() {
    timers.current.forEach(clearTimeout);
    setPhase('off');
    timers.current = [
      setTimeout(() => setPhase('hold'), FIRST_PAINT_MS),
      setTimeout(() => setPhase('off'), FIRST_PAINT_MS + ENTER_MS + durationSec * 1000),
      setTimeout(() => setPhase('hold'), FIRST_PAINT_MS + ENTER_MS + durationSec * 1000 + SETTLE_MS),
    ];
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.toolbar}>
        <div className={styles.seg} role="group" aria-label="Posição">
          {POSITIONS.map((p) => (
            <button
              key={p}
              type="button"
              aria-pressed={position === p}
              className={`${styles.segBtn} ${position === p ? styles.segBtnOn : ''}`}
              onClick={() => setPosition(p)}
            >
              {POSITION_LABEL[p]}
              {p === bought ? ' · comprada' : ''}
            </button>
          ))}
          <button
            type="button"
            aria-pressed={phone}
            className={`${styles.segBtn} ${phone ? styles.segBtnOn : ''}`}
            onClick={() => setPhone((v) => !v)}
          >
            Celular
          </button>
        </div>
        <div className={styles.seg} role="group" aria-label="Fundo do vídeo">
          <button type="button" aria-pressed={!light} className={`${styles.segBtn} ${!light ? styles.segBtnOn : ''}`} onClick={() => chooseBackground(false)}>
            Fundo escuro
          </button>
          <button type="button" aria-pressed={light} className={`${styles.segBtn} ${light ? styles.segBtnOn : ''}`} onClick={() => chooseBackground(true)}>
            Fundo claro
          </button>
        </div>
      </div>

      <div
        className={`${styles.player} ${phone ? styles.playerPhone : ''}`}
        data-testid="vitrine-review-player"
        data-bg={light ? 'light' : 'dark'}
        role="img"
        aria-label={`Prévia: vitrine no player, ${POSITION_LABEL[shown].toLowerCase()}${phone ? ', no celular' : ''}`}
      >
        <div className={styles.video} />
        <div className={styles.header}>
          <span className={styles.badge}>AO VIVO</span>
          <span className={styles.headerTitle}>{title}</span>
        </div>
        <div className={styles.bar} />
        <span
          className={styles.logoBox}
          data-testid="vitrine-review-logo"
          data-position={shown}
          data-animation={animation}
          data-phase={phase}
          data-phone={phone}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- criativo externo com canal alfa */}
          <img className={styles.logo} src={logoUrl} alt="Logo da vitrine" />
          <span className={styles.seal}>Patrocinado</span>
        </span>
      </div>

      <div className={styles.playRow}>
        <button type="button" className={styles.play} onClick={play}>
          ▶ Reproduzir animação
        </button>
        <span className={styles.hint}>
          {animation === 'SLIDE' ? 'Deslizar' : 'Aparecer'} · {durationSec} s
        </span>
      </div>

      <div className={styles.checks}>
        <div className={styles.checksTitle}>Conferência</div>
        {CHECKLIST.map((item, index) => {
          // O contraste só fica conferido depois de ver a logo sobre fundo claro.
          const on = index === 1 ? viewedLight : true;
          return (
            <div key={item.title} className={`${styles.check} ${on ? styles.checkOn : ''}`}>
              <span className={styles.checkBox} aria-hidden>
                {on ? '✓' : ''}
              </span>
              <span>
                <span className={styles.checkTitle}>{item.title}</span>
                <span className={styles.hint}>{item.hint}</span>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
