import type { AccessCapability, EventStatus } from '@/features/events/types/event.types';

export type SeriesStatus = 'ACTIVE' | 'PAUSED' | 'ENDED';

// Thin projection of an episode Event, as returned inside series responses
// (GET /series, GET /series/:slug) — not the full EventResponse.
export interface SeriesEpisode {
  id: string;
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
  templateEventId: string;
  status: SeriesStatus;
  createdAt: string;
  updatedAt: string;
}

export interface SeriesListItem extends SeriesResponse {
  nextEpisode: SeriesEpisode | null;
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
  allowedStageIds: string[];
  capacity: number | null;
}

export interface SeriesDetail extends SeriesResponse {
  nextEpisode: SeriesEpisode | null;
  upcoming: SeriesEpisode[];
  replays: SeriesEpisode[];
  seasonPasses: SeasonPass[];
}
