import type { AccessCapability } from '@live-show/api-contracts';

export type {
  EventStatus,
  EventFormat,
  ListEventsFilter,
  EventCategory,
  VenueData,
  EventOrganization,
  EventResponse,
  AccessibilityStatus,
  PaginatedEventsResponse,
  RecommendedEventsResponse,
  TicketProductResponse,
  TicketProductsResponse,
  EventPhotoResponse,
} from '@live-show/api-contracts';

export { EVENT_CATEGORIES, EVENT_CATEGORY_LABELS } from '@live-show/api-contracts';

export type { AccessCapability } from '@live-show/api-contracts';

export interface CreateEventRequest {
  organizationId: string;
  title: string;
  description: string;
  category: import('@live-show/api-contracts').EventCategory;
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
  format?: import('@live-show/api-contracts').EventFormat;
  latencyMode?: 'STANDARD' | 'LOW';
  publiclyFunded?: boolean;
}

export interface UpdateEventRequest {
  /** 409 CONFLICT if another event already owns it. */
  slug?: string;
  title?: string;
  description?: string;
  startsAt?: string;
  endsAt?: string;
  latencyMode?: 'STANDARD' | 'LOW';
  publiclyFunded?: boolean;
}

export interface CreateTicketRequest {
  name: string;
  description: string;
  price: number;
  currency: string;
  capabilities: AccessCapability[];
  camerasLimit?: number | null;
  allowedStageIds?: string[];
  capacity?: number | null;
}

export interface UpdateTicketRequest {
  name?: string;
  description?: string;
  price?: number;
  currency?: string;
  capabilities?: AccessCapability[];
  camerasLimit?: number | null;
  allowedStageIds?: string[];
  capacity?: number | null;
}
