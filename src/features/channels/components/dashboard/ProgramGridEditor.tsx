'use client';

import { useMemo, useState } from 'react';
import { Trash2, Plus, Cast } from 'lucide-react';
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
import {
  useChannelProgramsQuery,
  useChannelScheduleQuery,
} from '../../queries/channel.queries';
import { useDeleteProgramMutation } from '../../mutations/channel.mutations';
import type { ChannelStatus, Program, ScheduledSlot } from '../../types/channel.types';
import { dayKeyInTimezone } from '../../utils/rrule';
import { ProgramForm } from './ProgramForm';
import styles from './ProgramGridEditor.module.scss';

interface Props {
  channelId: string;
  slug: string;
  organizationId: string;
  // Fuso DO CANAL, não do navegador: quem administra um canal de Tóquio de
  // São Paulo precisa ver a grade como ela vai ao ar.
  timezone: string;
  status: ChannelStatus;
}

const DAYS_AHEAD = 7;

export function ProgramGridEditor({ channelId, slug, organizationId, timezone, status }: Props) {
  const t = useTranslations('channels');
  const locale = useLocale();
  const [editing, setEditing] = useState<Program | 'new' | null>(null);
  const [deleting, setDeleting] = useState<ScheduledSlot | null>(null);
  const deleteProgram = useDeleteProgramMutation(channelId);
  const { data: programs = [] } = useChannelProgramsQuery(channelId);

  // Sete datas civis a partir de hoje NO FUSO DO CANAL. Cada uma vira uma
  // âncora ao meio-dia UTC: mexer no dia a partir daí não escorrega por causa
  // de horário de verão.
  const days = useMemo(() => {
    const today = dayKeyInTimezone(new Date(), timezone);
    return Array.from({ length: DAYS_AHEAD }, (_, offset) => {
      const anchor = new Date(`${today}T12:00:00Z`);
      anchor.setUTCDate(anchor.getUTCDate() + offset);
      return anchor;
    });
  }, [timezone]);

  const confirmDelete = () => {
    if (!deleting) return;
    deleteProgram.mutate({ programId: deleting.programId, slug });
    setDeleting(null);
  };

  return (
    <section className={styles.section}>
      <header className={styles.header}>
        <h2 className={styles.heading}>{t('dashboard.programs')}</h2>
        <Button size="sm" onClick={() => setEditing('new')}>
          <Plus size={14} />
          {t('dashboard.newProgram')}
        </Button>
      </header>

      {status !== 'PUBLISHED' && (
        <p className={styles.note}>{t('dashboard.draftScheduleNote')}</p>
      )}

      <div className={styles.grid}>
        {days.map((anchor) => (
          <DayColumn
            key={anchor.toISOString()}
            slug={slug}
            anchor={anchor}
            locale={locale}
            timezone={timezone}
            deleteLabel={t('dashboard.delete')}
            onEdit={(slot) => {
              const program = programs.find((p) => p.id === slot.programId);
              if (program) setEditing(program);
            }}
            onDelete={setDeleting}
          />
        ))}
      </div>

      <Dialog open={editing !== null} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {t(editing === 'new' ? 'dashboard.newProgram' : 'dashboard.editProgram')}
            </DialogTitle>
          </DialogHeader>
          {editing !== null && (
            <ProgramForm
              channelId={channelId}
              slug={slug}
              organizationId={organizationId}
              timezone={timezone}
              program={editing === 'new' ? undefined : editing}
              onDone={() => setEditing(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={deleting !== null} onOpenChange={(open) => !open && setDeleting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {t('dashboard.deleteProgramTitle', { name: deleting?.name ?? '' })}
            </DialogTitle>
            <DialogDescription>{t('dashboard.deleteProgramBody')}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleting(null)}>
              {t('dashboard.cancel')}
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              {t('dashboard.confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}

interface DayColumnProps {
  slug: string;
  anchor: Date;
  locale: string;
  timezone: string;
  deleteLabel: string;
  onEdit: (slot: ScheduledSlot) => void;
  onDelete: (slot: ScheduledSlot) => void;
}

function DayColumn({
  slug,
  anchor,
  locale,
  timezone,
  deleteLabel,
  onEdit,
  onDelete,
}: DayColumnProps) {
  const t = useTranslations('channels');
  // A âncora é meio-dia UTC representando uma data civil: o rótulo lê essa data
  // em UTC de propósito, senão o fuso do canal a puxaria para o dia vizinho.
  const day = anchor.toISOString().slice(0, 10);
  const { data: slots = [] } = useChannelScheduleQuery(slug, day);

  const time = new Intl.DateTimeFormat(locale, {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: timezone,
  });

  return (
    <div className={styles.column}>
      <div className={styles.columnHeader}>
        <span className={styles.weekday}>
          {new Intl.DateTimeFormat(locale, { weekday: 'short', timeZone: 'UTC' }).format(anchor)}
        </span>
        <span className={styles.date}>
          {new Intl.DateTimeFormat(locale, {
            day: '2-digit',
            month: '2-digit',
            timeZone: 'UTC',
          }).format(anchor)}
        </span>
      </div>

      {slots.map((slot) => (
        <div key={`${slot.programId}-${slot.startsAt}`} className={styles.slot}>
          <button type="button" className={styles.slotOpen} onClick={() => onEdit(slot)}>
            <span className={styles.slotTime}>{time.format(new Date(slot.startsAt))}</span>
            <span className={styles.slotName}>{slot.name}</span>
            {slot.event && (
              <Cast
                size={12}
                className={styles.slotEventIcon}
                aria-label={t('dashboard.linkedEvent', { title: slot.event.title })}
              />
            )}
          </button>
          <button
            type="button"
            className={styles.slotDelete}
            aria-label={deleteLabel}
            onClick={() => onDelete(slot)}
          >
            <Trash2 size={13} />
          </button>
        </div>
      ))}
    </div>
  );
}
