// Pages
export { ArtistPublicPage } from './pages/ArtistPublicPage';
export { ArtistsListPage } from './pages/ArtistsListPage';
export { ArtistApplicationContent } from './pages/ArtistApplicationPage';

// Components
export { ArtistCard } from './components/ArtistCard';

// Hooks (queries)
export {
  useArtist,
  useArtistEvents,
  useArtists,
  useMyArtists,
  useAdminArtists,
  useArtistInvitations,
  useEventLineup,
  useExternalArtistSearch,
  artistKey,
  artistEventsKey,
  ARTISTS_LIST_KEY,
  myArtistsKey,
  adminArtistsKey,
  artistInvitationsKey,
  eventLineupKey,
  externalArtistSearchKey,
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
  useCreateArtistFromExternalMutation,
} from './mutations/artist.mutations';

// External artist search / disambiguation modal
export { ExternalArtistSearchModal } from './components/ExternalArtistSearchModal';

// Service (for server components / direct use)
export { artistService } from './services/artist.service';
export type { CreateArtistRequest, UpdateArtistRequest } from './services/artist.service';
export { artistApplicationService } from './services/artist-application.service';

// Artist applications (public apply flow)
export { useCreateArtistApplication } from './hooks/use-create-artist-application';
export type {
  CreateArtistApplicationRequest,
  ArtistApplicationResponse,
} from './types/artist-application.types';

// Utils
export { artistHref } from './utils/slug';

// Types (re-exported for convenience — source of truth is @live-show/api-contracts)
export type {
  ArtistResponse,
  ArtistListItem,
  AdminArtistListItem,
  ArtistEventsResponse,
  ArtistStatus,
  ArtistEventsFilter,
  LineupInvitationStatus,
  EventLineupItem,
  ArtistInvitationItem,
  ExternalArtistCandidate,
  SearchExternalArtistsResponse,
} from '@live-show/api-contracts';
