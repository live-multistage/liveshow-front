export type EventStatus = 'DRAFT' | 'PUBLISHED' | 'SCHEDULED' | 'LIVE' | 'FINISHED' | 'CANCELLED';

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
  venue: string | null;
  city: string | null;
  country: string | null;
  venueData: VenueData | null;
  visibility: 'PRIVATE' | 'UNLISTED' | 'PUBLIC';
  domain: 'ENTERTAINMENT' | 'SPORTS' | 'CORPORATE' | 'EDUCATION' | 'RELIGIOUS' | 'OTHER' | null;
  subtype: string | null;
  camerasCount: number;
  isFree: boolean;
  priceFromCents?: number;
  priceToCents?: number;
}

export interface PaginatedEventsResponse {
  items: EventResponse[];
  page: number;
  pageSize: number;
  total: number;
}

export type RecommendedEventsResponse = PaginatedEventsResponse;

export interface CreateEventRequest {
  organizationId: string;
  title: string;
  description: string;
  category: EventCategory;
  tags?: string[];
  startsAt: string;
  endsAt: string;
  venue?: string;
  city?: string;
  country?: string;
  venueName?: string;
  venueData?: {
    name: string;
    address?: string;
    city: string;
    country: string;
    timezone: string;
    coordinates?: { lat: number; lng: number };
  };
  camerasCount?: number;
  domain?: 'ENTERTAINMENT' | 'SPORTS' | 'CORPORATE' | 'EDUCATION' | 'RELIGIOUS' | 'OTHER';
  subtype?: string;
}

export interface UpdateEventRequest {
  title?: string;
  description?: string;
  startsAt?: string;
  endsAt?: string;
}

export type AccessCapability = 'LIVE_VIEW' | 'REPLAY_VIEW' | 'CAMERA_VIEW';

export interface CreateTicketRequest {
  name: string;
  description: string;
  price: number;
  capabilities: AccessCapability[];
  camerasLimit?: number | null;
  allowedStageIds?: string[];
}

export interface UpdateTicketRequest {
  name?: string;
  description?: string;
  price?: number;
  capabilities?: AccessCapability[];
  camerasLimit?: number | null;
  allowedStageIds?: string[];
}

export interface TicketProductResponse {
  id: string;
  eventId: string;
  showId?: string;
  name: string;
  description: string;
  price: number;
  capabilities: AccessCapability[];
  camerasLimit: number | null;
  allowedStageIds: string[];
  immutable: boolean;
}

export interface EventPhotoResponse {
  id: string;
  eventId: string;
  url: string;
  position: number;
  createdAt: string;
}
