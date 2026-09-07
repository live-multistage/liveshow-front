'use client';

import { X, MessageSquare } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ChatMe, ChatMessage, ReactionEmoji } from '../types/chat.types';
import type { ChatStatus } from '../hooks/use-chat';
import { ChatMessageList } from './ChatMessageList';
import { ChatInput } from './ChatInput';
import { ReactionBar } from './ReactionBar';
import { FloatingReactions } from './FloatingReactions';
import styles from './ChatDock.module.scss';

interface Props {
  open: boolean;
  onClose: () => void;
  messages: ChatMessage[];
  onSend: (body: string) => void;
  onReact: (emoji: ReactionEmoji) => void;
  reactionCounts: Record<ReactionEmoji, number>;
  me: ChatMe | null;
  status: ChatStatus;
  onDeleteMessage: (messageId: string) => void;
  onMuteUser: (userId: string) => void;
  // Wired for parity with the hook — v1 has no unmute UI, only the mute
  // action is exposed from ChatMessageItem's moderation menu.
  onUnmuteUser: (userId: string) => void;
  currentUserId: string | null;
}

export function ChatDock({
  open,
  onClose,
  messages,
  onSend,
  onReact,
  reactionCounts,
  me,
  status,
  onDeleteMessage,
  onMuteUser,
  onUnmuteUser,
  currentUserId,
}: Props) {
  const t = useTranslations('chat');
  // v1 has no unmute UI beyond the hook itself — kept as a prop for parity,
  // deliberately unused here.
  void onUnmuteUser;
  if (!open) return null;

  return (
    <div className={styles.dock}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <MessageSquare size={14} color="#ff8ec9" />
          <span className={styles.title}>{t('title')}</span>
          <span className={styles.count}>{t('messagesCount', { count: messages.length })}</span>
        </div>
        <button className={styles.closeBtn} onClick={onClose} aria-label={t('close')}>
          <X size={12} />
        </button>
      </div>

      {status === 'reconnecting' && (
        <div className={styles.reconnecting}>{t('reconnecting')}</div>
      )}

      <ChatMessageList
        messages={messages}
        me={me}
        currentUserId={currentUserId}
        onDeleteMessage={onDeleteMessage}
        onMuteUser={onMuteUser}
      />
      <div className={styles.reactionArea}>
        <FloatingReactions counts={reactionCounts} />
        <ReactionBar onReact={onReact} counts={reactionCounts} />
      </div>

      <div className={styles.inputArea}>
        <ChatInput onSend={onSend} me={me} />
      </div>
    </div>
  );
}
