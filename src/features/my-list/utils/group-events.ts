import type { PlaybackProgressEntry } from '@/features/playback-progress';
import type { AccessibleEvent } from '../types/my-list.types';
import { isVenueOnly } from './event-action';

export type MyListFilter = 'all' | 'live' | 'upcoming' | 'replays' | 'venue';

export const MY_LIST_FILTERS: MyListFilter[] = ['all', 'live', 'upcoming', 'replays', 'venue'];

export interface GroupedEvents {
  live: AccessibleEvent[];
  /** Replays já começados e não concluídos. Nunca repetidos em `replays`. */
  continueWatching: AccessibleEvent[];
  upcoming: AccessibleEvent[];
  replays: AccessibleEvent[];
}

/** Progresso por id de evento, para o chamador não refazer o índice a cada render. */
export type ProgressByEvent = Map<string, PlaybackProgressEntry>;

/**
 * Um replay em andamento continua sendo um replay — é o progresso que o move
 * de seção. Sem esta checagem o mesmo evento apareceria em "continuar
 * assistindo" E em "replays disponíveis", e a pessoa veria dois cards do
 * mesmo show com estados diferentes.
 *
 * `resumeSeconds` já vem 0 do servidor quando o evento foi concluído ou quando
 * a posição é pequena demais para valer — então concluído volta para
 * "replays", que é onde se reassiste.
 */
function isInProgress(event: AccessibleEvent, progress?: ProgressByEvent): boolean {
  const entry = progress?.get(event.id);
  return !!entry && !entry.completed && entry.resumeSeconds > 0;
}

function matchesQuery(event: AccessibleEvent, query: string): boolean {
  if (!query) return true;
  return [event.title, event.venue, event.city]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
    .includes(query);
}

/**
 * Em qual seção da página o item aparece.
 *
 * A ordem importa e espelha `eventAction`: o que dá para assistir agora ganha
 * de tudo, replay vem depois, e o resto — futuro, cancelado, ingresso
 * presencial — cai em "próximos", que é a única seção que não promete
 * playback. Manter a mesma precedência das duas funções é o que impede a
 * página de listar um evento numa seção cujo botão ela não oferece.
 */
function bucketOf(event: AccessibleEvent, progress?: ProgressByEvent): keyof GroupedEvents {
  if (event.status === 'LIVE' && event.canWatchLive) return 'live';
  if (event.canWatchReplay) {
    return isInProgress(event, progress) ? 'continueWatching' : 'replays';
  }
  return 'upcoming';
}

function byStartAsc(a: AccessibleEvent, b: AccessibleEvent): number {
  return a.startsAt.localeCompare(b.startsAt);
}

export function groupAccessibleEvents(
  events: AccessibleEvent[],
  {
    query = '',
    filter = 'all',
    progress,
  }: { query?: string; filter?: MyListFilter; progress?: ProgressByEvent } = {},
): GroupedEvents {
  const normalized = query.trim().toLowerCase();
  const grouped: GroupedEvents = { live: [], continueWatching: [], upcoming: [], replays: [] };

  for (const event of events) {
    if (!matchesQuery(event, normalized)) continue;
    grouped[bucketOf(event, progress)].push(event);
  }

  grouped.live.sort(byStartAsc);
  grouped.upcoming.sort(byStartAsc);
  // Replays vão do mais recente ao mais antigo: o que a pessoa acabou de
  // perder é o que ela mais provavelmente quer rever.
  grouped.replays.sort((a, b) => byStartAsc(b, a));
  // "Continuar assistindo" ordena pelo que foi visto por último, não pela data
  // do evento: retomar é sobre a sessão que acabou de ser interrompida.
  grouped.continueWatching.sort((a, b) => {
    const ua = progress?.get(a.id)?.updatedAt ?? '';
    const ub = progress?.get(b.id)?.updatedAt ?? '';
    return ub.localeCompare(ua);
  });

  if (filter === 'live') return { ...grouped, continueWatching: [], upcoming: [], replays: [] };
  if (filter === 'upcoming') return { ...grouped, live: [], continueWatching: [], replays: [] };
  // O que está pela metade é replay também, então o filtro de replays mostra os dois.
  if (filter === 'replays') return { ...grouped, live: [], upcoming: [] };
  if (filter === 'venue') {
    // Um ingresso presencial nunca dá playback, então ele só pode estar em
    // "próximos" — filtrar as outras seções seria procurar onde não há.
    return {
      live: [],
      continueWatching: [],
      replays: [],
      upcoming: grouped.upcoming.filter(isVenueOnly),
    };
  }
  return grouped;
}

export function isEmptyGroup(grouped: GroupedEvents): boolean {
  return (
    !grouped.live.length &&
    !grouped.continueWatching.length &&
    !grouped.upcoming.length &&
    !grouped.replays.length
  );
}
