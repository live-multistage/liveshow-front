'use client';

import { useEffect, useRef } from 'react';
import type { ChatMessage } from '../types/chat.types';
import { ChatMessageItem } from './ChatMessageItem';
import styles from './ChatMessageList.module.scss';

interface Props {
  messages: ChatMessage[];
}

// Auto-scrolls to the newest message whenever the list grows — every live
// chat UX (Twitch/YouTube) does this so viewers never have to scroll down
// manually to see what's just been posted.
export function ChatMessageList({ messages }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' });
  }, [messages.length]);

  return (
    <div className={styles.list}>
      {messages.length === 0 ? (
        <p className={styles.empty}>Seja o primeiro a comentar</p>
      ) : (
        messages.map((message) => <ChatMessageItem key={message.id} message={message} />)
      )}
      <div ref={bottomRef} />
    </div>
  );
}
