'use client';

import type { CSSProperties } from 'react';
import { useTranslations } from 'next-intl';
import type { ChatParticipant } from '@live-show/api-contracts';
import { avatarColor, initialsFromName } from '../utils/avatar';
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

const SKELETON_WIDTHS = ['62%', '48%', '70%'];

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
      <p className={styles.heading}>{t('mentions.heading')}</p>
      <ul id={id} role="listbox" aria-label={t('mentions.listLabel')} className={styles.list}>
        {loading &&
          SKELETON_WIDTHS.map((width) => (
            <li key={width} className={styles.skeletonRow} aria-hidden="true">
              <span className={styles.skeletonAvatar} />
              <span className={styles.skeletonLines}>
                <span className={styles.skeletonName} style={{ '--skeleton-width': width } as CSSProperties} />
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
            <span className={styles.avatar} style={{ backgroundColor: avatarColor(option.displayName) }}>
              {option.avatarUrl ? <img src={option.avatarUrl} alt="" /> : initialsFromName(option.displayName)}
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
