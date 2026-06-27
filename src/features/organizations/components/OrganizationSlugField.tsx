'use client';

import { useEffect, useRef, useState } from 'react';
import { useController, type Control } from 'react-hook-form';
import { Check, X, Loader2 } from 'lucide-react';
import type { CreateOrganizationValues } from '../schemas/create-organization.schema';
import { organizationService } from '../services/organization.service';
import styles from './OrganizationSlugField.module.scss';

type SlugStatus = 'idle' | 'checking' | 'available' | 'taken';

const SLUG_RE = /^[a-z0-9-]+$/;
const MIN_LENGTH = 3;
const DEBOUNCE_MS = 400;

interface Props {
  control: Control<CreateOrganizationValues>;
  excludeId?: string;
  initialSlug?: string;
}

export function OrganizationSlugField({ control, excludeId, initialSlug }: Props) {
  const { field, fieldState } = useController({ name: 'slug', control });
  const [status, setStatus] = useState<SlugStatus>('idle');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastChecked = useRef<string>('');

  useEffect(() => {
    const slug = field.value ?? '';

    if (slug.length < MIN_LENGTH || !SLUG_RE.test(slug) || slug === initialSlug) {
      setStatus('idle');
      return;
    }

    if (slug === lastChecked.current) return;

    setStatus('checking');
    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(async () => {
      try {
        const { available } = await organizationService.checkSlug(slug, excludeId);
        lastChecked.current = slug;
        setStatus(available ? 'available' : 'taken');
      } catch {
        setStatus('idle');
      }
    }, DEBOUNCE_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [field.value]);

  const hasError = !!fieldState.error || status === 'taken';

  return (
    <div className={styles.field}>
      <label className={styles.label}>Slug (URL única) *</label>
      <div className={`${styles.wrapper} ${hasError ? styles.wrapperError : ''} ${status === 'available' ? styles.wrapperOk : ''}`}>
        <div className={styles.prefix}>
        <span>@</span>
        </div>
        <input
          {...field}
          className={styles.input}
          placeholder="minha-organizacao"
        />
        <span className={styles.indicator}>
          {status === 'checking' && <Loader2 size={14} className={styles.iconSpin} />}
          {status === 'available' && <Check size={14} className={styles.iconOk} />}
          {status === 'taken' && <X size={14} className={styles.iconError} />}
        </span>
      </div>

      {fieldState.error && (
        <p className={styles.error}>{fieldState.error.message}</p>
      )}
      {!fieldState.error && status === 'taken' && (
        <p className={styles.error}>Slug já está em uso</p>
      )}
      {!fieldState.error && status === 'available' && (
        <p className={styles.hint}>Disponível</p>
      )}
    </div>
  );
}
