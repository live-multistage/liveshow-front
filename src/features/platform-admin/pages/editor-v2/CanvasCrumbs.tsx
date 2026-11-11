'use client';

import { Fragment } from 'react';
import { useTranslations } from 'next-intl';
import type { ElementType, PageElement } from '@live-show/api-contracts';
import { usePuck } from './left/puck-store';
import { idOf, pathTo } from './left/tree-ops';
import styles from './PageEditorV2.module.scss';

/** PÁGINA › SEÇÃO › COLUNAS › … : each step selects that ancestor; PÁGINA clears the selection. */
export function CanvasCrumbs() {
  const t = useTranslations('platformAdmin.pageEditorV2');
  const content = usePuck((s) => s.appState.data.content) as unknown as PageElement[];
  const selectedId = usePuck((s) => (s.selectedItem?.props as { id?: string } | undefined)?.id ?? null);
  const dispatch = usePuck((s) => s.dispatch);
  const getSelectorForId = usePuck((s) => s.getSelectorForId);
  const path = selectedId ? pathTo(content, selectedId) : [];

  const select = (id: string | null) =>
    dispatch({ type: 'setUi', ui: { itemSelector: id ? getSelectorForId(id) ?? null : null } });

  return (
    <nav className={styles.crumbs} aria-label={t('canvas.crumbs')}>
      <button type="button" className={path.length === 0 ? styles.crumbCurrent : undefined} onClick={() => select(null)}>{t('canvas.page')}</button>
      {path.map((element, i) => (
        <Fragment key={idOf(element)}>
          <span aria-hidden="true">›</span>
          <button type="button" className={i === path.length - 1 ? styles.crumbCurrent : undefined}
            aria-current={i === path.length - 1 ? 'true' : undefined} onClick={() => select(idOf(element))}>
            {t(`types.${element.type as ElementType}`).toUpperCase()}
          </button>
        </Fragment>
      ))}
    </nav>
  );
}
