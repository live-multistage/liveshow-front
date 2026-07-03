'use client';

import type { ReactionEmoji } from '../types/chat.types';
import { REACTION_EMOJIS } from '../hooks/use-chat';
import styles from './ReactionBar.module.scss';

interface Props {
  onReact: (emoji: ReactionEmoji) => void;
}

export function ReactionBar({ onReact }: Props) {
  return (
    <div className={styles.bar}>
      <span className={styles.label}>REAGIR</span>
      {REACTION_EMOJIS.map((emoji) => (
        <button key={emoji} className={styles.emojiBtn} onClick={() => onReact(emoji)}>
          {emoji}
        </button>
      ))}
    </div>
  );
}
