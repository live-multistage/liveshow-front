import type { AccessCapability } from '../common/access-capability';
import type { ArtistListItem } from '../artists/types';

export type EventStatus = 'DRAFT' | 'PUBLISHED' | 'SCHEDULED' | 'LIVE' | 'FINISHED' | 'CANCELLED';

export type EventFormat = 'LIVE' | 'VOD';

export type ListEventsFilter = 'upcoming' | 'live' | 'finished' | 'all';

export type EventCategory =
  | 'MUSIC' | 'COMEDY' | 'THEATER' | 'DANCE' | 'SPORTS'
  | 'FOOTBALL' | 'MOTORSPORT' | 'CORPORATE'
  | 'TALK' | 'RELIGIOUS' | 'EDUCATION' | 'OTHER';

export const EVENT_CATEGORIES: EventCategory[] = [
  'MUSIC', 'COMEDY', 'THEATER', 'DANCE', 'SPORTS',
  'FOOTBALL', 'MOTORSPORT', 'CORPORATE',
  'TALK', 'RELIGIOUS', 'EDUCATION', 'OTHER',
];

export const EVENT_CATEGORY_LABELS: Record<EventCategory, string> = {
  MUSIC: 'Música',
  COMEDY: 'Comédia',
  THEATER: 'Teatro',
  DANCE: 'Dança',
  SPORTS: 'Esportes',
  FOOTBALL: 'Futebol',
  MOTORSPORT: 'Automobilismo',
  CORPORATE: 'Corporativo',
  TALK: 'Palestra',
  RELIGIOUS: 'Religioso',
  EDUCATION: 'Educação',
  OTHER: 'Outro',
};

export interface VenueData {
  name: string;
  address: string | null;
  city: string;
  country: string;
  timezone: string;
  coordinates: { lat: number; lng: number } | null;
}

export interface EventOrganization {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
}

export interface EventResponse {
  id: string;
  /** Friendly URL segment — unique platform-wide, derived from the title on create. */
  slug: string;
  title: string;
  description: string;
  category: EventCategory;
  organizationId: string;
  organization: EventOrganization | null;
  startsAt: string;
  endsAt: string;
  status: EventStatus;
  bannerUrl: string | null;
  thumbnailUrl: string | null;
  teaserVideoUrl: string | null;
  finishedAt: string | null;
  venue: string | null;
  city: string | null;
  country: string | null;
  venueData: VenueData | null;
  visibility: 'PRIVATE' | 'UNLISTED' | 'PUBLIC';
  format: EventFormat;
  latencyMode: 'STANDARD' | 'LOW';
  domain: 'ENTERTAINMENT' | 'SPORTS' | 'CORPORATE' | 'EDUCATION' | 'RELIGIOUS' | 'OTHER' | null;
  subtype: string | null;
  camerasCount: number;
  isFree: boolean;
  publiclyFunded: boolean;
  priceFromCents?: number;
  priceToCents?: number;
  collaborators?: EventOrganization[];
  collaborationRole?: 'OWNER' | 'COLLABORATOR';
  // Optional: absent on responses cached before this field shipped.
  artists?: ArtistListItem[];
  // How long after the last camera drops the backend auto-finishes a LIVE event.
  // Optional: a response cached before this field shipped won't carry it.
  lifecycle?: { idleFinishMinutes: number };
  // Set when this event is an occurrence of a channel Program.
  programId?: string | null;
}

// NBR 15290 — Libras window accessibility state for an event.
export interface AccessibilityStatus {
  publiclyFunded: boolean;
  hasLibrasCamera: boolean;
  librasCameraId: string | null;
  approved: boolean;
  publishable: boolean;
}

export interface PaginatedEventsResponse {
  items: EventResponse[];
  page: number;
  pageSize: number;
  total: number;
}

export type RecommendedEventsResponse = PaginatedEventsResponse;

export interface TicketProductResponse {
  id: string;
  eventId: string;
  showId?: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  capabilities: AccessCapability[];
  camerasLimit: number | null;
  allowedStageIds: string[];
  capacity: number | null;
  remaining: number | null;
  soldOut: boolean;
  immutable: boolean;
}

export interface TicketProductsResponse {
  products: TicketProductResponse[];
  serviceFeeRate: number;
}

export interface EventPhotoResponse {
  id: string;
  eventId: string;
  url: string;
  position: number;
  createdAt: string;
}

// Event schedule (Programação): an ordered list of blocks per event, each
// either an ARTIST slot (must reference an artist with an ACCEPTED lineup
// invitation on this event) or a free-text SEGMENT (e.g. "Pré-jogo").
export type ScheduleItemKind = 'ARTIST' | 'SEGMENT';

// PUT payload item — order is implied by array index, no explicit position.
export interface EventScheduleItemInput {
  /** "HH:MM" */
  startTime: string;
  /** "HH:MM", optional */
  endTime?: string | null;
  kind: ScheduleItemKind;
  artistId?: string | null;
  title?: string | null;
  description?: string | null;
}

export interface EventScheduleArtist {
  id: string;
  slug: string;
  name: string;
  imageUrl?: string;
}

// Response item — save semantics are replace-all, so `position` is always
// server-assigned from the PUT array order.
export interface EventScheduleItem {
  id: string;
  startTime: string;
  endTime?: string | null;
  kind: ScheduleItemKind;
  description?: string | null;
  position: number;
  title?: string | null;
  artist?: EventScheduleArtist | null;
}

export interface ReplaceEventScheduleRequest {
  items: EventScheduleItemInput[];
}
