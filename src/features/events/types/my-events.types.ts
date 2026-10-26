import type { EventResponse, EventStatus } from '@live-show/api-contracts';

// TODO: swap for the `@live-show/api-contracts` exports of the same names once
// the backend ships them (GET /events/mine/paged and GET /events/mine/counts).

// Exact event status; absent means every event.
export type MyEventsStatusFilter = Exclude<EventStatus, 'SCHEDULED'>;

export interface MyEventsPageParams {
  page?: number;
  pageSize?: number;
  status?: MyEventsStatusFilter;
}

export interface MyEventsPageResponse {
  items: (EventResponse & { collaborationRole: 'OWNER' | 'COLLABORATOR' })[];
  page: number;
  pageSize: number;
  total: number;
}

export interface MyEventCounts {
  all: number;
  live: number;
  upcoming: number;
  finished: number;
}
