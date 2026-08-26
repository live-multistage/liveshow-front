import type { AccessCapability, EventStatus } from '@/features/events/types/event.types';

export type SeriesStatus = 'ACTIVE' | 'PAUSED' | 'ENDED';

// Thin projection of an episode Event, as returned inside series responses
// (GET /series, GET /series/:slug) — not the full EventResponse.
export interface SeriesEpisode {
  id: string;
  slug?: string | null;
  title: string;
  startsAt: string;
  endsAt: string;
  status: EventStatus;
  detachedFromSeries: boolean;
  thumbnailUrl: string | null;
}

export interface SeriesResponse {
  id: string;
  organizationId: string;
  slug: string;
  name: string;
  description: string | null;
  rrule: string;
  dtstart: string;
  timezone: string;
  durationMin: number;
  horizonWeeks: number;
  status: SeriesStatus;
  createdAt: string;
  updatedAt: string;
}

// Org-only: templateEventId is the private DRAFT event handle the series
// hangs on, meaningless to a buyer — the backend only adds it on org routes
// (GET /organizations/:organizationId/series, POST/PATCH/pause/resume/end
// /series/:id), never on the public GET /series or GET /series/:slug.
export interface SeriesOrgResponse extends SeriesResponse {
  templateEventId: string;
}

export interface SeriesListItem extends SeriesResponse {
  nextEpisode: SeriesEpisode | null;
  episodeCount: number;
}

// Public shape of a season-pass ticket product (GET /series/:slug) — no
// sold/immutable, same withholding the public event ticket routes apply.
export interface SeasonPass {
  id: string;
  seriesId: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  capabilities: AccessCapability[];
  camerasLimit: number | null;
  capacity: number | null;
}

export interface SeriesDetail extends SeriesResponse {
  nextEpisode: SeriesEpisode | null;
  upcoming: SeriesEpisode[];
  replays: SeriesEpisode[];
  seasonPasses: SeasonPass[];
}

export interface CreateSeriesInput {
  organizationId: string;
  slug: string;
  name: string;
  description?: string;
  rrule: string;
  dtstart: string;
  timezone: string;
  durationMin: number;
  horizonWeeks: number;
}

export interface UpdateSeriesInput {
  name?: string;
  description?: string;
  rrule?: string;
  dtstart?: string;
  timezone?: string;
  durationMin?: number;
  horizonWeeks?: number;
}

// Org-management projection of an episode Event (GET /series/:id/episodes) —
// adds hasSales, which the backend only ever sends on this org route (see
// toEpisodeResponse in series.controller.ts); the public shapes
// (nextEpisode/upcoming/replays on GET /series/:slug) stay plain SeriesEpisode.
export interface SeriesEpisodeDetail extends SeriesEpisode {
  hasSales: boolean;
}

// Org-management shape of a season-pass ticket product
// (GET/POST/PATCH /series/:id/ticket-products) — adds the operator-only
// bookkeeping the public SeasonPass withholds.
export interface SeriesTicketProduct extends SeasonPass {
  sold: number;
  immutable: boolean;
}

// No allowedStageIds — the backend DTO (UpsertSeriesTicketProductDto) uses
// forbidNonWhitelisted and 400s if the key is present at all, unlike the
// event ticket-product endpoint which still supports stage restriction.
export interface UpsertSeriesTicketProductInput {
  name: string;
  description: string;
  price: number;
  currency: string;
  capabilities: AccessCapability[];
  camerasLimit?: number | null;
  capacity?: number | null;
}
