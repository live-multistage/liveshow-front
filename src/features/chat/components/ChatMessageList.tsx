'use client';

import { useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import type { ChatMe, ChatMessage } from '../types/chat.types';
import { ChatMessageItem } from './ChatMessageItem';
import styles from './ChatMessageList.module.scss';

interface Props {
  messages: ChatMessage[];
  me: ChatMe | null;
  currentUserId: string | null;
  onDeleteMessage: (messageId: string) => void;
  onMuteUser: (userId: string) => void;
}

// Auto-scrolls to the newest message whenever the list grows — every live
// chat UX (Twitch/YouTube) does this so viewers never have to scroll down
// manually to see what's just been posted.
export function ChatMessageList({ messages, me, currentUserId, onDeleteMessage, onMuteUser }: Props) {
  const t = useTranslations('chat');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' });
  }, [messages.length]);

  return (
    <div className={styles.list}>
      {messages.length === 0 ? (
        <p className={styles.empty}>{t('empty')}</p>
      ) : (
        messages.map((message) => (
          <ChatMessageItem
            key={message.id}
            message={message}
            isModerator={me?.isModerator ?? false}
            currentUserId={currentUserId}
            onDelete={onDeleteMessage}
            onMute={onMuteUser}
          />
        ))
      )}
      <div ref={bottomRef} />
    </div>
  );
}
