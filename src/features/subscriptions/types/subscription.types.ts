export type SubscriptionInterval = 'MONTHLY' | 'YEARLY';
export type SubscriptionStatus = 'INCOMPLETE' | 'ACTIVE' | 'PAST_DUE' | 'CANCELED';

export interface SubscriptionChannel {
  slug: string;
  name: string;
  coverUrl: string | null;
}

export interface MySubscription {
  id: string;
  // Null only if the channel itself was hard-deleted — the backend never
  // does that today, but the contract allows it (§4.5).
  channel: SubscriptionChannel | null;
  interval: SubscriptionInterval;
  status: SubscriptionStatus;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  priceCents: number;
  currency: string;
}
