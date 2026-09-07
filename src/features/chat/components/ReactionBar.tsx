'use client';

import { useState } from 'react';
import type { ReactionEmoji } from '../types/chat.types';
import { REACTION_EMOJIS } from '../hooks/use-chat';
import styles from './ReactionBar.module.scss';

interface Props {
  onReact: (emoji: ReactionEmoji) => void;
  counts: Record<ReactionEmoji, number>;
}

// Duplicated on purpose — see ReactionsTicker's fmtCompact for why.
function fmtCompact(v: number): string {
  if (v >= 1000) return `${(v / 1000).toFixed(1).replace('.', ',')}k`;
  return v.toLocaleString('pt-BR');
}

export function ReactionBar({ onReact, counts }: Props) {
  const [pulsing, setPulsing] = useState<ReactionEmoji | null>(null);

  function handleClick(emoji: ReactionEmoji) {
    onReact(emoji);
    setPulsing(emoji);
  }

  return (
    <div className={styles.bar}>
      <span className={styles.label}>REAGIR</span>
      {REACTION_EMOJIS.map((emoji) => {
        const count = counts[emoji] ?? 0;
        return (
          <button
            key={emoji}
            className={pulsing === emoji ? `${styles.emojiBtn} ${styles.pulse}` : styles.emojiBtn}
            onClick={() => handleClick(emoji)}
            onAnimationEnd={() => setPulsing((prev) => (prev === emoji ? null : prev))}
          >
            <span className={styles.emoji}>{emoji}</span>
            {count > 0 && <span className={styles.count}>{fmtCompact(count)}</span>}
          </button>
        );
      })}
    </div>
  );
}
