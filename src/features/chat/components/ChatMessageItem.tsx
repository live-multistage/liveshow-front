'use client';

import { MoreHorizontal } from 'lucide-react';
import { useTranslations } from 'next-intl';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@live-show/design-system';
import type { ChatMessage } from '../types/chat.types';
import styles from './ChatMessageItem.module.scss';

interface Props {
  message: ChatMessage;
  isModerator: boolean;
  currentUserId: string | null;
  onDelete: (messageId: string) => void;
  onMute: (userId: string) => void;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

export function ChatMessageItem({ message, isModerator, currentUserId, onDelete, onMute }: Props) {
  const t = useTranslations('chat');
  const canMute = message.userId !== currentUserId;

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

      {isModerator && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            {/* ponytail: no i18n key exists for the kebab trigger itself in
                the fixed T1/T6 contract (only for the menu items it opens);
                adding one is a translators-touch-3-files change out of scope
                for this task. */}
            <button type="button" className={styles.kebabBtn} aria-label="Moderação">
              <MoreHorizontal size={14} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => onDelete(message.id)}>{t('delete')}</DropdownMenuItem>
            {canMute && (
              <DropdownMenuItem onSelect={() => onMute(message.userId)}>
                {t('muteUser', { name: message.authorName })}
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
