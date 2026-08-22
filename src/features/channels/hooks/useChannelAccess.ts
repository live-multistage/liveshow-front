import type { PublicChannel } from '../types/channel.types';

export type ChannelAccessResultMode = 'free' | 'subscriber' | 'member' | 'paywall';

export interface ChannelAccessResult {
  mode: ChannelAccessResultMode;
  authorized: boolean;
}

/**
 * Derives the viewer's access mode for a channel so `ChannelGate` doesn't
 * have to juggle the branching itself.
 *
 * `hasLiveAccess` is the generic entitlement check (`useLiveAccessQuery`) —
 * it already covers org-member/staff access that isn't a paid subscription.
 */
export function useChannelAccess(
  channel: PublicChannel | undefined,
  hasLiveAccess: boolean,
): ChannelAccessResult {
  // Undefined only while the channel query is still loading — the caller
  // handles that loading state separately, so this default is never shown.
  if (!channel) return { mode: 'paywall', authorized: false };
  if (channel.accessMode === 'FREE') return { mode: 'free', authorized: true };
  if (channel.viewer?.subscribed) return { mode: 'subscriber', authorized: true };
  if (hasLiveAccess) return { mode: 'member', authorized: true };
  return { mode: 'paywall', authorized: false };
}
