export type EventStatus = 'DRAFT' | 'PUBLISHED' | 'LIVE' | 'FINISHED' | 'CANCELLED';

export type ListEventsFilter = 'upcoming' | 'live' | 'finished' | 'all';

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
  camerasCount: number;
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
  camerasCount?: number;
}

export interface UpdateEventRequest {
  title?: string;
  description?: string;
  startsAt?: string;
  endsAt?: string;
}

export interface CreateTicketRequest {
  name: string;
  description: string;
  price: number;
  capabilities: ('LIVE_VIEW' | 'REPLAY_VIEW')[];
}

export interface TicketProductResponse {
  id: string;
  showId: string;
  name: string;
  description: string;
  price: number;
  capabilities: ('LIVE_VIEW' | 'REPLAY_VIEW')[];
  immutable: boolean;
}

export interface EventPhotoResponse {
  id: string;
  eventId: string;
  url: string;
  position: number;
  createdAt: string;
}
