'use client';

import { useMemo, useState } from 'react';
import { CalendarRange, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@live-show/design-system';
import { useChannelProgramsQuery } from '../../queries/channel.queries';
import { useDeleteProgramMutation } from '../../mutations/channel.mutations';
import { ROW_HEIGHT, useWeekGrid, type WeekGridBlock } from '../../hooks/useWeekGrid';
import type { ChannelStatus, Program } from '../../types/channel.types';
import { ProgramModal } from './ProgramModal';
import styles from './ChannelDetail.module.scss';

interface Props {
  channelId: string;
  slug: string;
  organizationId: string;
  channelName: string;
  // Fuso DO CANAL, não do navegador: quem administra um canal de Tóquio de
  // São Paulo precisa ver a grade como ela vai ao ar.
  timezone: string;
  status: ChannelStatus;
}

const formatHour = (minutes: number) => `${String(Math.floor(minutes / 60) % 24).padStart(2, '0')}h`;

const formatBlockRange = (block: WeekGridBlock) =>
  `${formatHour(block.startMinutes)} — ${formatHour(block.startMinutes + block.durationMin)}`;

export function ProgramWeekGrid({
  channelId,
  slug,
  organizationId,
  channelName,
  timezone,
  status,
}: Props) {
  const t = useTranslations('channels.detail.schedule');
  const locale = useLocale();
  const [weekOffset, setWeekOffset] = useState(0);
  const [editing, setEditing] = useState<Program | 'new' | null>(null);
  const [deleting, setDeleting] = useState<WeekGridBlock | null>(null);

  const { data: programs = [] } = useChannelProgramsQuery(channelId);
  const deleteProgram = useDeleteProgramMutation(channelId);
  const grid = useWeekGrid(programs, timezone, weekOffset);

  // As âncoras são meio-dia UTC representando datas civis do fuso do canal:
  // formatar em UTC de propósito, senão o fuso local puxaria o dia vizinho.
  const formatters = useMemo(
    () => ({
      weekday: new Intl.DateTimeFormat(locale, { weekday: 'short', timeZone: 'UTC' }),
      dayMonth: new Intl.DateTimeFormat(locale, {
        day: '2-digit',
        month: '2-digit',
        timeZone: 'UTC',
      }),
      range: new Intl.DateTimeFormat(locale, { day: '2-digit', month: 'short', timeZone: 'UTC' }),
    }),
    [locale],
  );

  const weekRange = `${formatters.range.format(grid.days[0].anchor)}–${formatters.range.format(grid.days[6].anchor)}`;

  const confirmDelete = () => {
    if (!deleting) return;
    deleteProgram.mutate({ programId: deleting.programId, slug });
    setDeleting(null);
  };

  return (
    <section className={styles.card}>
      <div className={styles.cardHeader}>
        <div>
          <h2 className={styles.cardTitle}>{t('title')}</h2>
          <p className={styles.cardSubtitle}>{t('subtitle', { range: weekRange, timezone })}</p>
        </div>

        <div className={styles.weekNav}>
          <button
            type="button"
            className={styles.weekNavButton}
            aria-label={t('previousWeek')}
            onClick={() => setWeekOffset((offset) => offset - 1)}
          >
            <ChevronLeft size={13} aria-hidden="true" />
          </button>
          <button
            type="button"
            className={styles.weekNavLabel}
            onClick={() => setWeekOffset(0)}
          >
            {t('thisWeek')}
          </button>
          <button
            type="button"
            className={styles.weekNavButton}
            aria-label={t('nextWeek')}
            onClick={() => setWeekOffset((offset) => offset + 1)}
          >
            <ChevronRight size={13} aria-hidden="true" />
          </button>
        </div>

        <button type="button" className={styles.primaryAction} onClick={() => setEditing('new')}>
          {t('newProgram')}
        </button>
      </div>

      {status !== 'PUBLISHED' && <p className={styles.help}>{t('draftNote')}</p>}

      {grid.blocks.length === 0 ? (
        <div className={styles.gridEmpty}>
          <CalendarRange size={26} aria-hidden="true" />
          <p className={styles.gridEmptyTitle}>{t('emptyTitle')}</p>
          <p className={styles.help}>{t('emptyBody')}</p>
          <button type="button" className={styles.ghostAction} onClick={() => setEditing('new')}>
            {t('emptyCta')}
          </button>
        </div>
      ) : (
        <div className={styles.gridScroll}>
          <div className={styles.grid}>
            <div className={styles.gridCorner} />
            {grid.days.map((day) => (
              <div
                key={day.key}
                className={`${styles.gridDay} ${day.isToday ? styles.gridDayToday : ''}`}
              >
                <span>{formatters.weekday.format(day.anchor)}</span>
                <span className={styles.gridDayDate}>
                  {formatters.dayMonth.format(day.anchor)}
                </span>
              </div>
            ))}

            <div className={styles.gridHours} style={{ height: grid.bodyHeight }}>
              {grid.hours.map((minutes) => (
                <span key={minutes} className={styles.gridHour} style={{ height: ROW_HEIGHT }}>
                  {formatHour(minutes)}
                </span>
              ))}
            </div>

            {grid.days.map((day, column) => (
              <div
                key={day.key}
                className={`${styles.gridColumn} ${day.isToday ? styles.gridColumnToday : ''}`}
                style={{ height: grid.bodyHeight }}
              >
                {grid.hours.map((minutes) => (
                  <span key={minutes} className={styles.gridLine} style={{ height: ROW_HEIGHT }} />
                ))}

                {grid.blocks
                  .filter((block) => block.column === column)
                  .map((block) => (
                    <div
                      key={`${block.programId}-${block.column}`}
                      className={styles.block}
                      style={{ top: block.top, height: block.height }}
                      data-testid="program-block"
                    >
                      <button
                        type="button"
                        className={styles.blockOpen}
                        onClick={() => {
                          const program = programs.find((p) => p.id === block.programId);
                          if (program) setEditing(program);
                        }}
                      >
                        <span className={styles.blockTime}>{formatBlockRange(block)}</span>
                        <span className={styles.blockName}>{block.name}</span>
                      </button>
                      <button
                        type="button"
                        className={styles.blockDelete}
                        aria-label={t('deleteProgram')}
                        onClick={() => setDeleting(block)}
                      >
                        <Trash2 size={12} aria-hidden="true" />
                      </button>
                    </div>
                  ))}
              </div>
            ))}
          </div>
        </div>
      )}

      <ul className={styles.legend}>
        <li className={styles.legendItem}>
          <span className={styles.legendSwatch} />
          {t('legendProgram')}
        </li>
        <li className={styles.legendItem}>
          <span className={`${styles.legendSwatch} ${styles.legendSwatchEmpty}`} />
          {t('legendGap')}
        </li>
      </ul>

      <ProgramModal
        open={editing !== null}
        onOpenChange={(open) => !open && setEditing(null)}
        channelId={channelId}
        slug={slug}
        organizationId={organizationId}
        channelName={channelName}
        timezone={timezone}
        program={editing === 'new' || editing === null ? undefined : editing}
        onDone={() => setEditing(null)}
      />

      <Dialog open={deleting !== null} onOpenChange={(open) => !open && setDeleting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('deleteConfirmTitle', { name: deleting?.name ?? '' })}</DialogTitle>
            <DialogDescription>{t('deleteConfirmBody')}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleting(null)}>
              {t('cancel')}
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              {t('confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
