'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Pencil, Trash2 } from 'lucide-react';
import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@live-show/design-system';
import {
  useAdminArtists,
  useArtist,
  useDeleteArtistMutation,
} from '@/features/artists';
import type { AdminArtistListItem } from '@/features/artists';
import { ArtistProfileForm } from '@/features/artists/components/ArtistProfileForm';
import { PlatformPageShell } from './PlatformPageShell';
import styles from './ArtistCatalogPage.module.scss';

const PAGE_SIZE = 50;

// Edit needs the full ArtistResponse (bio, banner, social links) that the
// admin list row doesn't carry — fetch it lazily once the dialog opens
// rather than editing from the partial row (which would wipe those fields
// on save).
function EditArtistForm({ artistId, onSaved }: { artistId: string; onSaved: () => void }) {
  const { data: artist, isLoading } = useArtist(artistId);
  if (isLoading || !artist) return <div className={styles.formLoading}>Carregando…</div>;
  return <ArtistProfileForm artist={artist} onSaved={onSaved} />;
}

export function ArtistCatalogPage() {
  const t = useTranslations('artists.dashboard.catalog');
  const tProfile = useTranslations('artists.dashboard.profile');
  const [page, setPage] = useState(1);
  const { data, isLoading } = useAdminArtists(page);
  const [editingId, setEditingId] = useState<string | 'new' | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminArtistListItem | null>(null);
  const deleteMutation = useDeleteArtistMutation();

  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;

  return (
    <PlatformPageShell
      group="CATÁLOGO"
      title={t('title')}
      actions={<Button onClick={() => setEditingId('new')}>{t('newArtist')}</Button>}
    >
      <div className={styles.tableCard}>
        <div className={styles.tableHeadRow}>
          <div>{t('columns.name')}</div>
          <div>{t('columns.slug')}</div>
          <div>{t('columns.owner')}</div>
          <div>{t('columns.events')}</div>
          <div>{t('columns.status')}</div>
          <div />
        </div>

        {isLoading && <div className={styles.empty}>Carregando…</div>}
        {!isLoading && data?.items.length === 0 && <div className={styles.empty}>{t('empty')}</div>}

        {data?.items.map((artist) => (
          <div className={styles.row} key={artist.id}>
            <div className={styles.nameCell}>
              <div
                className={styles.avatar}
                style={artist.imageUrl ? { backgroundImage: `url(${artist.imageUrl})` } : undefined}
              />
              <span className={styles.name}>{artist.name}</span>
            </div>
            <div className={styles.slug}>@{artist.slug}</div>
            <div className={styles.owner}>{artist.ownerUserId ?? t('noOwner')}</div>
            <div className={styles.events}>{artist.eventCount ?? 0}</div>
            <div>
              <Badge variant={artist.status === 'ACTIVE' ? 'default' : 'secondary'}>{artist.status}</Badge>
            </div>
            <div className={styles.actionsCell}>
              <button
                type="button"
                className={styles.iconButton}
                onClick={() => setEditingId(artist.id)}
                aria-label={tProfile('edit')}
              >
                <Pencil size={15} />
              </button>
              <button
                type="button"
                className={styles.iconButton}
                onClick={() => setDeleteTarget(artist)}
                aria-label={tProfile('delete')}
              >
                <Trash2 size={15} />
              </button>
            </div>
          </div>
        ))}

        {data && totalPages > 1 && (
          <div className={styles.pagination}>
            <button
              type="button"
              className={styles.pageButton}
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              ‹
            </button>
            <span className={styles.pageInfo}>{page} / {totalPages}</span>
            <button
              type="button"
              className={styles.pageButton}
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              ›
            </button>
          </div>
        )}
      </div>

      <Dialog open={editingId !== null} onOpenChange={(open) => !open && setEditingId(null)}>
        <DialogContent className={styles.formDialog}>
          <DialogHeader>
            <DialogTitle>{editingId === 'new' ? tProfile('create') : tProfile('edit')}</DialogTitle>
          </DialogHeader>
          {editingId === 'new' && <ArtistProfileForm onSaved={() => setEditingId(null)} />}
          {editingId !== null && editingId !== 'new' && (
            <EditArtistForm artistId={editingId} onSaved={() => setEditingId(null)} />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={deleteTarget !== null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{tProfile('delete')}</DialogTitle>
          </DialogHeader>
          <p className={styles.confirmBody}>{tProfile('deleteConfirm')}</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              {tProfile('cancel')}
            </Button>
            <Button
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => {
                if (!deleteTarget) return;
                deleteMutation.mutate(deleteTarget.id, { onSuccess: () => setDeleteTarget(null) });
              }}
            >
              {tProfile('delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PlatformPageShell>
  );
}
