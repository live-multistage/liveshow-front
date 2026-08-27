import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { PublicChannel } from '../types/channel.types';
import { ChannelPaywall } from './ChannelPaywall';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string, values?: Record<string, unknown>) =>
    values ? `${key}:${JSON.stringify(values)}` : key,
  useLocale: () => 'pt-BR',
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
    source: { mode: 'own', reason: 'own', event: null },
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

  it('shows the yearly discount badge with its aria-label when both prices exist', () => {
    // 29.90 * 12 = 358.80; 1 - 299/358.8 = ~0.1667 -> 17%
    render(<ChannelPaywall channel={channel()} isLoggedIn />);

    expect(screen.getByText('savePercent:{"percent":17}')).toBeInTheDocument();
    expect(screen.getByLabelText('savePercentAria:{"percent":17}')).toBeInTheDocument();
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

  it('defaults to the yearly plan and subscribes yearly on the single CTA', () => {
    render(<ChannelPaywall channel={channel()} isLoggedIn />);

    // Yearly is pre-selected, so the CTA names the yearly plan.
    fireEvent.click(screen.getByText(/^cta:/));

    expect(mutate).toHaveBeenCalledWith({ channelId: 'ch-1', interval: 'YEARLY' });
    expect(push).not.toHaveBeenCalled();
  });

  it('subscribes with the interval of the selected plan card', () => {
    render(<ChannelPaywall channel={channel()} isLoggedIn />);

    // Select the monthly card (radio), then hit the CTA.
    fireEvent.click(screen.getByRole('radio', { name: 'monthly' }));
    fireEvent.click(screen.getByText(/^cta:/));

    expect(mutate).toHaveBeenCalledWith({ channelId: 'ch-1', interval: 'MONTHLY' });
  });

  it('redirects to login with a return path instead of subscribing when logged out', () => {
    render(<ChannelPaywall channel={channel()} isLoggedIn={false} />);

    fireEvent.click(screen.getByText(/^cta:/));

    expect(push).toHaveBeenCalledWith('/login?redirect=%2Fchannels%2Fcanal');
    expect(mutate).not.toHaveBeenCalled();
  });

  it('defaults to monthly when the channel only prices a monthly plan', () => {
    render(
      <ChannelPaywall
        channel={channel({ pricing: { currency: 'BRL', monthlyPriceCents: 2990, yearlyPriceCents: null } })}
        isLoggedIn
      />,
    );

    fireEvent.click(screen.getByText(/^cta:/));

    expect(mutate).toHaveBeenCalledWith({ channelId: 'ch-1', interval: 'MONTHLY' });
  });

  it('shows the unavailable message and no CTA when pricing is not configured', () => {
    render(<ChannelPaywall channel={channel({ pricing: null })} isLoggedIn />);

    expect(screen.getByText('unavailable')).toBeInTheDocument();
    expect(screen.queryByText(/^cta:/)).toBeNull();
  });
});
