'use client';

import { useRef } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import { useTranslations } from 'next-intl';
import { ArrowDown, ArrowUp, GripVertical, Plus, Trash2 } from 'lucide-react';
import {
  Button, buttonVariants, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@live-show/design-system';
import { MAILING_LIMITS, type MailingBlock, type MailingBlockType } from '@live-show/api-contracts';
import { BLOCK_TYPES } from '../utils/block-defaults';
import styles from './BlockList.module.scss';

const ITEM = 'mailing-block';

function summarize(block: MailingBlock | undefined): string {
  switch (block?.type) {
    case 'heading': return block.text;
    case 'text': return block.paragraphs?.[0]?.map((run) => run.text).join('') ?? '';
    case 'button': return block.label;
    case 'image': return block.alt;
    default: return '';
  }
}

interface RowProps {
  index: number;
  count: number;
  type: MailingBlockType;
  summary: string;
  invalid: boolean;
  selected: boolean;
  onSelect(): void;
  onDrag(from: number, to: number): void;
  onMoveBy(delta: -1 | 1): void;
  onRemove(): void;
}

function BlockRow({ index, count, type, summary, invalid, selected, onSelect, onDrag, onMoveBy, onRemove }: RowProps) {
  const t = useTranslations('platformAdmin.mailing');
  const [, drop] = useDrop<{ index: number }>({
    accept: ITEM,
    hover: (item) => {
      if (item.index === index) return;
      onDrag(item.index, index);
      item.index = index;
    },
  });
  const [{ isDragging }, drag, preview] = useDrag({ type: ITEM, item: { index }, collect: (m) => ({ isDragging: m.isDragging() }) });
  const className = [styles.row, selected && styles.selected, invalid && styles.invalid, isDragging && styles.dragging]
    .filter(Boolean).join(' ');

  return (
    <li ref={(node) => { preview(drop(node)); }} data-testid="block-row" className={className}>
      {/* Pointer-only affordance; keyboard users reorder with ↑/↓. */}
      <span ref={(node) => { drag(node); }} className={styles.handle} role="img" aria-label={t('editor.dragHandle')} title={t('editor.dragHandle')}>
        <GripVertical aria-hidden="true" />
      </span>
      <button type="button" data-select className={styles.select} aria-pressed={selected} onClick={onSelect}>
        <span className={styles.index} aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
        <span className={styles.type}>{t(`editor.block.${type}`)}</span>
        {summary && <span className={styles.summary}>{summary}</span>}
      </button>
      <div className={styles.actions}>
        <Button type="button" variant="ghost" size="icon" className={styles.iconButton} data-move="up"
          aria-label={t('editor.moveUp')} disabled={index === 0} onClick={() => onMoveBy(-1)}>
          <ArrowUp aria-hidden="true" />
        </Button>
        <Button type="button" variant="ghost" size="icon" className={styles.iconButton} data-move="down"
          aria-label={t('editor.moveDown')} disabled={index === count - 1} onClick={() => onMoveBy(1)}>
          <ArrowDown aria-hidden="true" />
        </Button>
        <Button type="button" variant="ghost" size="icon" className={`${styles.iconButton} ${styles.remove}`}
          aria-label={t('editor.remove')} onClick={onRemove}>
          <Trash2 aria-hidden="true" />
        </Button>
      </div>
    </li>
  );
}

interface Props {
  fields: Array<{ id: string; type: MailingBlockType }>;
  /** Live block values, for the one-line summary of each row. */
  values?: MailingBlock[];
  /** Rows with validation errors get highlighted. */
  invalid?: boolean[];
  selected: number | null;
  onSelect(index: number): void;
  onAdd(type: MailingBlockType): void;
  onMove(from: number, to: number): void;
  onRemove(index: number): void;
}

export function BlockList({ fields, values = [], invalid = [], selected, onSelect, onAdd, onMove, onRemove }: Props) {
  const t = useTranslations('platformAdmin.mailing');
  const rootRef = useRef<HTMLDivElement>(null);
  const full = fields.length >= MAILING_LIMITS.maxBlocks;

  // Re-ordering and removal move/drop DOM nodes, which loses focus; put it back
  // on the equivalent control so keyboard reordering can continue.
  const rowAt = (i: number) => rootRef.current?.querySelectorAll<HTMLElement>('[data-testid="block-row"]')[i];
  const focusAfterRender = (find: () => HTMLElement | null | undefined) => requestAnimationFrame(() => find()?.focus());

  const moveBy = (index: number, delta: -1 | 1) => {
    const to = index + delta;
    onMove(index, to);
    focusAfterRender(() =>
      rowAt(to)?.querySelector<HTMLElement>(`[data-move="${delta < 0 ? 'up' : 'down'}"]:not(:disabled)`)
      ?? rowAt(to)?.querySelector<HTMLElement>('[data-move]:not(:disabled)'));
  };
  const remove = (index: number) => {
    onRemove(index);
    focusAfterRender(() =>
      rowAt(Math.min(index, fields.length - 2))?.querySelector<HTMLElement>('[data-select]')
      ?? rootRef.current?.querySelector<HTMLElement>('[data-add-block]'));
  };

  return (
    <div ref={rootRef} className={styles.blocks}>
      {fields.length === 0 ? (
        <p className={styles.empty}>{t('editor.blocksEmpty')}</p>
      ) : (
        <ol className={styles.list}>
          {fields.map((field, index) => (
            <BlockRow
              key={field.id}
              index={index}
              count={fields.length}
              type={field.type}
              summary={summarize(values[index])}
              invalid={!!invalid[index]}
              selected={selected === index}
              onSelect={() => onSelect(index)}
              onDrag={onMove}
              onMoveBy={(delta) => moveBy(index, delta)}
              onRemove={() => remove(index)}
            />
          ))}
        </ol>
      )}
      <div className={styles.footer}>
        <DropdownMenu>
          <DropdownMenuTrigger data-add-block className={`${buttonVariants({ variant: 'outline' })} ${styles.add}`} disabled={full}>
            <Plus aria-hidden="true" />
            {t('editor.addBlock')}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {BLOCK_TYPES.map((type) => (
              <DropdownMenuItem key={type} onSelect={() => onAdd(type)}>{t(`editor.block.${type}`)}</DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <span className={styles.count}>{fields.length}/{MAILING_LIMITS.maxBlocks}</span>
      </div>
    </div>
  );
}
