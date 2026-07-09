'use client';

import { X, MessageSquare } from 'lucide-react';
import type { ChatMessage, ReactionEmoji } from '../types/chat.types';
import { ChatMessageList } from './ChatMessageList';
import { ChatInput } from './ChatInput';
import { ReactionBar } from './ReactionBar';
import styles from './ChatDock.module.scss';

interface Props {
  open: boolean;
  onClose: () => void;
  messages: ChatMessage[];
  onSend: (body: string) => void;
  onReact: (emoji: ReactionEmoji) => void;
}

export function ChatDock({ open, onClose, messages, onSend, onReact }: Props) {
  if (!open) return null;

  return (
    <div className={styles.dock}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <MessageSquare size={14} color="#ff8ec9" />
          <span className={styles.title}>Chat</span>
          <span className={styles.count}>{messages.length} MENSAGENS</span>
        </div>
        <button className={styles.closeBtn} onClick={onClose} aria-label="Fechar chat">
          <X size={12} />
        </button>
      </div>

      <ChatMessageList messages={messages} />
      <ReactionBar onReact={onReact} />

      <div className={styles.inputArea}>
        <ChatInput onSend={onSend} />
      </div>
    </div>
  );
}
