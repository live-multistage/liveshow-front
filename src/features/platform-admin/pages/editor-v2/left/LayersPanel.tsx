'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { ArrowDown, ArrowUp, ChevronDown, ChevronRight, CornerLeftUp, Eye, EyeOff, Save } from 'lucide-react';
import {
  validatePageAgainstProfile, validatePageTreeV2, type ElementType, type PageElement,
} from '@live-show/api-contracts';
import { fromPuckData } from '../puck-data';
import { useBreakpoint } from '../use-breakpoint';
import { buildLayerRows, errorKeysOf } from './layers';
import { useEditContent, usePuck } from './puck-store';
import { useSaveAsBlock } from './SaveAsBlock';
import { idOf, locate, moveElement, setHiddenAt } from './tree-ops';
import { TYPE_ICONS } from './type-icons';
import styles from './left.module.scss';

// Deviation from the prototype (`drag-tree`): Puck's outline cannot host a custom tree, so reordering and re-parenting are buttons
// (up, down, out to the parent); every move goes through the same nesting table as a drop (moveElement).
export function LayersPanel() {
  const t = useTranslations('platformAdmin.pageEditorV2');
  const tBp = useTranslations('platformAdmin.pageEditor.topbar');
  const data = usePuck((s) => s.appState.data);
  const selectedId = usePuck((s) => (s.selectedItem?.props as { id?: string } | undefined)?.id ?? null);
  const dispatch = usePuck((s) => s.dispatch);
  const getSelectorForId = usePuck((s) => s.getSelectorForId);
  const edit = useEditContent();
  const saveAsBlock = useSaveAsBlock();
  const breakpoint = useBreakpoint();
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(new Set());
  const content = data.content as unknown as PageElement[];

  // Errors come from the document the editor would save (Puck's id prefix cleaned); rows are keyed by position.
  const errorKeys = useMemo(() => {
    const doc = fromPuckData(data);
    return errorKeysOf([...validatePageTreeV2(doc), ...validatePageAgainstProfile(doc, 'platform')]);
  }, [data]);
  const rows = useMemo(
    () => buildLayerRows(content, { collapsed, breakpoint, errorKeys, typeLabel: (type: ElementType) => t(`types.${type}`) }),
    [content, collapsed, breakpoint, errorKeys, t],
  );

  const select = (id: string) => dispatch({ type: 'setUi', ui: { itemSelector: getSelectorForId(id) ?? null } });
  const toggle = (id: string) => setCollapsed((prev) => { const next = new Set(prev); if (!next.delete(id)) next.add(id); return next; });
  const move = (id: string, to: 'up' | 'down' | 'out') => edit((current) => {
    const at = locate(current, id);
    if (!at) return null;
    const parentId = at.parent ? idOf(at.parent) : null;
    if (to === 'up') return moveElement(current, id, parentId, at.index - 1);
    if (to === 'down') return moveElement(current, id, parentId, at.index + 2);
    if (!at.parent) return null;
    const outer = locate(current, parentId as string)!;
    return moveElement(current, id, outer.parent ? idOf(outer.parent) : null, outer.index + 1);
  });

  const title = <h3 className={`${styles.groupTitle} ${styles.pad}`}>{t('layers.title')}</h3>;
  if (rows.length === 0) return <div>{title}<p className={styles.none}>{t('layers.empty')}</p></div>;
  return (
    <div>
      {title}
    <ul className={styles.layers} role="tree" aria-label={t('layers.title')}>
      {rows.map((row) => {
        const Icon = TYPE_ICONS[row.type];
        const hasKids = row.hasChildren;
        return (
          <li key={row.id} role="treeitem" aria-selected={selectedId === row.id} aria-expanded={hasKids ? !row.collapsed : undefined}
            className={styles.layer} style={{ '--depth': row.depth } as React.CSSProperties}
            data-selected={selectedId === row.id} data-error={row.error} data-hidden={row.hiddenHere}>
            {hasKids
              ? <button type="button" className={styles.chevron} aria-label={t(row.collapsed ? 'layers.expand' : 'layers.collapse')} onClick={() => toggle(row.id)}>
                {row.collapsed ? <ChevronRight aria-hidden="true" /> : <ChevronDown aria-hidden="true" />}
              </button>
              : <span className={styles.chevronSpacer} />}
            <button type="button" className={styles.layerName} onClick={() => select(row.id)}>
              <Icon aria-hidden="true" /><span>{row.name}</span>
              {row.overrides && <span className={styles.mark} title={t('layers.overrides')}>{row.overrides}</span>}
              {row.error && <span className="sr-only">{t('layers.error')}</span>}
            </button>
            <span className={styles.actions}>
              <button type="button" className={styles.iconBtn} disabled={!row.canUp} aria-label={t('layers.moveUp')} onClick={() => move(row.id, 'up')}><ArrowUp aria-hidden="true" /></button>
              <button type="button" className={styles.iconBtn} disabled={!row.canDown} aria-label={t('layers.moveDown')} onClick={() => move(row.id, 'down')}><ArrowDown aria-hidden="true" /></button>
              <button type="button" className={styles.iconBtn} disabled={!row.canOutdent} aria-label={t('layers.moveOut')} onClick={() => move(row.id, 'out')}><CornerLeftUp aria-hidden="true" /></button>
              {row.saveable && (
                <button type="button" className={styles.iconBtn} aria-label={t('layers.saveAsBlock')} onClick={() => saveAsBlock(locate(content, row.id)!.element)}><Save aria-hidden="true" /></button>
              )}
              <button type="button" className={styles.iconBtn} aria-pressed={row.hiddenHere}
                aria-label={t(row.hiddenHere ? 'layers.show' : 'layers.hide', { bp: tBp(breakpoint) })}
                onClick={() => edit((current) => setHiddenAt(current, row.id, breakpoint, !row.hiddenHere))}>
                {row.hiddenHere ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
              </button>
            </span>
          </li>
        );
      })}
    </ul>
    </div>
  );
}
