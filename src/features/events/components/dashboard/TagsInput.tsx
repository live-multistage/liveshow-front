'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import styles from './TagsInput.module.scss';

const MAX_TAGS = 20;
const MAX_TAG_LENGTH = 80;

interface Props {
  value: string[];
  onChange: (tags: string[]) => void;
}

export function TagsInput({ value = [], onChange }: Props) {
  const t = useTranslations('createEvent.info');
  const [draft, setDraft] = useState('');

  function commitDraft() {
    const tag = draft.trim();
    setDraft('');
    if (!tag) return;
    if (value.length >= MAX_TAGS) return;
    if (value.includes(tag)) return;
    onChange([...value, tag]);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      commitDraft();
    } else if (e.key === 'Backspace' && draft === '' && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  }

  function removeTag(tag: string) {
    onChange(value.filter((v) => v !== tag));
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.field}>
        {value.map((tag) => (
          <span key={tag} className={styles.chip}>
            {tag}
            <button
              type="button"
              onClick={() => removeTag(tag)}
              className={styles.chipRemove}
              aria-label={t('tagsRemove', { tag })}
            >
              <X size={12} />
            </button>
          </span>
        ))}
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          maxLength={MAX_TAG_LENGTH}
          placeholder={value.length === 0 ? t('tagsPlaceholder') : ''}
          className={styles.input}
          disabled={value.length >= MAX_TAGS}
        />
      </div>
      <p className={styles.hint}>{t('tagsHint')}</p>
    </div>
  );
}
