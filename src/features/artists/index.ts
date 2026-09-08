// Pages
export { ArtistPublicPage } from './pages/ArtistPublicPage';
export { ArtistsListPage } from './pages/ArtistsListPage';

// Components
export { ArtistCard } from './components/ArtistCard';

// Hooks
export {
  useArtist,
  useArtistEvents,
  useArtists,
  artistKey,
  artistEventsKey,
  ARTISTS_LIST_KEY,
} from './hooks/use-artists';

// Utils
export { artistHref } from './utils/slug';

// Types (re-exported for convenience — source of truth is @live-show/api-contracts)
export type { ArtistResponse, ArtistListItem, ArtistEventsResponse } from '@live-show/api-contracts';
