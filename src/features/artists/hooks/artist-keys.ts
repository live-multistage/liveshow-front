// Pure React Query key builders — deliberately NOT a 'use client' module so the
// artist detail Server Component can call them to seed the QueryClient. Keeping
// them in the 'use client' use-artists file made them client-only references and
// threw "Attempted to call artistKey() from the server".
export const artistKey = (slugOrId: string) => ['artists', slugOrId] as const;
export const artistEventsKey = (slugOrId: string) => ['artists', slugOrId, 'events'] as const;
export const ARTISTS_LIST_KEY = ['artists', 'list'] as const;
export const myArtistsKey = ['artists', 'mine'] as const;
export const adminArtistsKey = (page = 1) => ['artists', 'admin', page] as const;
export const artistInvitationsKey = (artistId: string) => ['artists', artistId, 'invitations'] as const;
export const eventLineupKey = (eventId: string) => ['artists', 'lineup', eventId] as const;
export const externalArtistSearchKey = (q: string) => ['artists', 'external-search', q] as const;
