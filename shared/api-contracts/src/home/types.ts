import type { ChannelListItem } from '../channels/types';
import type { EventResponse } from '../events/types';

export type HomeRailDimension =
  | 'curated' | 'category' | 'subtype' | 'tag' | 'city' | 'artist' | 'organization'
  | 'personal' | 'recommended' | 'channels';

export type HomeRailKind = 'events' | 'channels';

export interface HomeRailProgress {
  positionSeconds: number;
  durationSeconds: number;
}

// Only `personal:continue` items carry `progress`.
export type HomeRailItem = EventResponse & { progress?: HomeRailProgress };

export interface HomeRail {
  /** '<dimension>:<value>' — open set; clients must not enumerate keys. */
  key: string;
  dimension: HomeRailDimension;
  kind: HomeRailKind;
  /** Resolved server-side in the request locale. */
  title: string;
  subtitle?: string;
  items: HomeRailItem[];
  channels?: ChannelListItem[];
  seeAllHref: string;
}

export interface HomeRailsResponse {
  rails: HomeRail[];
  nextCursor: string | null;
  snapshotAt: string;
  snapshotChanged?: boolean;
}
