'use client';

import { Fragment } from 'react';
import { MoreHorizontal } from 'lucide-react';
import { useTranslations } from 'next-intl';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@live-show/design-system';
import type { ChatMessage } from '../types/chat.types';
import { mentionsUser, splitMentionSegments } from '../utils/mentions';
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
  const mentionsMe = mentionsUser(message.mentions, currentUserId);
  const segments = splitMentionSegments(message.body, message.mentions);

  return (
    <div
      className={mentionsMe ? `${styles.item} ${styles.itemMentioned}` : styles.item}
      data-mentions-me={mentionsMe || undefined}
    >
      <div className={styles.avatar} style={{ backgroundColor: message.authorColor }}>
        {message.authorInitials}
      </div>
      <div className={styles.body}>
        <div className={styles.meta}>
          <span className={styles.author}>{message.authorName}</span>
          {message.authorUsername && <span className={styles.username}>@{message.authorUsername}</span>}
          <span className={styles.time}>{formatTime(message.sentAt)}</span>
          {mentionsMe && <span className={styles.youChip}>{t('mentions.you')}</span>}
        </div>
        <div className={styles.text}>
          {segments.map((segment, i) =>
            segment.kind === 'mention' ? (
              <span key={i} className={styles.mention} data-mention-user={segment.userId}>
                {segment.text}
              </span>
            ) : (
              <Fragment key={i}>{segment.text}</Fragment>
            ),
          )}
        </div>
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
