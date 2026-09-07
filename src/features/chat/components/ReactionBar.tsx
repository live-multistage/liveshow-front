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
  // { emoji, nonce }: the nonce keys the inner span so a re-click during the
  // 250ms pulse remounts it and the CSS animation restarts instead of being
  // swallowed by an unchanged className.
  const [pulsing, setPulsing] = useState<{ emoji: ReactionEmoji; nonce: number } | null>(null);

  function handleClick(emoji: ReactionEmoji) {
    onReact(emoji);
    setPulsing((prev) => ({ emoji, nonce: (prev?.nonce ?? 0) + 1 }));
  }

  return (
    <div className={styles.bar}>
      <span className={styles.label}>REAGIR</span>
      {REACTION_EMOJIS.map((emoji) => {
        const count = counts[emoji] ?? 0;
        return (
          <button
            key={emoji}
            className={styles.emojiBtn}
            aria-label={`Reagir com ${emoji}`}
            onClick={() => handleClick(emoji)}
          >
            <span
              key={pulsing?.emoji === emoji ? pulsing.nonce : 0}
              className={pulsing?.emoji === emoji ? `${styles.emoji} ${styles.pulse}` : styles.emoji}
              onAnimationEnd={() => setPulsing((prev) => (prev?.emoji === emoji ? null : prev))}
            >
              {emoji}
            </span>
            {count > 0 && <span className={styles.count}>{fmtCompact(count)}</span>}
          </button>
        );
      })}
    </div>
  );
}
