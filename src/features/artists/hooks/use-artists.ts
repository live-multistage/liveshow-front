'use client';

import { useQuery } from '@tanstack/react-query';
import { artistService } from '../services/artist.service';

export const artistKey = (slugOrId: string) => ['artists', slugOrId] as const;
export const artistEventsKey = (slugOrId: string) => ['artists', slugOrId, 'events'] as const;
export const ARTISTS_LIST_KEY = ['artists', 'list'] as const;
export const myArtistsKey = ['artists', 'mine'] as const;
export const adminArtistsKey = (page = 1) => ['artists', 'admin', page] as const;
export const artistInvitationsKey = (artistId: string) => ['artists', artistId, 'invitations'] as const;
export const eventLineupKey = (eventId: string) => ['artists', 'lineup', eventId] as const;

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

/** Platform-admin catalog — every artist, every status. Admin only. */
export function useAdminArtists(page = 1) {
  return useQuery({
    queryKey: adminArtistsKey(page),
    queryFn: () => artistService.listAdmin(page),
  });
}

/** Requester's own artist profiles — artist self dashboard. */
export function useMyArtists() {
  return useQuery({
    queryKey: myArtistsKey,
    queryFn: () => artistService.listMine(),
  });
}

/** Pending/answered invitations for one of the requester's artist profiles. */
export function useArtistInvitations(artistId: string) {
  return useQuery({
    queryKey: artistInvitationsKey(artistId),
    queryFn: () => artistService.listInvitations(artistId),
    enabled: !!artistId,
  });
}

/** Event-org admin view of an event's lineup. */
export function useEventLineup(eventId: string) {
  return useQuery({
    queryKey: eventLineupKey(eventId),
    queryFn: () => artistService.getEventLineup(eventId),
    enabled: !!eventId,
  });
}
