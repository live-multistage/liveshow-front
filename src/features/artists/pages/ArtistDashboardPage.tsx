'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Mic2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage, Card, CardContent, CardHeader, CardTitle, Skeleton } from '@live-show/design-system';
import { useMyArtists } from '../hooks/use-artists';
import { ArtistProfileForm } from '../components/ArtistProfileForm';
import { ArtistInvitationsInbox } from '../components/ArtistInvitationsInbox';
import styles from './ArtistDashboardPage.module.scss';

export function ArtistDashboardPage() {
  const t = useTranslations('artists.dashboard');
  const { data: artists, isLoading } = useMyArtists();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className={styles.page}>
        <Skeleton className={styles.skeletonHeader} />
        <Skeleton className={styles.skeletonCard} />
      </div>
    );
  }

  const hasProfiles = !!artists && artists.length > 0;
  const selected = hasProfiles ? artists.find((a) => a.id === selectedId) ?? artists[0] : undefined;

  return (
    <div className={styles.page}>
      <div className={styles.breadcrumb}>
        <span>PAINEL</span>
        <span className={styles.crumbSep}>/</span>
        <span className={styles.crumbCurrent}>ARTISTA</span>
      </div>

      {!hasProfiles ? (
        <Card className={styles.createCard}>
          <CardHeader>
            <div className={styles.createIcon}>
              <Mic2 size={22} />
            </div>
            <CardTitle>{t('profile.create')}</CardTitle>
          </CardHeader>
          <CardContent>
            <ArtistProfileForm />
          </CardContent>
        </Card>
      ) : (
        <>
          {artists.length > 1 && (
            <div className={styles.selector}>
              {artists.map((artist) => (
                <button
                  key={artist.id}
                  type="button"
                  className={`${styles.selectorItem} ${selected?.id === artist.id ? styles.selectorItemActive : ''}`}
                  onClick={() => setSelectedId(artist.id)}
                >
                  <Avatar className={styles.selectorAvatar}>
                    <AvatarImage src={artist.imageUrl} alt={artist.name} />
                    <AvatarFallback>{artist.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  {artist.name}
                </button>
              ))}
            </div>
          )}

          {selected && (
            <div className={styles.grid}>
              <Card>
                <CardHeader>
                  <CardTitle>{t('profile.edit')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <ArtistProfileForm artist={selected} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>{t('invitations.title')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <ArtistInvitationsInbox artistId={selected.id} />
                </CardContent>
              </Card>
            </div>
          )}
        </>
      )}
    </div>
  );
}
