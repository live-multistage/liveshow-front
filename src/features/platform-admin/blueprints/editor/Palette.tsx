'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Search } from 'lucide-react';
import type { BlueprintCatalogEntry } from '@live-show/api-contracts';
import { Input, Skeleton, cn } from '@live-show/design-system';
import { KIND_ORDER, NodeIcon, kindClass } from './nodeVisuals';
import { catalogKey } from './useEditorGraph';
import styles from './Palette.module.scss';

export const PALETTE_DND_TYPE = 'application/x-blueprint-node';
const fold = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

interface Props {
  catalog: BlueprintCatalogEntry[] | undefined;
  loading: boolean;
  disabled: boolean;
  highlightTriggers: boolean;
  /** Guided tour (design §A): pulses the palette item for the step's node key. */
  highlightKey?: string;
  onAdd(entry: BlueprintCatalogEntry): void;
}

// "ADICIONAR NÓ": catalog grouped Gatilhos/Dados/Controle/Ações. Click adds
// the node; dragging drops it where released on the canvas.
export function Palette({ catalog, loading, disabled, highlightTriggers, highlightKey, onAdd }: Props) {
  const t = useTranslations('platformAdmin.blueprints');
  const [query, setQuery] = useState('');

  const groups = useMemo(() => {
    const q = fold(query.trim());
    const matches = (e: BlueprintCatalogEntry) => !q || [e.label, e.key, e.description].some((s) => fold(s).includes(q));
    return KIND_ORDER
      .map((kind) => ({ kind, items: (catalog ?? []).filter((e) => e.kind === kind && matches(e)) }))
      .filter((g) => g.items.length > 0);
  }, [catalog, query]);

  return (
    <aside className={cn(styles.panel, disabled && styles.disabled)} aria-label={t('editor.palette.title')}>
      <div className={styles.title}>{t('editor.palette.title')}</div>
      <div className={styles.search}>
        <Search size={13} aria-hidden className={styles.searchIcon} />
        <Input
          className={styles.searchInput}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('editor.palette.search')}
          aria-label={t('editor.palette.search')}
          disabled={disabled}
        />
      </div>
      {loading && [0, 1, 2, 3].map((i) => <Skeleton key={i} className={styles.skeleton} />)}
      {!loading && groups.length === 0 && <p className={styles.empty}>{t('editor.palette.empty')}</p>}
      {groups.map((g) => (
        <section key={g.kind}>
          <h3 className={styles.group}>{t(`editor.groups.${g.kind}`)}</h3>
          <ul className={styles.items}>
            {g.items.map((e) => (
              <li key={catalogKey(e.key, e.version)}>
                <button
                  type="button"
                  className={cn(
                    styles.item,
                    kindClass(e.kind),
                    highlightTriggers && e.kind === 'trigger' && styles.highlight,
                    highlightKey === e.key && styles.tourHighlight,
                  )}
                  disabled={disabled}
                  draggable={!disabled}
                  onDragStart={(ev) => {
                    ev.dataTransfer.setData(PALETTE_DND_TYPE, catalogKey(e.key, e.version));
                    ev.dataTransfer.effectAllowed = 'move';
                  }}
                  onClick={() => onAdd(e)}
                >
                  <span className={styles.icon}><NodeIcon nodeKey={e.key} kind={e.kind} size={13} /></span>
                  <span className={styles.text}>
                    <span className={styles.name}>{e.label}</span>
                    <span className={styles.desc}>{e.description}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </aside>
  );
}
