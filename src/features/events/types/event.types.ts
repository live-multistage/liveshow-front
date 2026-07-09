export type EventStatus = 'DRAFT' | 'PUBLISHED' | 'SCHEDULED' | 'LIVE' | 'FINISHED' | 'CANCELLED';

export type ListEventsFilter = 'upcoming' | 'live' | 'finished' | 'all';

export interface VenueData {
  name: string;
  address: string | null;
  city: string;
  country: string;
  timezone: string;
  coordinates: { lat: number; lng: number } | null;
}

export interface EventResponse {
  id: string;
  title: string;
  description: string;
  organizationId: string;
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
  priceFromCents?: number;
  priceToCents?: number;
}

export interface RecommendedEventsResponse {
  items: EventResponse[];
  page: number;
  pageSize: number;
  total: number;
}

export interface CreateEventRequest {
  organizationId: string;
  title: string;
  description: string;
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
