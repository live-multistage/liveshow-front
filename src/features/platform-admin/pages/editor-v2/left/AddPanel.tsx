'use client';

import { useCallback, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Drawer } from '@puckeditor/core';
import type { ElementType, PageElement } from '@live-show/api-contracts';
import { BlocksTab } from './BlocksTab';
import { canNest, insertionPoint, type InsertionPoint } from './tree-ops';
import { TYPE_ICONS } from './type-icons';
import { usePuck } from './puck-store';
import { useInsertBlock, useSelectAt } from './use-insert-block';
import styles from './left.module.scss';

const GROUPS = [
  { key: 'structure', types: ['section', 'columns', 'column', 'group'] },
  { key: 'basic', types: ['heading', 'text', 'label', 'button', 'image', 'divider', 'spacer'] },
  { key: 'content', types: ['video', 'iconList', 'counter', 'faq', 'plan'] },
  { key: 'events', types: ['eventRail', 'featuredEvent', 'liveNow'] },
] as const satisfies readonly { key: string; types: readonly ElementType[] }[];

type Tab = 'widgets' | 'blocks';

export function AddPanel() {
  const t = useTranslations('platformAdmin.pageEditorV2');
  const content = usePuck((s) => s.appState.data.content) as unknown as PageElement[];
  const selectedId = usePuck((s) => (s.selectedItem?.props as { id?: string } | undefined)?.id ?? null);
  const dispatch = usePuck((s) => s.dispatch);
  const insertBlock = useInsertBlock();
  const selectNew = useSelectAt();
  const pageIsEmpty = content.length === 0;
  // A new page opens on the blocks: that is where "start from a ready block" lives.
  const [tab, setTab] = useState<Tab>(pageIsEmpty ? 'blocks' : 'widgets');
  const [query, setQuery] = useState('');
  const pointFor = useCallback((type: ElementType) => insertionPoint(content, selectedId, type), [content, selectedId]);

  const insertWidget = (type: ElementType) => {
    const at = pointFor(type);
    dispatch({ type: 'insert', componentType: type, destinationIndex: at.index, destinationZone: at.zone });
    selectNew(at);
  };
  return (
    <div className={styles.panel}>
      <div className={styles.tabs} role="tablist">
        {(['widgets', 'blocks'] as const).map((key) => (
          <button key={key} type="button" role="tab" className={styles.tab} aria-selected={tab === key} onClick={() => setTab(key)}>{t(`add.tabs.${key}`)}</button>
        ))}
      </div>
      {tab === 'widgets'
        ? <WidgetsTab pointFor={pointFor} query={query} onQuery={setQuery} onInsert={insertWidget} />
        : <BlocksTab pointFor={pointFor} pageIsEmpty={pageIsEmpty} onInsert={insertBlock} />}
    </div>
  );
}

interface WidgetsProps { pointFor(type: ElementType): InsertionPoint; query: string; onQuery(value: string): void; onInsert(type: ElementType): void }

function WidgetsTab({ pointFor, query, onQuery, onInsert }: WidgetsProps) {
  const t = useTranslations('platformAdmin.pageEditorV2');
  const needle = query.trim().toLowerCase();
  const groups = GROUPS
    .map((group) => ({ ...group, types: group.types.filter((type) => !needle || t(`types.${type}`).toLowerCase().includes(needle)) }))
    .filter((group) => group.types.length > 0);

  // Dimmed means "fits nowhere from the selection up to the page"; dragging stays free and the slot's `allow` decides the drop.
  const reason = (type: ElementType) => {
    const point = pointFor(type);
    if (canNest(point.parentType, type)) return undefined;
    return point.parentType === null
      ? t('add.reasonRoot')
      : t('add.reasonParent', { parent: t(`types.${point.parentType}`), child: t(`types.${type}`) });
  };

  return (
    <>
      <label className={styles.search}>
        <input type="search" aria-label={t('add.search')} placeholder={t('add.search')} value={query} onChange={(e) => onQuery(e.target.value)} />
      </label>
      {groups.length === 0 && <p className={styles.none}>{t('add.none')}</p>}
      {groups.map((group) => (
        <section key={group.key} className={styles.group} aria-label={t(`add.groups.${group.key}`)}>
          <h3 className={styles.groupTitle}>
            {t(`add.groups.${group.key}`)}
            {group.key === 'events' && <span className={styles.realData}>{t('add.realData')}</span>}
          </h3>
          <Drawer>
            <div className={styles.widgets}>
              {group.types.map((type) => {
                const Icon = TYPE_ICONS[type];
                const why = reason(type);
                return (
                  <Drawer.Item key={type} name={type} label={t(`types.${type}`)}>
                    {() => (
                      // Not a <button>: the drag sensor never starts from an interactive element, and the Drawer.Item around it is the drag source.
                      <div role="button" tabIndex={0} className={`${styles.widget} ${why ? styles.dim : ''}`} title={why} aria-disabled={!!why}
                        aria-label={t(`types.${type}`)} onClick={() => !why && onInsert(type)}
                        onKeyDown={(e) => {
                          if (e.key !== 'Enter' && e.key !== ' ') return;
                          e.preventDefault();
                          e.stopPropagation();
                          if (!why) onInsert(type);
                        }}>
                        <Icon aria-hidden="true" />{t(`types.${type}`)}
                      </div>
                    )}
                  </Drawer.Item>
                );
              })}
            </div>
          </Drawer>
        </section>
      ))}
    </>
  );
}
