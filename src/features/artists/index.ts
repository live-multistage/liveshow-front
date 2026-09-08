// Pages
export { ArtistPublicPage } from './pages/ArtistPublicPage';
export { ArtistsListPage } from './pages/ArtistsListPage';

// Components
export { ArtistCard } from './components/ArtistCard';

// Hooks (queries)
export {
  useArtist,
  useArtistEvents,
  useArtists,
  useMyArtists,
  useArtistInvitations,
  useEventLineup,
  artistKey,
  artistEventsKey,
  ARTISTS_LIST_KEY,
  myArtistsKey,
  artistInvitationsKey,
  eventLineupKey,
} from './hooks/use-artists';

// Mutations
export {
  useCreateArtistMutation,
  useUpdateArtistMutation,
  useDeleteArtistMutation,
  useInviteArtistMutation,
  useRespondArtistInviteMutation,
  useRemoveArtistFromEventMutation,
  useUploadArtistAvatarMutation,
  useUploadArtistBannerMutation,
} from './mutations/artist.mutations';

// Service (for server components / direct use)
export { artistService } from './services/artist.service';
export type { CreateArtistRequest, UpdateArtistRequest } from './services/artist.service';

// Utils
export { artistHref } from './utils/slug';

// Types (re-exported for convenience — source of truth is @live-show/api-contracts)
export type {
  ArtistResponse,
  ArtistListItem,
  ArtistEventsResponse,
  ArtistStatus,
  ArtistEventsFilter,
  LineupInvitationStatus,
  EventLineupItem,
  ArtistInvitationItem,
} from '@live-show/api-contracts';
