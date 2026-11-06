'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Drawer } from '@puckeditor/core';
import type { ElementType, PageElement } from '@live-show/api-contracts';
import { BlocksTab } from './BlocksTab';
import { cloneWithNewIds, canNest, insertAt, insertionPoint, type InsertionPoint } from './tree-ops';
import { TYPE_ICONS } from './type-icons';
import { useEditContent, usePuck } from './puck-store';
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
  const edit = useEditContent();
  const pageIsEmpty = content.length === 0;
  // A new page opens on the blocks: that is where "start from a ready block" lives.
  const [tab, setTab] = useState<Tab>(pageIsEmpty ? 'blocks' : 'widgets');
  const [query, setQuery] = useState('');
  const point = useMemo(() => insertionPoint(content, selectedId), [content, selectedId]);

  const insertWidget = (type: ElementType) => dispatch({ type: 'insert', componentType: type, destinationIndex: point.index, destinationZone: point.zone });
  const insertBlock = (element: PageElement) => edit((current) => {
    const at = insertionPoint(current, selectedId);
    return canNest(at.parentType, element.type) ? insertAt(current, at.parentId, at.index, cloneWithNewIds(element)) : null;
  });

  return (
    <div className={styles.panel}>
      <div className={styles.tabs} role="tablist">
        {(['widgets', 'blocks'] as const).map((key) => (
          <button key={key} type="button" role="tab" className={styles.tab} aria-selected={tab === key} onClick={() => setTab(key)}>{t(`add.tabs.${key}`)}</button>
        ))}
      </div>
      {tab === 'widgets'
        ? <WidgetsTab point={point} query={query} onQuery={setQuery} onInsert={insertWidget} />
        : <BlocksTab point={point} pageIsEmpty={pageIsEmpty} onInsert={insertBlock} />}
    </div>
  );
}

interface WidgetsProps { point: InsertionPoint; query: string; onQuery(value: string): void; onInsert(type: ElementType): void }

function WidgetsTab({ point, query, onQuery, onInsert }: WidgetsProps) {
  const t = useTranslations('platformAdmin.pageEditorV2');
  const needle = query.trim().toLowerCase();
  const groups = GROUPS
    .map((group) => ({ ...group, types: group.types.filter((type) => !needle || t(`types.${type}`).toLowerCase().includes(needle)) }))
    .filter((group) => group.types.length > 0);

  // Dimmed means "does not fit where a click would insert"; dragging stays free and the slot's `allow` decides the drop.
  const reason = (type: ElementType) => {
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
                      <button type="button" className={`${styles.widget} ${why ? styles.dim : ''}`} title={why} aria-disabled={!!why}
                        onClick={() => !why && onInsert(type)}>
                        <Icon aria-hidden="true" />{t(`types.${type}`)}
                      </button>
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
