'use client';

import { useId } from 'react';
import { useTranslations } from 'next-intl';
import { Check } from 'lucide-react';
import { USERNAME_MAX_LENGTH } from '@live-show/api-contracts';
import type { useUsernameField } from '../hooks/use-username-field';
import styles from './UsernameField.module.scss';

const ERROR_KINDS = new Set(['taken', 'reserved', 'invalid']);

// Artboards Profile / ProfileTaken / ProfileInvalid / ProfileCooldown.
export function UsernameField({ field }: { field: ReturnType<typeof useUsernameField> }) {
  const t = useTranslations('account.username');
  const inputId = useId();
  const statusId = `${inputId}-status`;
  const helpId = `${inputId}-help`;
  const { state } = field;
  const isError = ERROR_KINDS.has(state.kind);

  // 'current' and 'unverified' render no status text.
  let status = '';
  if (state.kind === 'cooldown') status = t('cooldown', { days: state.days });
  else if (state.kind !== 'current' && state.kind !== 'unverified') status = t(state.kind);

  return (
    <div className={`${styles.field} ${styles[`state_${state.kind}`] ?? ''}`}>
      <div className={styles.labelRow}>
        <label htmlFor={inputId} className={styles.label}>
          {t('label')}
        </label>
        <span className={styles.counter}>
          {field.draft.length}/{USERNAME_MAX_LENGTH}
        </span>
      </div>
      <div className={styles.inputWrap}>
        <span className={styles.prefix} aria-hidden="true">
          @
        </span>
        <input
          id={inputId}
          className={styles.input}
          value={field.draft}
          onChange={(e) => field.setDraft(e.target.value)}
          maxLength={USERNAME_MAX_LENGTH}
          disabled={state.kind === 'cooldown'}
          autoComplete="off"
          spellCheck={false}
          aria-invalid={isError || undefined}
          aria-describedby={`${statusId} ${helpId}`}
        />
        {state.kind === 'checking' && <span className={styles.spinner} aria-hidden="true" />}
        {state.kind === 'available' && <Check className={styles.check} size={16} strokeWidth={2.6} aria-hidden="true" />}
      </div>
      <p id={statusId} className={styles.status} role="status">
        {status}
      </p>
      <p id={helpId} className={styles.help}>
        {t('help')}
      </p>
    </div>
  );
}
