import type { ChannelSubscriptionStatus, SubscriptionInterval } from '../channels/types';

export type { SubscriptionInterval };
// Same enum as the channel side — aliased under the name the subscription
// screens already use.
export type SubscriptionStatus = ChannelSubscriptionStatus;

export interface SubscriptionChannel {
  slug: string;
  name: string;
  coverUrl: string | null;
}

/** One item of `GET /me/subscriptions`. Stripe ids are deliberately absent. */
export interface MySubscription {
  id: string;
  // Null only if the channel itself was hard-deleted — the backend never does
  // that today, but the contract allows it.
  channel: SubscriptionChannel | null;
  interval: SubscriptionInterval;
  status: SubscriptionStatus;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  priceCents: number;
  currency: string;
}
