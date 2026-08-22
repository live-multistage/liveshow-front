'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Video, Ticket } from 'lucide-react';
import { useTranslations } from 'next-intl';
import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@live-show/design-system';
import { SeriesForm } from './SeriesForm';
import { EpisodesTable } from './EpisodesTable';
import { SeasonPassProducts } from './SeasonPassProducts';
import { useSeriesQuery, useOrgSeriesQuery } from '../../queries/series.queries';
import {
  usePauseSeriesMutation,
  useResumeSeriesMutation,
  useEndSeriesMutation,
  useMaterializeSeriesMutation,
} from '../../mutations/series.mutations';
import styles from './SeriesDetailContent.module.scss';

interface Props {
  slug: string;
}

export function SeriesDetailContent({ slug }: Props) {
  const t = useTranslations('series');
  const tCommon = useTranslations('common');
  const { data: series, isLoading } = useSeriesQuery(slug);
  // templateEventId is org-only now (dropped from the public GET /series/:slug
  // this page otherwise reads from) — fetch it from the org list instead.
  const { data: orgSeries } = useOrgSeriesQuery(series?.organizationId ?? '', {
    enabled: !!series?.organizationId,
  });
  const templateEventId = orgSeries?.find((s) => s.slug === slug)?.templateEventId;
  const pause = usePauseSeriesMutation();
  const resume = useResumeSeriesMutation();
  const end = useEndSeriesMutation();
  const materialize = useMaterializeSeriesMutation();
  const [editing, setEditing] = useState(false);
  // Encerrar é irreversível (EndSeriesUseCase é terminal) — confirma antes,
  // igual ao delete de programa do canal (ProgramGridEditor).
  const [confirmingEnd, setConfirmingEnd] = useState(false);

  if (!series)
    return <p className={styles.state}>{tCommon(isLoading ? 'loading' : 'notFound')}</p>;

  // The three lifecycle mutations invalidate by organizationId + slug, same
  // as the channels dashboard's target object.
  const target = { id: series.id, organizationId: series.organizationId, slug: series.slug };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.identity}>
          <h1 className={styles.name}>{series.name}</h1>
          <Badge variant="outline">{t(`dashboard.status.${series.status}`)}</Badge>
        </div>

        <div className={styles.actions}>
          <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
            {t('dashboard.edit')}
          </Button>
          {series.status === 'ACTIVE' && (
            <Button
              size="sm"
              variant="outline"
              disabled={pause.isPending}
              onClick={() => pause.mutate(target)}
            >
              {t('dashboard.pause')}
            </Button>
          )}
          {series.status === 'PAUSED' && (
            <Button size="sm" disabled={resume.isPending} onClick={() => resume.mutate(target)}>
              {t('dashboard.resume')}
            </Button>
          )}
          {series.status !== 'ENDED' && (
            <Button
              size="sm"
              variant="outline"
              disabled={end.isPending}
              onClick={() => setConfirmingEnd(true)}
            >
              {t('dashboard.end')}
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            disabled={materialize.isPending}
            onClick={() => materialize.mutate(target)}
          >
            {t('dashboard.materialize')}
          </Button>
          {/* O modelo (template Event) fica fora de qualquer listagem — quem
              administra a série chega nele só por aqui, com o nome da série
              junto na URL igual ao canal faz com o broadcastEventId. */}
          {templateEventId && (
            <>
              <Link
                className={styles.link}
                href={`/dashboard/streams?eventId=${templateEventId}&title=${encodeURIComponent(series.name)}`}
              >
                <Video size={14} />
                {t('dashboard.configureCameras')}
              </Link>
              <Link className={styles.link} href={`/dashboard/events/${templateEventId}`}>
                <Ticket size={14} />
                {t('dashboard.templateTickets')}
              </Link>
            </>
          )}
        </div>
      </header>

      <EpisodesTable seriesId={series.id} />
      {templateEventId && (
        <SeasonPassProducts seriesId={series.id} templateEventId={templateEventId} />
      )}

      <Dialog open={editing} onOpenChange={setEditing}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('dashboard.edit')}</DialogTitle>
          </DialogHeader>
          <SeriesForm mode="edit" initial={series} onDone={() => setEditing(false)} />
        </DialogContent>
      </Dialog>

      <Dialog open={confirmingEnd} onOpenChange={setConfirmingEnd}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('dashboard.endTitle')}</DialogTitle>
            <DialogDescription>{t('dashboard.endBody')}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmingEnd(false)}>
              {t('dashboard.cancel')}
            </Button>
            <Button
              variant="destructive"
              disabled={end.isPending}
              onClick={() => {
                end.mutate(target);
                setConfirmingEnd(false);
              }}
            >
              {t('dashboard.confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
