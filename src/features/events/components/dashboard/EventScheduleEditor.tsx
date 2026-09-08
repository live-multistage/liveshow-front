'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { ArrowUp, ArrowDown, Trash2, Plus } from 'lucide-react';
import { Button, Input, SimpleCustomSelect } from '@live-show/design-system';
import type { SelectOption } from '@live-show/design-system';
import type { EventScheduleItem, EventScheduleItemInput, ScheduleItemKind } from '@live-show/api-contracts';
import { useEventSchedule } from '../../hooks/use-event-schedule';
import { useReplaceEventScheduleMutation } from '../../mutations/schedule.mutations';
import { useEventLineup } from '@/features/artists';
import styles from './EventScheduleEditor.module.scss';

const TIME_RE = /^([01]?\d|2[0-3]):[0-5]\d$/;

interface Block {
  tempId: string;
  startTime: string;
  endTime: string;
  kind: ScheduleItemKind;
  artistId: string;
  title: string;
  description: string;
}

let seq = 0;
function nextTempId() {
  seq += 1;
  return `block-${seq}`;
}

function toBlock(item: EventScheduleItem): Block {
  return {
    tempId: item.id ?? nextTempId(),
    startTime: item.startTime,
    endTime: item.endTime ?? '',
    kind: item.kind,
    artistId: item.artist?.id ?? '',
    title: item.title ?? '',
    description: item.description ?? '',
  };
}

function emptyBlock(): Block {
  return {
    tempId: nextTempId(),
    startTime: '',
    endTime: '',
    kind: 'ARTIST',
    artistId: '',
    title: '',
    description: '',
  };
}

interface BlockErrors {
  startTime?: string;
  endTime?: string;
  artistId?: string;
  title?: string;
}

function validateBlock(block: Block, t: (key: string) => string): BlockErrors {
  const errors: BlockErrors = {};
  if (!block.startTime) errors.startTime = t('errStartRequired');
  else if (!TIME_RE.test(block.startTime)) errors.startTime = t('errStartInvalid');

  if (block.endTime && !TIME_RE.test(block.endTime)) errors.endTime = t('errEndInvalid');

  if (block.kind === 'ARTIST' && !block.artistId) errors.artistId = t('errArtistRequired');
  if (block.kind === 'SEGMENT' && !block.title.trim()) errors.title = t('errSegmentRequired');

  return errors;
}

function toInput(block: Block): EventScheduleItemInput {
  return {
    startTime: block.startTime,
    endTime: block.endTime || null,
    kind: block.kind,
    artistId: block.kind === 'ARTIST' ? block.artistId : null,
    title: block.kind === 'SEGMENT' ? block.title.trim() : null,
    description: block.description.trim() || null,
  };
}

interface Props {
  eventId: string;
}

export function EventScheduleEditor({ eventId }: Props) {
  const t = useTranslations('createEvent.schedule');
  const { data: schedule } = useEventSchedule(eventId);
  const { data: lineup = [] } = useEventLineup(eventId);
  const replaceMutation = useReplaceEventScheduleMutation(eventId);

  const [blocks, setBlocks] = useState<Block[]>([]);
  const [dirty, setDirty] = useState(false);

  // Seed local state from the loaded schedule. Depend on `schedule` itself
  // (a stable reference once React Query resolves) — never a `= []` default,
  // which is a fresh array every render and would loop setState → re-render.
  useEffect(() => {
    if (!schedule) return;
    setBlocks(schedule.map(toBlock));
    setDirty(false);
  }, [schedule]);

  // Any invited lineup member the org can schedule (INVITED or ACCEPTED) — only
  // a declined invite is excluded. Matches the backend: waiting for the artist
  // to accept before they can be slotted would block planning.
  const artistOptions: SelectOption[] = lineup
    .filter((item) => item.status !== 'DECLINED')
    .map((item) => ({ value: item.artist.id, label: item.artist.name }));

  function updateBlock(tempId: string, patch: Partial<Block>) {
    setBlocks((prev) => prev.map((b) => (b.tempId === tempId ? { ...b, ...patch } : b)));
    setDirty(true);
  }

  function addBlock() {
    setBlocks((prev) => [...prev, emptyBlock()]);
    setDirty(true);
  }

  function removeBlock(tempId: string) {
    setBlocks((prev) => prev.filter((b) => b.tempId !== tempId));
    setDirty(true);
  }

  function moveBlock(index: number, direction: -1 | 1) {
    setBlocks((prev) => {
      const next = [...prev];
      const target = index + direction;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
    setDirty(true);
  }

  function cancel() {
    setBlocks((schedule ?? []).map(toBlock));
    setDirty(false);
  }

  const blockErrors = blocks.map((b) => validateBlock(b, t));
  const pendingCount = blockErrors.filter((e) => Object.keys(e).length > 0).length;
  const canSave = blocks.length > 0 && pendingCount === 0;

  function save() {
    if (!canSave) return;
    replaceMutation.mutate(blocks.map(toInput), { onSuccess: () => setDirty(false) });
  }

  return (
    <div className={styles.section}>
      <div className={styles.header}>
        <div>
          <h2 className={styles.title}>{t('title')}</h2>
          <p className={styles.subtitle}>{t('subtitle')}</p>
        </div>
        <span className={`${styles.dirtyBadge} ${dirty ? styles.dirtyBadgeOn : ''}`}>
          {dirty ? t('dirty') : t('clean')}
        </span>
      </div>

      <div className={styles.list}>
        {blocks.length === 0 && <div className={styles.empty}>{t('empty')}</div>}

        {blocks.map((block, index) => {
          const errors = blockErrors[index];
          return (
            <div key={block.tempId} className={styles.block}>
              <div className={styles.blockTop}>
                <div className={styles.reorder}>
                  <button
                    type="button"
                    className={styles.reorderBtn}
                    disabled={index === 0}
                    onClick={() => moveBlock(index, -1)}
                    aria-label="up"
                  >
                    <ArrowUp size={13} />
                  </button>
                  <button
                    type="button"
                    className={styles.reorderBtn}
                    disabled={index === blocks.length - 1}
                    onClick={() => moveBlock(index, 1)}
                    aria-label="down"
                  >
                    <ArrowDown size={13} />
                  </button>
                </div>
                <span className={styles.blockLabel}>
                  {t('blockLabel')} {String(index + 1).padStart(2, '0')}
                </span>
                <div className={styles.typeToggle}>
                  <button
                    type="button"
                    className={`${styles.typeBtn} ${block.kind === 'ARTIST' ? styles.typeBtnActive : ''}`}
                    onClick={() => updateBlock(block.tempId, { kind: 'ARTIST' })}
                  >
                    {t('typeArtist')}
                  </button>
                  <button
                    type="button"
                    className={`${styles.typeBtn} ${block.kind === 'SEGMENT' ? styles.typeBtnActive : ''}`}
                    onClick={() => updateBlock(block.tempId, { kind: 'SEGMENT' })}
                  >
                    {t('typeSegment')}
                  </button>
                </div>
                <button
                  type="button"
                  className={styles.removeBtn}
                  onClick={() => removeBlock(block.tempId)}
                  aria-label="remove"
                >
                  <Trash2 size={14} />
                </button>
              </div>

              <div className={styles.blockGrid}>
                <div className={styles.field}>
                  <label className={styles.fieldLabel}>{t('startLabel')} *</label>
                  <Input
                    className={`${styles.timeInput} ${errors.startTime ? styles.inputError : ''}`}
                    placeholder="HH:MM"
                    value={block.startTime}
                    onChange={(e) => updateBlock(block.tempId, { startTime: e.target.value })}
                  />
                </div>
                <div className={styles.field}>
                  <label className={styles.fieldLabel}>{t('endLabel')}</label>
                  <Input
                    className={`${styles.timeInput} ${errors.endTime ? styles.inputError : ''}`}
                    placeholder={t('endPlaceholder')}
                    value={block.endTime}
                    onChange={(e) => updateBlock(block.tempId, { endTime: e.target.value })}
                  />
                </div>
                <div className={styles.field}>
                  {block.kind === 'ARTIST' ? (
                    <>
                      <label className={styles.fieldLabel}>{t('artistLabel')} *</label>
                      <SimpleCustomSelect
                        value={block.artistId}
                        onValueChange={(value) => updateBlock(block.tempId, { artistId: value })}
                        placeholder={t('artistPlaceholder')}
                        options={artistOptions}
                      />
                    </>
                  ) : (
                    <>
                      <label className={styles.fieldLabel}>{t('segmentLabel')} *</label>
                      <Input
                        value={block.title}
                        placeholder={t('segmentPlaceholder')}
                        onChange={(e) => updateBlock(block.tempId, { title: e.target.value })}
                      />
                    </>
                  )}
                </div>
              </div>

              <Input
                className={styles.descInput}
                placeholder={t('descPlaceholder')}
                value={block.description}
                onChange={(e) => updateBlock(block.tempId, { description: e.target.value })}
              />

              {(errors.startTime || errors.endTime || errors.artistId || errors.title) && (
                <p className={styles.blockError}>
                  {errors.startTime ?? errors.endTime ?? errors.artistId ?? errors.title}
                </p>
              )}
            </div>
          );
        })}

        <button type="button" className={styles.addBlock} onClick={addBlock}>
          <Plus size={14} /> {t('addBlock')}
        </button>
      </div>

      <div className={styles.footer}>
        {pendingCount > 0 && (
          <span className={styles.pendingLabel}>
            {pendingCount} {t('blockLabel').toUpperCase()}(S) …
          </span>
        )}
        <span className={styles.footerSpacer} />
        <Button type="button" variant="ghost" onClick={cancel} disabled={!dirty}>
          {t('cancel')}
        </Button>
        <Button type="button" onClick={save} disabled={!canSave || replaceMutation.isPending}>
          {replaceMutation.isPending ? t('saving') : t('save')}
        </Button>
      </div>
    </div>
  );
}
