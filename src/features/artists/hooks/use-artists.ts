'use client';

import { useQuery } from '@tanstack/react-query';
import { artistService } from '../services/artist.service';

export const artistKey = (slugOrId: string) => ['artists', slugOrId] as const;
export const artistEventsKey = (slugOrId: string) => ['artists', slugOrId, 'events'] as const;
export const ARTISTS_LIST_KEY = ['artists', 'list'] as const;

/** Accepts UUID or slug. */
export function useArtist(slugOrId: string) {
  return useQuery({
    queryKey: artistKey(slugOrId),
    queryFn: () => artistService.getByIdOrSlug(slugOrId),
    enabled: !!slugOrId,
  });
}

export function useArtistEvents(slugOrId: string) {
  return useQuery({
    queryKey: artistEventsKey(slugOrId),
    queryFn: () => artistService.getEvents(slugOrId),
    enabled: !!slugOrId,
  });
}

/** Full catalog for the /artists listing — client-side search + genre filters. */
export function useArtists() {
  return useQuery({
    queryKey: ARTISTS_LIST_KEY,
    queryFn: () => artistService.list(1, 100),
  });
}
