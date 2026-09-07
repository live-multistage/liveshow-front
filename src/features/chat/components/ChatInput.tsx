'use client';

import { useState, type FormEvent } from 'react';
import { Send } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/features/account/hooks/use-auth';
import type { ChatMe } from '../types/chat.types';
import styles from './ChatInput.module.scss';

interface Props {
  onSend: (body: string) => void;
  me: ChatMe | null;
}

export function ChatInput({ onSend, me }: Props) {
  const t = useTranslations('chat');
  const pathname = usePathname();
  const { isLoggedIn } = useAuth();
  const [value, setValue] = useState('');

  // `me === null` means two different things: an anonymous viewer (offer
  // login) or a logged-in viewer whose bootstrap hasn't answered yet / failed
  // (never offer login — they are already in). Only the auth state decides.
  if (me === null && !isLoggedIn) {
    return (
      <div className={styles.joinRow}>
        <span>{t('joinToChat')}</span>
        <Link href={`/login?redirect=${encodeURIComponent(pathname)}`} className={styles.joinLink}>
          {t('login')}
        </Link>
      </div>
    );
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setValue('');
  };

  const blocked = me === null || me.isMuted || !me.canWrite;
  const placeholder =
    me === null ? t('connecting') : me.isMuted ? t('muted') : !me.canWrite ? t('unavailable') : t('placeholder');

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        className={styles.input}
        disabled={blocked}
      />
      <button
        type="submit"
        className={styles.sendBtn}
        aria-label={t('send')}
        disabled={blocked || !value.trim()}
      >
        <Send size={13} />
      </button>
    </form>
  );
}
