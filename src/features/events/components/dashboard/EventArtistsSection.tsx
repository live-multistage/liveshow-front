'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { User } from 'lucide-react';
import {
  useEventLineup,
  useArtists,
  useInviteArtistMutation,
  useRemoveArtistFromEventMutation,
  ExternalArtistSearchModal,
  type LineupInvitationStatus,
} from '@/features/artists';
import { Button } from '@/shared/components/Button';
import styles from './EventArtistsSection.module.scss';

interface Props {
  eventId: string;
}

const STATUS_CLASS: Record<LineupInvitationStatus, string> = {
  INVITED: 'pending',
  ACCEPTED: 'accepted',
  DECLINED: 'declined',
};

export function EventArtistsSection({ eventId }: Props) {
  const t = useTranslations('artists');
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [externalSearchOpen, setExternalSearchOpen] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(timer);
  }, [query]);

  const { data: lineup = [], isLoading } = useEventLineup(eventId);
  const { data: catalogData } = useArtists();
  const inviteMutation = useInviteArtistMutation(eventId);
  const removeMutation = useRemoveArtistFromEventMutation(eventId);

  // useArtists resolves to the paginated { items, total } shape; normalize to
  // the array the search filters over.
  const catalog = Array.isArray(catalogData) ? catalogData : catalogData?.items ?? [];
  const invitedIds = new Set(lineup.map((item) => item.artist.id));
  const searchResults = debouncedQuery
    ? catalog.filter(
        (artist) =>
          !invitedIds.has(artist.id) &&
          artist.name.toLowerCase().includes(debouncedQuery.toLowerCase()),
      )
    : [];

  function handleInvite(artistId: string) {
    inviteMutation.mutate(artistId);
    setQuery('');
    setDebouncedQuery('');
  }

  function handleExternalSearchClose() {
    setExternalSearchOpen(false);
    setQuery('');
    setDebouncedQuery('');
  }

  return (
    <div className={styles.section}>
      <h2 className={styles.title}>{t('dashboard.lineup.title')}</h2>

      <div className={styles.searchWrap}>
        <input
          className={styles.searchInput}
          placeholder={t('dashboard.lineup.searchPlaceholder')}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {debouncedQuery && searchResults.length > 0 && (
          <div className={styles.results}>
            {searchResults.map((artist) => (
              <button
                key={artist.id}
                type="button"
                className={styles.resultItem}
                onClick={() => handleInvite(artist.id)}
              >
                {artist.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={artist.imageUrl} alt="" className={styles.resultAvatar} />
                ) : (
                  <span className={styles.resultAvatarPlaceholder}>
                    <User size={14} />
                  </span>
                )}
                <span>{artist.name}</span>
                <span className={styles.resultCta}>{t('dashboard.lineup.inviteCta')}</span>
              </button>
            ))}
          </div>
        )}
        {debouncedQuery.trim().length >= 2 && searchResults.length === 0 && (
          <button
            type="button"
            className={styles.externalSearchAffordance}
            onClick={() => setExternalSearchOpen(true)}
          >
            Não encontrou &ldquo;{debouncedQuery}&rdquo;? Buscar em fontes externas
          </button>
        )}
      </div>

      <ExternalArtistSearchModal
        eventId={eventId}
        initialQuery={debouncedQuery}
        open={externalSearchOpen}
        onClose={handleExternalSearchClose}
      />

      <div className={styles.list}>
        {isLoading && (
          <>
            <div className={styles.skeletonRow} />
            <div className={styles.skeletonRow} />
          </>
        )}
        {!isLoading && lineup.length === 0 && (
          <p className={styles.empty}>{t('dashboard.invitations.empty')}</p>
        )}
        {!isLoading && lineup.map(({ artist, status }) => (
          <div key={artist.id} className={styles.row}>
            {artist.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={artist.imageUrl} alt="" className={styles.rowAvatar} />
            ) : (
              <span className={styles.rowAvatarPlaceholder}>
                <User size={16} />
              </span>
            )}
            <span className={styles.artistName}>{artist.name}</span>
            <span className={`${styles.chip} ${styles[STATUS_CLASS[status]]}`}>
              {status === 'INVITED' && t('dashboard.lineup.statusPending')}
              {status === 'ACCEPTED' && t('dashboard.lineup.statusAccepted')}
              {status === 'DECLINED' && t('dashboard.lineup.statusDeclined')}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => removeMutation.mutate(artist.id)}
              disabled={removeMutation.isPending}
            >
              {t('dashboard.lineup.remove')}
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
