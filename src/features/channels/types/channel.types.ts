import type { LiveCamera, LiveStage } from '@/features/streaming/types/live.types';
import type { ChannelSource } from '@live-show/api-contracts';

export type {
  ChannelStatus,
  ChannelAccessMode,
  SubscriptionInterval,
  ChannelSubscriptionStatus,
  ChannelSourceMode,
  ChannelSourceReason,
  ChannelSourceEvent,
  ChannelSource,
  ChannelSourceOverride,
  ChannelPricing,
  ChannelViewerState,
  ScheduledSlot,
  CurrentSlot,
  ProgramEpisodeStatus,
  ProgramEpisode,
  Channel,
  PublicChannel,
  ChannelListItem,
  ProgramLatencyMode,
  Program,
  OrgChannel,
  ChannelSubscriptionSummary,
  CreateChannelInput,
  UpdateChannelInput,
  UpsertProgramInput,
} from '@live-show/api-contracts';

// GET /channels/:slug/playback — the existing live playback payload plus the
// resolved source. Viewer tracking and the viewer count follow whatever is
// actually on screen, so they bind to `playbackEventId` (the event currently
// playing — the channel's own broadcast, or a carried event). Chat is scoped
// to the channel's own persistent room, so it binds to `channelEventId` /
// `channel.broadcastEventId` instead and never moves when the source does.
export interface ChannelPlaybackResponse {
  live: boolean;
  latencyMode: 'STANDARD' | 'LOW';
  stages?: LiveStage[];
  cameras: LiveCamera[];
  primaryCameraId: string | null;
  librasCameraId: string | null;
  playbackEventId: string;
  channelEventId: string;
  source: ChannelSource;
}
