'use client';

import type { ChatMessage } from '../types/chat.types';
import styles from './ChatMessageItem.module.scss';

interface Props {
  message: ChatMessage;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

export function ChatMessageItem({ message }: Props) {
  return (
    <div className={styles.item}>
      <div className={styles.avatar} style={{ backgroundColor: message.authorColor }}>
        {message.authorInitials}
      </div>
      <div className={styles.body}>
        <div className={styles.meta}>
          <span className={styles.author}>{message.authorName}</span>
          <span className={styles.time}>{formatTime(message.sentAt)}</span>
        </div>
        <div className={styles.text}>{message.body}</div>
      </div>
    </div>
  );
}
