import { describe, it, expect } from 'vitest';
import type { PublicChannel } from '../types/channel.types';
import { resolveChannelAccess } from './resolveChannelAccess';

const channel = (overrides: Partial<PublicChannel> = {}): PublicChannel =>
  ({
    id: 'ch-1',
    organizationId: 'org-1',
    slug: 'canal',
    name: 'Canal',
    description: null,
    coverUrl: null,
    accessMode: 'FREE',
    status: 'PUBLISHED',
    broadcastEventId: 'evt-1',
    timezone: 'America/Sao_Paulo',
    createdAt: '2026-08-01T00:00:00.000Z',
    updatedAt: '2026-08-01T00:00:00.000Z',
    isOnAir: true,
    current: null,
    next: null,
    today: [],
    pricing: null,
    viewer: null,
    source: { mode: 'own', reason: 'own', event: null },
    ...overrides,
  }) as PublicChannel;

describe('resolveChannelAccess', () => {
  it('is always authorized as free for a FREE channel', () => {
    expect(resolveChannelAccess(channel({ accessMode: 'FREE' }), false)).toEqual({
      mode: 'free',
      authorized: true,
    });
  });

  it('is a subscriber when the viewer has an active subscription', () => {
    const result = resolveChannelAccess(
      channel({
        accessMode: 'SUBSCRIPTION',
        viewer: { subscribed: true, status: 'ACTIVE', cancelAtPeriodEnd: false, currentPeriodEnd: null },
      }),
      false,
    );

    expect(result).toEqual({ mode: 'subscriber', authorized: true });
  });

  it('is a member when the live-access check grants access without a subscription', () => {
    const result = resolveChannelAccess(
      channel({
        accessMode: 'SUBSCRIPTION',
        viewer: { subscribed: false, status: null, cancelAtPeriodEnd: false, currentPeriodEnd: null },
      }),
      true,
    );

    expect(result).toEqual({ mode: 'member', authorized: true });
  });

  it('is a paywall when a SUBSCRIPTION channel grants no access', () => {
    const result = resolveChannelAccess(
      channel({
        accessMode: 'SUBSCRIPTION',
        viewer: { subscribed: false, status: null, cancelAtPeriodEnd: false, currentPeriodEnd: null },
      }),
      false,
    );

    expect(result).toEqual({ mode: 'paywall', authorized: false });
  });

  it('is a paywall when a SUBSCRIPTION channel has no viewer at all (anonymous)', () => {
    const result = resolveChannelAccess(
      channel({ accessMode: 'SUBSCRIPTION', viewer: null }),
      false,
    );

    expect(result).toEqual({ mode: 'paywall', authorized: false });
  });
});
