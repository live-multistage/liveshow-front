'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { Input } from '@live-show/design-system';
import { platformAdminService } from '../../services/platform-admin.service';
import styles from './HouseAdWizardDialog.module.scss';

interface Props {
  value: string;
  valueTitle: string;
  onChange: (eventId: string, title: string) => void;
}

// Same search the mailing EventPicker uses (platformAdminService.getPlatformEvents
// with `q`) — there's no dedicated house-ads event-search endpoint, and this
// one already does title search + debounce, so it's reused as-is rather than
// building a second query for the same data.
export function EventDestinationSearch({ value, valueTitle, onChange }: Props) {
  const [input, setInput] = useState(valueTitle);
  const [q, setQ] = useState('');

  useEffect(() => {
    const handle = setTimeout(() => setQ(input.trim()), 300);
    return () => clearTimeout(handle);
  }, [input]);

  const search = useQuery({
    queryKey: ['platform-admin', 'house-ads', 'event-search', q],
    queryFn: () => platformAdminService.getPlatformEvents({ q }),
    enabled: q.length >= 2 && q !== valueTitle,
    staleTime: 30_000,
  });

  const items = search.data?.items ?? [];
  const showResults = q.length >= 2 && q !== valueTitle;

  return (
    <div className={styles.eventSearch}>
      <div className={styles.eventSearchInput}>
        <Search size={15} aria-hidden />
        <Input
          type="search"
          aria-label="Buscar evento pelo título"
          placeholder="Buscar evento pelo título…"
          value={value ? valueTitle || input : input}
          onChange={(e) => {
            setInput(e.target.value);
            if (value) onChange('', '');
          }}
        />
      </div>
      {showResults && (
        search.isLoading ? <p className={styles.muted}>Buscando…</p>
        : items.length === 0 ? <p className={styles.muted}>Nenhum evento encontrado.</p>
        : (
          <ul className={styles.eventResults}>
            {items.map((event) => (
              <li key={event.id}>
                <button type="button" className={styles.eventResult} onClick={() => onChange(event.id, event.title)}>
                  <span>{event.title}</span>
                  <span className={styles.muted}>{event.orgName}</span>
                </button>
              </li>
            ))}
          </ul>
        )
      )}
    </div>
  );
}
