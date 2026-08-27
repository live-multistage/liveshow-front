import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { Channel, OrgChannel } from '../../types/channel.types';
import { ChannelAccessCard } from './ChannelAccessCard';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => 'pt-BR',
}));

const summaryState: { data: unknown } = { data: undefined };
vi.mock('../../queries/channel.queries', () => ({
  useChannelSubscriptionSummaryQuery: () => summaryState,
}));

const syncMutate = vi.fn();
const syncState = { mutate: syncMutate, isPending: false };
vi.mock('../../mutations/channel.mutations', () => ({
  useSyncChannelPricingMutation: () => syncState,
}));

vi.mock('./ChannelPricingForm', () => ({
  ChannelPricingForm: () => <div>pricing-form-stub</div>,
}));

const channel = (overrides: Partial<Channel> = {}): Channel =>
  ({
    id: 'ch-1',
    organizationId: 'org-1',
    slug: 'canal-um',
    name: 'Canal Um',
    description: null,
    coverUrl: null,
    accessMode: 'FREE',
    status: 'DRAFT',
    broadcastEventId: 'evt-1',
    timezone: 'America/Sao_Paulo',
    createdAt: '2026-08-01T00:00:00.000Z',
    updatedAt: '2026-08-01T00:00:00.000Z',
    ...overrides,
  }) as Channel;

const orgChannel = (overrides: Partial<OrgChannel> = {}): OrgChannel =>
  ({
    ...channel(),
    currency: 'BRL',
    monthlyPriceCents: 1990,
    yearlyPriceCents: 19900,
    pricingSynced: true,
    sourceOverride: null,
    isOnAir: false,
    current: null,
    next: null,
    programCameraCount: 0,
    ...overrides,
  }) as OrgChannel;

describe('ChannelAccessCard', () => {
  beforeEach(() => {
    summaryState.data = undefined;
    syncMutate.mockReset();
    syncState.isPending = false;
  });

  it('renders for a FREE channel with the configure action', () => {
    render(<ChannelAccessCard channel={channel()} orgChannel={undefined} />);

    expect(screen.getByText('accessFree')).toBeInTheDocument();
    expect(screen.getByText('configure')).toBeInTheDocument();
    expect(screen.queryByText('subscribers')).toBeNull();
  });

  it('renders prices and sync state for a SUBSCRIPTION channel', () => {
    summaryState.data = { active: 12, pastDue: 0, canceledThisMonth: 0, mrrCents: 23880 };

    render(
      <ChannelAccessCard
        channel={channel({ accessMode: 'SUBSCRIPTION' })}
        orgChannel={orgChannel()}
      />,
    );

    expect(screen.getByText('accessSubscription')).toBeInTheDocument();
    expect(screen.getByText('synced')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
  });

  it('offers the sync action when pricing is not synced', () => {
    render(
      <ChannelAccessCard
        channel={channel({ accessMode: 'SUBSCRIPTION' })}
        orgChannel={orgChannel({ pricingSynced: false })}
      />,
    );

    expect(screen.getByText('pending')).toBeInTheDocument();
    fireEvent.click(screen.getByText('sync'));

    expect(syncMutate).toHaveBeenCalledWith({
      id: 'ch-1',
      slug: 'canal-um',
      organizationId: 'org-1',
    });
  });

  it('opens the pricing dialog from the configure button', () => {
    render(<ChannelAccessCard channel={channel()} orgChannel={undefined} />);

    expect(screen.queryByText('pricing-form-stub')).toBeNull();

    fireEvent.click(screen.getByText('configure'));

    expect(screen.getByText('pricing-form-stub')).toBeInTheDocument();
  });
});
