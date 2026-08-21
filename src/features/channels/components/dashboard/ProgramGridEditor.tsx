'use client';

import { useMemo, useState } from 'react';
import { Trash2, Plus } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@live-show/design-system';
import { useChannelScheduleQuery } from '../../queries/channel.queries';
import { useDeleteProgramMutation } from '../../mutations/channel.mutations';
import { ProgramForm } from './ProgramForm';
import styles from './ProgramGridEditor.module.scss';

interface Props {
  channelId: string;
  slug: string;
}

const DAYS_AHEAD = 7;

// A grade vem do backend (`/channels/:slug/schedule`), não de uma expansão
// local do RRULE: o fuso do canal e a resolução de conflitos moram lá. Um canal
// ainda em rascunho não tem grade pública — a coluna aparece vazia até publicar.
export function ProgramGridEditor({ channelId, slug }: Props) {
  const t = useTranslations('channels');
  const locale = useLocale();
  const [showForm, setShowForm] = useState(false);
  const deleteProgram = useDeleteProgramMutation(channelId);

  // Sete dias a partir de hoje, em YYYY-MM-DD no fuso local (en-CA já entrega
  // nesse formato, sem passar por UTC e errar o dia por causa do offset).
  const days = useMemo(
    () =>
      Array.from({ length: DAYS_AHEAD }, (_, offset) => {
        const date = new Date();
        date.setDate(date.getDate() + offset);
        return date;
      }),
    [],
  );

  return (
    <section className={styles.section}>
      <header className={styles.header}>
        <h2 className={styles.heading}>{t('dashboard.programs')}</h2>
        <Button size="sm" onClick={() => setShowForm(true)}>
          <Plus size={14} />
          {t('dashboard.newProgram')}
        </Button>
      </header>

      <div className={styles.grid}>
        {days.map((date) => (
          <DayColumn
            key={date.toLocaleDateString('en-CA')}
            slug={slug}
            date={date}
            locale={locale}
            deleteLabel={t('dashboard.delete')}
            onDelete={(programId) => deleteProgram.mutate({ programId, slug })}
          />
        ))}
      </div>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('dashboard.newProgram')}</DialogTitle>
          </DialogHeader>
          <ProgramForm channelId={channelId} slug={slug} onDone={() => setShowForm(false)} />
        </DialogContent>
      </Dialog>
    </section>
  );
}

interface DayColumnProps {
  slug: string;
  date: Date;
  locale: string;
  deleteLabel: string;
  onDelete: (programId: string) => void;
}

function DayColumn({ slug, date, locale, deleteLabel, onDelete }: DayColumnProps) {
  const day = date.toLocaleDateString('en-CA');
  const { data: slots = [] } = useChannelScheduleQuery(slug, day);

  const time = new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' });

  return (
    <div className={styles.column}>
      <div className={styles.columnHeader}>
        <span className={styles.weekday}>
          {new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(date)}
        </span>
        <span className={styles.date}>
          {new Intl.DateTimeFormat(locale, { day: '2-digit', month: '2-digit' }).format(date)}
        </span>
      </div>

      {slots.map((slot) => (
        <div key={`${slot.programId}-${slot.startsAt}`} className={styles.slot}>
          <span className={styles.slotTime}>{time.format(new Date(slot.startsAt))}</span>
          <span className={styles.slotName}>{slot.name}</span>
          <button
            type="button"
            className={styles.slotDelete}
            aria-label={deleteLabel}
            onClick={() => onDelete(slot.programId)}
          >
            <Trash2 size={13} />
          </button>
        </div>
      ))}
    </div>
  );
}
