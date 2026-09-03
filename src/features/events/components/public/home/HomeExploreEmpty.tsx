'use client';

import { useState, type ComponentType } from 'react';
import { toast } from 'sonner';
import {
  Bell,
  Check,
  LayoutGrid,
  Music,
  Mic,
  Guitar,
  Disc,
  Drama,
  Radio,
  type LucideProps,
} from 'lucide-react';
import styles from './HomeExploreEmpty.module.scss';

interface HomeExploreEmptyProps {
  activeGenre: string;
  genres: string[];
  onGenreChange: (genre: string) => void;
}

const ALL_GENRE = 'Todos';
const MAX_SUGGESTIONS = 5;

// Best-effort genre → icon; unknown categories fall back to Music.
const GENRE_ICONS: Record<string, ComponentType<LucideProps>> = {
  rock: Music,
  eletrônica: Radio,
  eletronica: Radio,
  pop: Mic,
  sertanejo: Guitar,
  jazz: Disc,
  teatro: Drama,
  'stand-up': Mic,
};

function genreIcon(genre: string): ComponentType<LucideProps> {
  return GENRE_ICONS[genre.toLowerCase()] ?? Music;
}

export function HomeExploreEmpty({ activeGenre, genres, onGenreChange }: HomeExploreEmptyProps) {
  // ponytail: notify is a local visual toggle only — no per-category
  // subscription backend exists yet. Wire to a real endpoint when it does.
  const [notifying, setNotifying] = useState(false);

  const isAll = activeGenre === ALL_GENRE;
  const badge = isAll ? 'PROGRAMAÇÃO EM PREPARAÇÃO' : `${activeGenre.toUpperCase()} · EM BREVE`;

  const suggestions = genres
    .filter((g) => g !== ALL_GENRE && g !== activeGenre)
    .slice(0, MAX_SUGGESTIONS);

  const toggleNotify = () => {
    setNotifying((prev) => {
      const next = !prev;
      if (next) toast.success('Pronto — avisamos quando entrar um show novo.');
      return next;
    });
  };

  const clearFilter = () => {
    onGenreChange(ALL_GENRE);
    toast('Mostrando todas as categorias.');
  };

  return (
    <div className={styles.card}>
      <div className={styles.ambient} aria-hidden />
      <div className={styles.gridPattern} aria-hidden />

      <div className={styles.content}>
        <div className={styles.posterStack} aria-hidden>
          <span className={styles.posterLeft} />
          <span className={styles.posterRight} />
          <span className={styles.posterCenter}>
            <Music size={30} strokeWidth={1.7} />
          </span>
        </div>

        <div className={styles.badge}>
          <span className={styles.badgeDot} />
          {badge}
        </div>

        <h3 className={styles.title}>Nenhum show por aqui ainda</h3>
        <p className={styles.description}>
          Ainda não há shows publicados nesta categoria. Ative o aviso e a gente te chama assim que
          o primeiro entrar na programação.
        </p>

        <div className={styles.actions}>
          <button
            type="button"
            className={notifying ? styles.notifyOn : styles.notify}
            onClick={toggleNotify}
            aria-pressed={notifying}
          >
            {notifying ? <Check size={16} strokeWidth={2.8} /> : <Bell size={16} strokeWidth={2.2} />}
            {notifying ? 'Você será avisado' : 'Avise-me sobre novos shows'}
          </button>
          {!isAll && (
            <button type="button" className={styles.clear} onClick={clearFilter}>
              <LayoutGrid size={16} strokeWidth={2} />
              Ver todas as categorias
            </button>
          )}
        </div>

        {suggestions.length > 0 && (
          <div className={styles.suggestions}>
            <div className={styles.suggestionsLabel}>EXPLORE OUTRAS CATEGORIAS</div>
            <div className={styles.suggestionChips}>
              {suggestions.map((genre) => {
                const Icon = genreIcon(genre);
                return (
                  <button
                    key={genre}
                    type="button"
                    className={styles.suggestionChip}
                    onClick={() => onGenreChange(genre)}
                  >
                    <Icon size={15} strokeWidth={1.9} className={styles.suggestionIcon} />
                    {genre}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
