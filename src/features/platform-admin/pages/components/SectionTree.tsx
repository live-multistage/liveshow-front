'use client';

import { useEffect, useRef, type Dispatch, type KeyboardEvent } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import { useTranslations } from 'next-intl';
import { ArrowDown, ArrowUp, Copy, Eye, EyeOff, GripVertical, Lock, Plus, Trash2 } from 'lucide-react';
import { Button } from '@live-show/design-system';
import { PAGE_LIMITS, type PageSection } from '@live-show/api-contracts';
import type { PageEditorAction, SectionIssue } from '../hooks/page-editor-reducer';
import styles from './SectionTree.module.scss';

const ITEM = 'page-section';
const ADD_FOCUS = '__add';

type Translate = ReturnType<typeof useTranslations>;

function summarize(section: PageSection, t: Translate): string {
  switch (section.type) {
    case 'audience': return section.props.text;
    case 'rail': return t(`railSource.${section.props.source.kind}`);
    case 'featured': return section.props.ctaLabel ?? '';
    case 'media': return section.props.alt;
    case 'text': return section.props.title || section.props.paragraphs[0]?.map((run) => run.text).join('') || '—';
    default: return section.props.title || '—';
  }
}

interface RowProps {
  section: PageSection;
  index: number;
  count: number;
  selected: boolean;
  invalid: boolean;
  locked: boolean;
  full: boolean;
  dispatch: Dispatch<PageEditorAction>;
  focusAfter(id: string): void;
}

function SectionRow({ section, index, count, selected, invalid, locked, full, dispatch, focusAfter }: RowProps) {
  const t = useTranslations('platformAdmin.pageEditor');
  const name = t(`sectionTypes.${section.type}`);
  const [, drop] = useDrop<{ id: string }>({
    accept: ITEM,
    canDrop: () => !locked,
    hover: (item) => {
      if (locked || item.id === section.id) return;
      dispatch({ type: 'move', id: item.id, to: index });
    },
  });
  const [{ isDragging }, drag, preview] = useDrag({
    type: ITEM,
    item: { id: section.id },
    canDrag: !locked,
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
  });

  const moveBy = (delta: -1 | 1) => {
    dispatch({ type: 'moveBy', id: section.id, delta });
    focusAfter(section.id);
  };
  const onKeyDown = (event: KeyboardEvent) => {
    if (locked || !event.altKey) return;
    if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;
    event.preventDefault();
    const delta = event.key === 'ArrowUp' ? -1 : 1;
    // No-op at the edges: a pending focus request would otherwise steal focus on a later render.
    if (index + delta < 0 || index + delta >= count) return;
    moveBy(delta);
  };
  const remove = () => {
    focusAfter(ADD_FOCUS);
    dispatch({ type: 'remove', id: section.id });
  };

  const summary = summarize(section, t);
  const className = [styles.row, selected && styles.selected, invalid && styles.invalid, section.hidden && styles.hidden, isDragging && styles.dragging]
    .filter(Boolean).join(' ');

  return (
    <li ref={(node) => { preview(drop(node)); }} data-testid="section-row" data-section-id={section.id} className={className}>
      {/* Pointer-only affordance; keyboard users reorder with the arrow buttons or Alt+↑/↓. */}
      <span ref={(node) => { drag(node); }} className={styles.handle} role="img" aria-label={t('tree.dragHandle')} title={t('tree.dragHandle')}>
        <GripVertical aria-hidden="true" />
      </span>
      <button
        type="button"
        data-select
        className={styles.select}
        aria-pressed={selected}
        aria-invalid={invalid || undefined}
        onClick={() => dispatch({ type: 'select', id: section.id })}
        onKeyDown={onKeyDown}
      >
        <span className={styles.index} aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
        <span className={styles.type}>{name}</span>
        <span className={styles.summary} data-testid="section-summary">
          {section.hidden ? t('tree.hiddenPrefix') : ''}{summary}
        </span>
      </button>
      <div className={styles.actions}>
        <Button type="button" variant="ghost" size="icon" className={styles.iconButton} disabled={locked}
          aria-label={t(section.hidden ? 'tree.show' : 'tree.hide', { name })}
          onClick={() => dispatch({ type: 'toggleHidden', id: section.id })}>
          {section.hidden ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
        </Button>
        <Button type="button" variant="ghost" size="icon" className={styles.iconButton} disabled={locked || index === 0}
          aria-label={t('tree.moveUp', { name })} onClick={() => moveBy(-1)}>
          <ArrowUp aria-hidden="true" />
        </Button>
        <Button type="button" variant="ghost" size="icon" className={styles.iconButton} disabled={locked || index === count - 1}
          aria-label={t('tree.moveDown', { name })} onClick={() => moveBy(1)}>
          <ArrowDown aria-hidden="true" />
        </Button>
        <Button type="button" variant="ghost" size="icon" className={styles.iconButton} disabled={locked || full}
          aria-label={t('tree.duplicate', { name })}
          onClick={() => dispatch({ type: 'duplicate', id: section.id, newId: crypto.randomUUID() })}>
          <Copy aria-hidden="true" />
        </Button>
        <Button type="button" variant="ghost" size="icon" className={`${styles.iconButton} ${styles.remove}`} disabled={locked}
          aria-label={t('tree.remove', { name })} onClick={remove}>
          <Trash2 aria-hidden="true" />
        </Button>
      </div>
    </li>
  );
}

function FixedRow({ label }: { label: string }) {
  const t = useTranslations('platformAdmin.pageEditor');
  return (
    <div className={styles.fixed}>
      <Lock className={styles.lockIcon} aria-hidden="true" />
      <span className={styles.fixedLabel}>{label}</span>
      <span className={styles.global}>{t('tree.global')}</span>
    </div>
  );
}

interface Props {
  sections: PageSection[];
  selectedId: string | null;
  issues: Record<string, SectionIssue[]>;
  /** Draft is stale (conflict): selecting still works, every edit is off. */
  locked: boolean;
  dispatch: Dispatch<PageEditorAction>;
  onAdd(): void;
}

export function SectionTree({ sections, selectedId, issues, locked, dispatch, onAdd }: Props) {
  const t = useTranslations('platformAdmin.pageEditor');
  const rootRef = useRef<HTMLDivElement>(null);
  const pendingFocus = useRef<string | null>(null);
  const full = sections.length >= PAGE_LIMITS.maxSections;
  const hiddenCount = sections.filter((section) => section.hidden).length;

  // Moving and removing re-order or drop DOM nodes, which loses focus; put it back once React has rendered.
  useEffect(() => {
    const target = pendingFocus.current;
    if (!target || !rootRef.current) return;
    pendingFocus.current = null;
    const root = rootRef.current;
    const element = target === ADD_FOCUS
      ? root.querySelector<HTMLElement>('[data-add-section]')
      : root.querySelector<HTMLElement>(`[data-section-id="${target}"] [data-select]`);
    element?.focus();
  });

  return (
    <div ref={rootRef} className={styles.tree}>
      <div className={styles.header}>
        <span>{t('tree.title', { count: sections.length })}</span>
        {hiddenCount > 0 && <span className={styles.hiddenCount}>{t(hiddenCount > 1 ? 'tree.hiddenMany' : 'tree.hiddenOne', { count: hiddenCount })}</span>}
      </div>
      <div className={styles.body}>
        <FixedRow label={t('tree.siteHeader')} />
        {sections.length === 0 ? (
          <p className={styles.empty}>{t('tree.empty')}</p>
        ) : (
          <ul className={styles.list} aria-label={t('tree.aria')}>
            {sections.map((section, index) => (
              <SectionRow
                key={section.id}
                section={section}
                index={index}
                count={sections.length}
                selected={selectedId === section.id}
                invalid={!!issues[section.id]}
                locked={locked}
                full={full}
                dispatch={dispatch}
                focusAfter={(id) => { pendingFocus.current = id; }}
              />
            ))}
          </ul>
        )}
        <FixedRow label={t('tree.siteFooter')} />
      </div>
      <div className={styles.footer}>
        <Button type="button" variant="outline" size="sm" data-add-section disabled={locked || full} onClick={onAdd}>
          <Plus aria-hidden="true" />
          {t('tree.add')}
        </Button>
        <span className={styles.count}>{sections.length}/{PAGE_LIMITS.maxSections}</span>
      </div>
    </div>
  );
}
