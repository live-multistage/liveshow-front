'use client';

import { useEffect, useState } from 'react';
import { X, User, ArrowLeft, ExternalLink, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { ExternalArtistCandidate } from '@live-show/api-contracts';
import { useExternalArtistSearch } from '../hooks/use-artists';
import { useCreateArtistFromExternalMutation, useInviteArtistMutation } from '../mutations/artist.mutations';
import styles from './ExternalArtistSearchModal.module.scss';

interface Props {
  eventId: string;
  initialQuery: string;
  open: boolean;
  onClose: () => void;
  onArtistReady?: (artist: { id: string; name: string }) => void;
}

const SOURCE_LABEL: Record<'spotify' | 'wikidata', string> = {
  spotify: 'SPOTIFY',
  wikidata: 'WIKIDATA',
};

export function ExternalArtistSearchModal({ eventId, initialQuery, open, onClose, onArtistReady }: Props) {
  const [query, setQuery] = useState(initialQuery);
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery);
  const [selected, setSelected] = useState<ExternalArtistCandidate | null>(null);

  const inviteMutation = useInviteArtistMutation(eventId);
  const createMutation = useCreateArtistFromExternalMutation();

  useEffect(() => {
    if (!open) return;
    setQuery(initialQuery);
    setDebouncedQuery(initialQuery);
    setSelected(null);
  }, [open, initialQuery]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(timer);
  }, [query]);

  const { data, isFetching } = useExternalArtistSearch(debouncedQuery);

  if (!open) return null;

  function handleClose() {
    setSelected(null);
    onClose();
  }

  function handleUseLocal(artist: { id: string; name: string }) {
    inviteMutation.mutate(artist.id, {
      onSuccess: () => {
        onArtistReady?.(artist);
        handleClose();
      },
    });
  }

  async function handleCreateAndInvite() {
    if (!selected) return;
    try {
      const artist = await createMutation.mutateAsync({
        source: selected.source,
        externalId: selected.externalId,
        name: selected.name,
      });
      await inviteMutation.mutateAsync(artist.id);
      toast.success('Artista adicionado ao lineup (pendente)');
      onArtistReady?.(artist);
      handleClose();
    } catch {
      // errors already toasted by the mutations
    }
  }

  const candidates = data?.candidates ?? [];
  const localMatches = data?.localMatches ?? [];
  const isCreating = createMutation.isPending || inviteMutation.isPending;

  return (
    <>
      <div className={styles.overlay} onClick={handleClose} />
      <div className={styles.modal} role="dialog" aria-modal="true" aria-label="Buscar artista">
        <div className={styles.header}>
          <div className={styles.headerTop}>
            <span className={styles.title}>Buscar artista</span>
            <span className={styles.badge}>FONTES EXTERNAS</span>
          </div>
          <button className={styles.closeBtn} onClick={handleClose} type="button" aria-label="Fechar">
            <X size={16} />
          </button>
        </div>

        {selected ? (
          <ConfirmPhase
            candidate={selected}
            isPending={isCreating}
            onBack={() => setSelected(null)}
            onConfirm={handleCreateAndInvite}
          />
        ) : (
          <SearchPhase
            query={query}
            onQueryChange={setQuery}
            isFetching={isFetching}
            hasQuery={debouncedQuery.trim().length >= 2}
            candidates={candidates}
            localMatches={localMatches}
            onUseLocal={handleUseLocal}
            onSelectCandidate={setSelected}
            isInviting={inviteMutation.isPending}
          />
        )}
      </div>
    </>
  );
}

interface SearchPhaseProps {
  query: string;
  onQueryChange: (q: string) => void;
  isFetching: boolean;
  hasQuery: boolean;
  candidates: ExternalArtistCandidate[];
  localMatches: { id: string; name: string; imageUrl?: string }[];
  onUseLocal: (artist: { id: string; name: string }) => void;
  onSelectCandidate: (candidate: ExternalArtistCandidate) => void;
  isInviting: boolean;
}

function SearchPhase({
  query,
  onQueryChange,
  isFetching,
  hasQuery,
  candidates,
  localMatches,
  onUseLocal,
  onSelectCandidate,
  isInviting,
}: SearchPhaseProps) {
  return (
    <>
      <div className={styles.searchBar}>
        <input
          className={styles.searchInput}
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Buscar por nome do artista…"
          autoFocus
        />
        <div className={styles.legend}>
          <span className={styles.legendItem}>
            <span className={`${styles.dot} ${styles.dotSpotify}`} /> SPOTIFY
          </span>
          <span className={styles.legendItem}>
            <span className={`${styles.dot} ${styles.dotWikidata}`} /> WIKIDATA
          </span>
        </div>
      </div>

      <div className={styles.body}>
        {!hasQuery && <p className={styles.hint}>Digite ao menos 2 caracteres para buscar.</p>}

        {hasQuery && isFetching && (
          <>
            <p className={styles.loadingLabel}>BUSCANDO EM SPOTIFY · WIKIDATA…</p>
            <div className={styles.grid}>
              {[0, 1, 2].map((i) => (
                <div key={i} className={styles.skeletonCard} />
              ))}
            </div>
          </>
        )}

        {hasQuery && !isFetching && localMatches.length > 0 && (
          <div className={styles.localBanner}>
            <span className={styles.localBannerTitle}>JÁ ESTÁ NO CATÁLOGO</span>
            {localMatches.map((artist) => (
              <div key={artist.id} className={styles.localRow}>
                {artist.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={artist.imageUrl} alt="" className={styles.localAvatar} />
                ) : (
                  <span className={styles.localAvatarPlaceholder}>
                    <User size={14} />
                  </span>
                )}
                <span className={styles.localName}>{artist.name}</span>
                <button
                  type="button"
                  className={styles.useLocalBtn}
                  onClick={() => onUseLocal(artist)}
                  disabled={isInviting}
                >
                  Usar este
                </button>
              </div>
            ))}
          </div>
        )}

        {hasQuery && !isFetching && candidates.length === 0 && localMatches.length === 0 && (
          <p className={styles.empty}>Nenhum resultado nas fontes externas</p>
        )}

        {hasQuery && !isFetching && candidates.length > 0 && (
          <div className={styles.grid}>
            {candidates.map((candidate) => (
              <CandidateCard
                key={`${candidate.source}-${candidate.externalId}`}
                candidate={candidate}
                onAdd={() => onSelectCandidate(candidate)}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}

function CandidateCard({ candidate, onAdd }: { candidate: ExternalArtistCandidate; onAdd: () => void }) {
  const sources = candidate.sources?.length ? candidate.sources : [candidate.source];
  const isMerged = sources.length > 1;

  return (
    <div className={styles.card}>
      <div className={styles.cardTop}>
        {candidate.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={candidate.imageUrl} alt="" className={styles.cardAvatar} />
        ) : (
          <span className={styles.cardAvatarPlaceholder}>
            <User size={22} />
          </span>
        )}
        <div className={styles.cardHeading}>
          <span className={styles.cardName}>{candidate.name}</span>
          {candidate.category && <span className={styles.categoryChip}>{candidate.category}</span>}
        </div>
      </div>

      {candidate.description && <p className={styles.cardDescription}>{candidate.description}</p>}

      {!!candidate.genres?.length && (
        <div className={styles.genreChips}>
          {candidate.genres.slice(0, 4).map((genre) => (
            <span key={genre} className={styles.genreChip}>
              {genre}
            </span>
          ))}
        </div>
      )}

      <div className={styles.sourceBadges}>
        {sources.map((source) => (
          <span key={source} className={`${styles.sourceBadge} ${styles[`source_${source}`]}`}>
            {SOURCE_LABEL[source]}
          </span>
        ))}
        {isMerged && <span className={styles.mergedBadge}>MESCLADO</span>}
      </div>

      <div className={styles.cardFooter}>
        {candidate.externalUrl ? (
          <a
            href={candidate.externalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.attributionLink}
          >
            via {candidate.source === 'spotify' ? 'Spotify' : 'Wikimedia'} <ExternalLink size={11} />
          </a>
        ) : (
          <span />
        )}
        <button type="button" className={styles.addBtn} onClick={onAdd}>
          Adicionar
        </button>
      </div>
    </div>
  );
}

function ConfirmPhase({
  candidate,
  isPending,
  onBack,
  onConfirm,
}: {
  candidate: ExternalArtistCandidate;
  isPending: boolean;
  onBack: () => void;
  onConfirm: () => void;
}) {
  return (
    <>
      <div className={styles.body}>
        <button type="button" className={styles.backLink} onClick={onBack}>
          <ArrowLeft size={13} /> VOLTAR AOS RESULTADOS
        </button>

        <p className={styles.sectionLabel}>NOVO PERFIL A CRIAR</p>

        <div className={styles.previewCard}>
          <div className={styles.previewTop}>
            {candidate.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={candidate.imageUrl} alt="" className={styles.previewAvatar} />
            ) : (
              <span className={styles.previewAvatarPlaceholder}>
                <User size={28} />
              </span>
            )}
            <div>
              <div className={styles.previewName}>{candidate.name}</div>
              {candidate.category && <span className={styles.categoryChip}>{candidate.category}</span>}
            </div>
          </div>

          {candidate.description && <p className={styles.previewDescription}>{candidate.description}</p>}

          <div className={styles.previewGrid}>
            <div className={styles.previewField}>
              <span className={styles.previewFieldLabel}>STATUS INICIAL</span>
              <span className={styles.statusValue}>ATIVO · SEM DONO</span>
            </div>

            {!!candidate.genres?.length && (
              <div className={styles.previewField}>
                <span className={styles.previewFieldLabel}>GÊNEROS</span>
                <div className={styles.genreChips}>
                  {candidate.genres.map((genre) => (
                    <span key={genre} className={styles.genreChip}>
                      {genre}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {candidate.imageAttribution && (
              <div className={styles.previewField}>
                <span className={styles.previewFieldLabel}>IMAGEM</span>
                <span className={styles.attributionText}>{candidate.imageAttribution}</span>
              </div>
            )}

            {!!candidate.sameAs?.length && (
              <div className={styles.previewField}>
                <span className={styles.previewFieldLabel}>LINKS</span>
                <div className={styles.linkChips}>
                  {candidate.sameAs.map((url) => (
                    <a key={url} href={url} target="_blank" rel="noopener noreferrer" className={styles.linkChip}>
                      {new URL(url).hostname.replace('www.', '')} <ExternalLink size={10} />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <p className={styles.infoNote}>
          Isso cria um novo perfil (sem dono, reivindicável depois) e envia o convite para este evento.
        </p>
      </div>

      <div className={styles.footer}>
        <button type="button" className={styles.confirmBtn} onClick={onConfirm} disabled={isPending}>
          {isPending ? (
            <>
              <Loader2 size={14} className={styles.spin} /> Criando…
            </>
          ) : (
            'Criar e convidar'
          )}
        </button>
      </div>
    </>
  );
}
