'use client';

import { useEffect, useId, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { X } from 'lucide-react';
import { Input } from '@live-show/design-system';
import { collaborationsService } from '@/features/collaborations/services/collaborations.service';
import styles from './EventPicker.module.scss';

interface Props {
  label: string;
  value?: string;
  optional?: boolean;
  onChange(id: string | undefined): void;
}

/** Single-select organization search, modelled on EventPicker (debounced search, chosen chip, remove). */
export function OrganizationPicker({ label, value, optional, onChange }: Props) {
  const t = useTranslations('platformAdmin.mailing');
  const tCommon = useTranslations('common');
  const uid = useId();
  const [input, setInput] = useState('');
  const [q, setQ] = useState('');
  const [chosenName, setChosenName] = useState<string | null>(null);

  useEffect(() => { if (!value) setChosenName(null); }, [value]);

  useEffect(() => {
    const handle = setTimeout(() => setQ(input.trim()), 300);
    return () => clearTimeout(handle);
  }, [input]);

  const search = useQuery({
    queryKey: ['platform-admin', 'mailing', 'org-search', q],
    queryFn: () => collaborationsService.searchOrganizations(q),
    enabled: q.length >= 2,
    staleTime: 30_000,
  });

  const items = search.data ?? [];

  return (
    <fieldset className={styles.picker}>
      <legend className={styles.legend}>{label}</legend>

      {value ? (
        <ul className={styles.chips}>
          <li className={styles.chip}>
            <span id={`${uid}-chip`} className={styles.chipTitle}>{chosenName ?? value}</span>
            <button
              type="button"
              className={styles.chipRemove}
              aria-label={tCommon('remove')}
              aria-describedby={`${uid}-chip`}
              onClick={() => onChange(undefined)}
            >
              <X aria-hidden="true" />
            </button>
          </li>
        </ul>
      ) : (
        <>
          {optional && <p className={styles.muted}>{t('audience.anyOrganization')}</p>}
          <Input
            type="search"
            autoComplete="off"
            aria-label={t('audience.searchOrganization')}
            placeholder={t('audience.organizationPlaceholder')}
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          {q.length >= 2 && !search.isLoading && !search.isError && items.length > 0 && (
            <ul className={styles.results}>
              {items.map((org) => (
                <li key={org.id}>
                  <button
                    type="button"
                    className={styles.result}
                    onClick={() => { setChosenName(org.name); onChange(org.id); }}
                  >
                    <span className={styles.resultTitle}>{org.name}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </fieldset>
  );
}
