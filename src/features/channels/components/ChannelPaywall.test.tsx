import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { PublicChannel } from '../types/channel.types';
import { ChannelPaywall } from './ChannelPaywall';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string, values?: Record<string, unknown>) =>
    values ? `${key}:${JSON.stringify(values)}` : key,
}));

const push = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
  usePathname: () => '/channels/canal',
}));

const mutate = vi.fn();
const subscribeState = { isPending: false };
vi.mock('../mutations/channel.mutations', () => ({
  useSubscribeChannelMutation: () => ({ mutate, ...subscribeState }),
}));

const channel = (overrides: Partial<PublicChannel> = {}): PublicChannel =>
  ({
    id: 'ch-1',
    organizationId: 'org-1',
    slug: 'canal',
    name: 'Canal',
    description: null,
    coverUrl: null,
    accessMode: 'SUBSCRIPTION',
    status: 'PUBLISHED',
    broadcastEventId: 'evt-1',
    timezone: 'America/Sao_Paulo',
    createdAt: '2026-08-01T00:00:00.000Z',
    updatedAt: '2026-08-01T00:00:00.000Z',
    isOnAir: true,
    current: null,
    next: null,
    today: [],
    pricing: { currency: 'BRL', monthlyPriceCents: 2990, yearlyPriceCents: 29900 },
    viewer: null,
    ...overrides,
  }) as PublicChannel;

describe('ChannelPaywall', () => {
  beforeEach(() => {
    push.mockClear();
    mutate.mockClear();
    subscribeState.isPending = false;
  });

  it('renders both plan prices', () => {
    render(<ChannelPaywall channel={channel()} isLoggedIn />);

    expect(screen.getByText(/29,90/)).toBeInTheDocument();
    expect(screen.getByText(/299,00/)).toBeInTheDocument();
  });

  it('shows the yearly discount percentage when both prices exist', () => {
    // 29.90 * 12 = 358.80; 1 - 299/358.8 = ~0.1667 -> 17%
    render(<ChannelPaywall channel={channel()} isLoggedIn />);

    expect(screen.getByText('savePercent:{"percent":17}')).toBeInTheDocument();
  });

  it('omits the discount badge when only one plan is priced', () => {
    render(
      <ChannelPaywall
        channel={channel({ pricing: { currency: 'BRL', monthlyPriceCents: 2990, yearlyPriceCents: null } })}
        isLoggedIn
      />,
    );

    expect(screen.queryByText(/savePercent/)).toBeNull();
  });

  it('calls the subscribe mutation with the chosen interval when logged in', () => {
    render(<ChannelPaywall channel={channel()} isLoggedIn />);

    fireEvent.click(screen.getAllByText('subscribe')[0]);

    expect(mutate).toHaveBeenCalledWith({ channelId: 'ch-1', interval: 'MONTHLY' });
    expect(push).not.toHaveBeenCalled();
  });

  it('redirects to login with a return path instead of subscribing when logged out', () => {
    render(<ChannelPaywall channel={channel()} isLoggedIn={false} />);

    fireEvent.click(screen.getAllByText('subscribe')[0]);

    expect(push).toHaveBeenCalledWith('/login?redirect=%2Fchannels%2Fcanal');
    expect(mutate).not.toHaveBeenCalled();
  });

  it('gives the subscribe buttons a plan-specific aria-label', () => {
    render(<ChannelPaywall channel={channel()} isLoggedIn />);

    expect(
      screen.getByLabelText('subscribeAria:{"plan":"planNameMonthly"}'),
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText('subscribeAria:{"plan":"planNameYearly"}'),
    ).toBeInTheDocument();
  });

  it('gives the discount badge an aria-label', () => {
    render(<ChannelPaywall channel={channel()} isLoggedIn />);

    expect(screen.getByLabelText('savePercentAria:{"percent":17}')).toBeInTheDocument();
  });

  it('shows the unavailable message when pricing is not configured', () => {
    render(<ChannelPaywall channel={channel({ pricing: null })} isLoggedIn />);

    expect(screen.getByText('unavailable')).toBeInTheDocument();
    expect(screen.queryByText('subscribe')).toBeNull();
  });
});
