import type { AccessCapability } from '../common/access-capability';

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
