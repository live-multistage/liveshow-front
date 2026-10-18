'use client';

import { useRef, useState, type FormEvent } from 'react';
import { Send } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/features/account/hooks/use-auth';
import { useAnalytics } from '@/lib/analytics/tracking';
import type { ChatMe } from '../types/chat.types';
import { useMentionAutocomplete } from '../hooks/use-mention-autocomplete';
import { MentionSuggestions } from './MentionSuggestions';
import styles from './ChatInput.module.scss';

interface Props {
  eventId: string;
  streamId: string | null;
  onSend: (body: string) => void;
  me: ChatMe | null;
}

export function ChatInput({ eventId, streamId, onSend, me }: Props) {
  const t = useTranslations('chat');
  const analytics = useAnalytics();
  const pathname = usePathname();
  const { isLoggedIn } = useAuth();
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const blocked = me === null || me.isMuted || !me.canWrite;
  const mention = useMentionAutocomplete({
    eventId,
    streamId,
    value,
    enabled: !blocked,
    onValueChange: (next, caret) => {
      setValue(next);
      requestAnimationFrame(() => inputRef.current?.setSelectionRange(caret, caret));
    },
  });
  const trackCaret = (el: HTMLInputElement) => mention.track(el.value, el.selectionStart ?? el.value.length);

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
    analytics.track('chat_message_sent', { eventId });
    setValue('');
    mention.close();
  };

  const placeholder =
    me === null ? t('connecting') : me.isMuted ? t('muted') : !me.canWrite ? t('unavailable') : t('placeholder');

  return (
    <form className={mention.open ? `${styles.form} ${styles.formOpen}` : styles.form} onSubmit={handleSubmit}>
      {mention.open && (
        <MentionSuggestions
          id={mention.listboxId}
          query={mention.query}
          options={mention.options}
          activeIndex={mention.activeIndex}
          optionId={mention.optionId}
          loading={mention.loading}
          empty={mention.empty}
          onSelect={mention.select}
        />
      )}
      <input
        ref={inputRef}
        type="text"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={mention.open}
        aria-controls={mention.listboxId}
        aria-activedescendant={mention.activeOptionId}
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          trackCaret(e.target);
        }}
        onSelect={(e) => trackCaret(e.currentTarget)}
        onKeyUp={(e) => trackCaret(e.currentTarget)}
        onClick={(e) => trackCaret(e.currentTarget)}
        onKeyDown={mention.onKeyDown}
        onBlur={mention.close}
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
