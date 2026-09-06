'use client';

import { useState, type FormEvent } from 'react';
import { Send } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import type { ChatMe } from '../types/chat.types';
import styles from './ChatInput.module.scss';

interface Props {
  onSend: (body: string) => void;
  me: ChatMe | null;
}

export function ChatInput({ onSend, me }: Props) {
  const t = useTranslations('chat');
  const pathname = usePathname();
  const [value, setValue] = useState('');

  if (me === null) {
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

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={me.isMuted ? t('muted') : t('placeholder')}
        className={styles.input}
        disabled={me.isMuted}
      />
      <button
        type="submit"
        className={styles.sendBtn}
        aria-label={t('send')}
        disabled={me.isMuted || !value.trim()}
      >
        <Send size={13} />
      </button>
    </form>
  );
}
