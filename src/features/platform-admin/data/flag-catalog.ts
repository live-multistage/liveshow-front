// Static catalog for the 7 global feature flag keys the backend exposes.
// An unknown key (new backend flag not yet cataloged) falls back to
// { group: 'other', scope: 'all' } via flagMeta() instead of throwing.
export type FlagGroup = 'player' | 'account' | 'payments' | 'other';

export interface FlagMeta {
  group: FlagGroup;
  beta?: boolean;
  risky?: boolean;
  scope: 'all' | 'admins' | 'viewers' | 'reserved';
}

export const FLAG_CATALOG: Record<string, FlagMeta> = {
  chat: { group: 'player', scope: 'all' },
  linear_channels: { group: 'player', scope: 'all' },
  vod_upload: { group: 'player', scope: 'all', beta: true },
  two_factor: { group: 'account', scope: 'admins' },
  push_notifications: { group: 'account', scope: 'viewers', beta: true },
  mobile_stripe_checkout: { group: 'payments', scope: 'viewers', risky: true },
  play_billing: { group: 'payments', scope: 'reserved', risky: true, beta: true },
};

export function flagMeta(key: string): FlagMeta {
  return FLAG_CATALOG[key] ?? { group: 'other', scope: 'all' };
}

export const FLAG_GROUP_ORDER: FlagGroup[] = ['player', 'account', 'payments', 'other'];
