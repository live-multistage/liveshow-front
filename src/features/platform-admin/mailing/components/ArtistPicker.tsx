'use client';

import { useEffect, useId, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { X } from 'lucide-react';
import { Input } from '@live-show/design-system';
import { artistService } from '@/features/artists/services/artist.service';
import styles from './EventPicker.module.scss';

interface Props {
  label: string;
  value?: string;
  onChange(id: string | undefined): void;
}

// ponytail: no MAILING_AUDIENCE_SPECS entry marks artistId optional today, so there's
// no "any artist" affordance (unlike OrganizationPicker) — add one if a spec needs it.
/** Single-select artist search, modelled on EventPicker (debounced search, chosen chip, remove). */
export function ArtistPicker({ label, value, onChange }: Props) {
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
    queryKey: ['platform-admin', 'mailing', 'artist-search', q],
    queryFn: () => artistService.search(q),
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
          <Input
            type="search"
            autoComplete="off"
            aria-label={t('audience.searchArtist')}
            placeholder={t('audience.artistPlaceholder')}
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          {q.length >= 2 && !search.isLoading && !search.isError && items.length > 0 && (
            <ul className={styles.results}>
              {items.map((artist) => (
                <li key={artist.id}>
                  <button
                    type="button"
                    className={styles.result}
                    onClick={() => { setChosenName(artist.name); onChange(artist.id); }}
                  >
                    <span className={styles.resultTitle}>{artist.name}</span>
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
