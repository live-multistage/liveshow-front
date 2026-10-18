'use client';

import { useTranslations } from 'next-intl';
import type { ChatParticipant } from '@live-show/api-contracts';
import styles from './MentionSuggestions.module.scss';

interface Props {
  id: string;
  query: string;
  options: ChatParticipant[];
  activeIndex: number;
  optionId: (index: number) => string;
  loading: boolean;
  empty: boolean;
  onSelect: (option: ChatParticipant) => void;
}

function initials(name: string): string {
  return name.trim().slice(0, 2).toUpperCase() || '??';
}

function Handle({ username, query }: { username: string; query: string }) {
  if (!query || !username.toLowerCase().startsWith(query.toLowerCase())) return <>@{username}</>;
  return (
    <>
      @<mark className={styles.match}>{username.slice(0, query.length)}</mark>
      {username.slice(query.length)}
    </>
  );
}

// Popover anchored above the composer, inside the dock (artboards Main /
// ChatFiltering / ChatNoResults / ChatLoading / ChatMobile).
export function MentionSuggestions({ id, query, options, activeIndex, optionId, loading, empty, onSelect }: Props) {
  const t = useTranslations('chat');
  return (
    <div className={styles.popover}>
      <ul id={id} role="listbox" aria-label={t('mentions.listLabel')} className={styles.list}>
        {loading &&
          [0, 1, 2].map((i) => (
            <li key={i} className={styles.skeletonRow} aria-hidden="true">
              <span className={styles.skeletonAvatar} />
              <span className={styles.skeletonLines}>
                <span className={styles.skeletonName} />
                <span className={styles.skeletonHandle} />
              </span>
            </li>
          ))}
        {options.map((option, index) => (
          <li
            key={option.userId}
            id={optionId(index)}
            role="option"
            aria-selected={index === activeIndex}
            aria-label={t('mentions.optionLabel', { username: option.username })}
            className={index === activeIndex ? `${styles.option} ${styles.optionActive}` : styles.option}
            // mousedown + preventDefault keeps focus (and the caret) in the input.
            onMouseDown={(e) => {
              e.preventDefault();
              onSelect(option);
            }}
          >
            <span className={styles.avatar}>
              {option.avatarUrl ? <img src={option.avatarUrl} alt="" /> : initials(option.displayName)}
            </span>
            <span className={styles.text}>
              <span className={styles.name}>{option.displayName}</span>
              <span className={styles.username}>
                <Handle username={option.username} query={query} />
              </span>
            </span>
          </li>
        ))}
      </ul>
      {empty && <p className={styles.empty}>{t('mentions.noResults')}</p>}
      <p className={styles.hint} aria-hidden="true">
        {t('mentions.hint')}
      </p>
    </div>
  );
}
