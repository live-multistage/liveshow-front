import { describe, it, expect, vi, beforeEach } from 'vitest';

const state = vi.hoisted(() => ({
  push: vi.fn(),
  track: vi.fn(),
  addToCartMutate: vi.fn(),
  auth: { isLoggedIn: false, user: null as { id: string } | null },
  liveAccess: { data: false as boolean | undefined, isLoading: false },
  replayAccess: { data: false as boolean | undefined, isLoading: false },
  playback: { data: { live: false } },
  myTickets: { data: [] as string[] | undefined, isLoading: false },
  cartItems: [] as Array<{ ticketProductId: string }>,
}));

vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: state.push }) }));
vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a>,
}));
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
vi.mock('@/features/checkout/services/checkout.service', () => ({
  checkoutService: { claimFreeTicket: vi.fn() },
}));
vi.mock('../../queries/get-event', () => ({
  useServiceFeeRateQuery: () => ({ data: 0 }),
  eventKeys: { myTickets: (id: string) => ['events', 'my-tickets', id] },
  useMyEventTicketsQuery: () => state.myTickets,
}));
vi.mock('@/features/cart', () => ({
  useAddToCartMutation: () => ({ mutate: state.addToCartMutate, isPending: false }),
  useCartQuery: () => ({ data: { items: state.cartItems } }),
}));
vi.mock('@/lib/analytics/tracking', () => ({ useAnalytics: () => ({ track: state.track }) }));
vi.mock('@/features/account', () => ({ useAuth: () => state.auth }));
vi.mock('@/features/streaming/queries/live.queries', () => ({
  LIVE_KEYS: {
    access: (id: string) => ['live', 'access', id],
    replayAccess: (id: string) => ['live', 'replay-access', id],
    playback: (id: string) => ['live', 'playback', id],
    replayPlayback: (id: string) => ['live', 'replay-playback', id],
  },
  useLiveAccessQuery: () => state.liveAccess,
  useReplayAccessQuery: () => state.replayAccess,
  useLivePlaybackQuery: () => state.playback,
}));

import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { toast } from 'sonner';
import { checkoutService } from '@/features/checkout/services/checkout.service';
import { TicketPanel } from './TicketPanel';
import type { EventResponse, TicketProductResponse } from '../../types/event.types';

const claimFreeTicket = vi.mocked(checkoutService.claimFreeTicket);

function makeEvent(overrides: Partial<EventResponse> = {}): EventResponse {
  return {
    id: 'evt-1',
    slug: 'evt-1-slug',
    title: 'Show Teste',
    description: 'desc',
    category: 'MUSIC',
    organizationId: 'org-1',
    organization: null,
    startsAt: '2026-08-10T20:00:00.000Z',
    endsAt: '2026-08-10T22:00:00.000Z',
    status: 'PUBLISHED',
    bannerUrl: null,
    thumbnailUrl: null,
    teaserVideoUrl: null,
    finishedAt: null,
    venue: 'Arena',
    city: 'São Paulo',
    country: 'Brasil',
    venueData: null,
    visibility: 'PUBLIC',
    format: 'LIVE',
    latencyMode: 'STANDARD',
    domain: null,
    subtype: null,
    camerasCount: 3,
    isFree: false,
    publiclyFunded: false,
    lifecycle: { idleFinishMinutes: 10 },
    ...overrides,
  };
}

function makeTicket(overrides: Partial<TicketProductResponse> = {}): TicketProductResponse {
  return {
    id: 'tp-free',
    eventId: 'evt-1',
    name: 'Ingresso',
    description: '',
    price: 0,
    currency: 'BRL',
    capabilities: ['LIVE_VIEW'],
    camerasLimit: null,
    allowedStageIds: [],
    allowedStreamIds: [],
    capacity: null,
    remaining: null,
    soldOut: false,
    immutable: false,
    ...overrides,
  };
}

const FREE = makeTicket();
const PAID = makeTicket({
  id: 'tp-pro',
  name: 'Pro',
  price: 39.9,
  capabilities: ['LIVE_VIEW', 'REPLAY_VIEW'],
});

function renderPanel(tickets: TicketProductResponse[], event = makeEvent()) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <TicketPanel event={event} tickets={tickets} />
    </QueryClientProvider>,
  );
}

const watchButton = () => screen.getByRole('button', { name: /watch/ });

beforeEach(() => {
  vi.clearAllMocks();
  state.track.mockClear();
  state.addToCartMutate.mockReset();
  state.auth = { isLoggedIn: false, user: null };
  state.liveAccess = { data: false, isLoading: false };
  state.replayAccess = { data: false, isLoading: false };
  state.playback = { data: { live: false } };
  state.myTickets = { data: [], isLoading: false };
  state.cartItems = [];
  window.matchMedia = vi.fn().mockImplementation((q: string) => ({
    matches: false, media: q, addEventListener: () => {}, removeEventListener: () => {},
    addListener: () => {}, removeListener: () => {}, onchange: null, dispatchEvent: () => false,
  }));
  window.IntersectionObserver = class {
    observe() {}
    disconnect() {}
    unobserve() {}
  } as unknown as typeof IntersectionObserver;
});

describe('TicketPanel direct watch', () => {
  it('shows a single watch button when the only ticket product is free', () => {
    renderPanel([FREE]);

    expect(watchButton()).toBeInTheDocument();
    expect(screen.queryByText('addToCart')).not.toBeInTheDocument();
    expect(screen.queryByText('buyTicket')).not.toBeInTheDocument();
  });

  it('tells the viewer what the free ticket grants, since the tier list is skipped', () => {
    renderPanel([makeTicket({ capabilities: ['LIVE_VIEW', 'REPLAY_VIEW'] })]);

    expect(screen.getByText('chipLive')).toBeInTheDocument();
    expect(screen.getByText('chipReplay')).toBeInTheDocument();
  });

  it('keeps the normal ticket flow when a free tier sits next to a paid tier', () => {
    renderPanel([FREE, PAID]);

    expect(screen.queryByRole('button', { name: /watch/ })).not.toBeInTheDocument();
    expect(screen.getByText('buyTicket')).toBeInTheDocument();
    // The paid tier stays visible — it carries REPLAY_VIEW the free one lacks.
    expect(screen.getByText('Ingresso')).toBeInTheDocument();
    expect(screen.getByText('Pro')).toBeInTheDocument();
    expect(screen.getByText('chipReplay')).toBeInTheDocument();
  });

  it('keeps the normal ticket flow when the event has several free products', () => {
    renderPanel([FREE, makeTicket({ id: 'tp-free-2', name: 'Gratuito 2' })]);

    expect(screen.queryByRole('button', { name: /watch/ })).not.toBeInTheDocument();
    expect(screen.getByText('buyTicket')).toBeInTheDocument();
    expect(screen.getByText('Ingresso')).toBeInTheDocument();
    expect(screen.getByText('Gratuito 2')).toBeInTheDocument();
  });

  it('keeps the normal ticket flow when the only product is paid', () => {
    renderPanel([PAID]);

    expect(screen.queryByRole('button', { name: /watch/ })).not.toBeInTheDocument();
    expect(screen.getByText('addToCart')).toBeInTheDocument();
  });

  it('routes a logged-out viewer to login with a redirect back, without claiming', async () => {
    renderPanel([FREE]);

    await userEvent.click(watchButton());

    expect(state.push).toHaveBeenCalledWith('/login?redirect=%2Fevents%2Fevt-1-slug');
    expect(claimFreeTicket).not.toHaveBeenCalled();
  });

  it('claims the free ticket and then goes to the player', async () => {
    state.auth = { isLoggedIn: true, user: { id: 'u-1' } };
    claimFreeTicket.mockResolvedValue({ granted: true } as Awaited<ReturnType<typeof checkoutService.claimFreeTicket>>);

    renderPanel([FREE]);
    await userEvent.click(watchButton());

    await waitFor(() => expect(state.push).toHaveBeenCalledWith('/live/evt-1'));
    // The claim rides checkoutService — the same request path that carries the
    // x-attribution-* headers the ads product credits conversions from.
    expect(claimFreeTicket).toHaveBeenCalledWith('tp-free');
  });

  it('sends a finished replay-only event to the replay player', async () => {
    state.auth = { isLoggedIn: true, user: { id: 'u-1' } };
    claimFreeTicket.mockResolvedValue({ granted: true } as Awaited<ReturnType<typeof checkoutService.claimFreeTicket>>);

    renderPanel(
      [makeTicket({ capabilities: ['LIVE_VIEW', 'REPLAY_VIEW'] })],
      makeEvent({ status: 'FINISHED' }),
    );
    await userEvent.click(watchButton());

    await waitFor(() => expect(state.push).toHaveBeenCalledWith('/replay/evt-1'));
  });

  it('surfaces the error and stays put when the claim fails', async () => {
    state.auth = { isLoggedIn: true, user: { id: 'u-1' } };
    claimFreeTicket.mockRejectedValue({
      isAxiosError: true,
      response: { status: 409, data: { message: 'Acesso indisponível.' } },
    });

    renderPanel([FREE]);
    await userEvent.click(watchButton());

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Acesso indisponível.'));
    expect(state.push).not.toHaveBeenCalled();
    expect(watchButton()).toBeEnabled();
  });

  it('takes a viewer who already has the grant straight to the player, with no claim', async () => {
    state.auth = { isLoggedIn: true, user: { id: 'u-1' } };
    state.liveAccess = { data: true, isLoading: false };
    state.playback = { data: { live: true } };

    renderPanel([FREE]);

    expect(screen.getByRole('link', { name: /watchNow/ })).toHaveAttribute('href', '/live/evt-1');
    expect(screen.getByText('chipLive')).toBeInTheDocument();
    expect(claimFreeTicket).not.toHaveBeenCalled();
  });

  it('fires payment_submitted (FREE) before claiming a sole free ticket', async () => {
    state.auth = { isLoggedIn: true, user: { id: 'u-1' } };
    claimFreeTicket.mockResolvedValue({ granted: true } as Awaited<ReturnType<typeof checkoutService.claimFreeTicket>>);

    renderPanel([FREE]);
    await userEvent.click(watchButton());

    await waitFor(() => expect(claimFreeTicket).toHaveBeenCalled());
    expect(state.track).toHaveBeenCalledWith('payment_submitted', { method: 'FREE', totalCents: 0 });
  });

  it('fires cart_item_added on "add to cart", with price converted to cents and the post-add cart size', async () => {
    state.auth = { isLoggedIn: true, user: { id: 'u-1' } };
    state.addToCartMutate.mockImplementation(
      (_id: string, opts: { onSuccess?: (v: { items: unknown[] }) => void }) =>
        opts.onSuccess?.({ items: [{}] }),
    );

    renderPanel([PAID]);
    await userEvent.click(screen.getByRole('button', { name: 'addToCart' }));

    expect(state.track).toHaveBeenCalledWith('cart_item_added', {
      eventId: 'evt-1',
      tier: 'Pro',
      priceCents: 3990,
      cartSize: 1,
    });
  });

  it('fires cart_item_added on "buy now", then routes to checkout', async () => {
    state.auth = { isLoggedIn: true, user: { id: 'u-1' } };
    state.addToCartMutate.mockImplementation(
      (_id: string, opts: { onSuccess?: (v: { items: unknown[] }) => void }) =>
        opts.onSuccess?.({ items: [{}] }),
    );

    renderPanel([PAID]);
    await userEvent.click(screen.getByRole('button', { name: 'buyTicket' }));

    expect(state.track).toHaveBeenCalledWith('cart_item_added', {
      eventId: 'evt-1',
      tier: 'Pro',
      priceCents: 3990,
      cartSize: 1,
    });
    expect(state.push).toHaveBeenCalledWith('/checkout');
  });
});

describe('TicketPanel tier tracking', () => {
  it('tracks ticket_tier_selected with the price in integer cents when a tier is picked', async () => {
    renderPanel([FREE, PAID]);

    await userEvent.click(screen.getByText('Pro'));

    expect(state.track).toHaveBeenCalledWith('ticket_tier_selected', {
      eventId: 'evt-1',
      tier: 'Pro',
      priceCents: 3990,
    });
  });
});

describe('TicketPanel — per-product ownership', () => {
  beforeEach(() => {
    state.auth = { isLoggedIn: true, user: { id: 'u-1' } };
    state.liveAccess = { data: true, isLoading: false };
    state.playback = { data: { live: true } };
  });

  it('a free-ticket owner during LIVE still sees the paid tier with its buy actions', () => {
    state.myTickets = { data: ['tp-free'], isLoading: false };

    renderPanel([FREE, PAID], makeEvent({ status: 'LIVE' }));

    expect(screen.getByText('Pro')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'buyTicket' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'addToCart' })).toBeInTheDocument();
    expect(screen.queryByText('ticketSecured')).not.toBeInTheDocument();
    expect(screen.getByText('upgradeNote')).toBeInTheDocument();
  });

  it('marks the owned product "yourTicket" and never offers it again', () => {
    state.myTickets = { data: ['tp-free'], isLoading: false };

    renderPanel([FREE, PAID], makeEvent({ status: 'LIVE' }));

    const owned = screen.getByText('yourTicket').closest('[data-owned]') as HTMLElement;
    expect(owned).toHaveTextContent('Ingresso');
    expect(within(owned).queryByRole('button')).toBeNull();
    expect(screen.queryByText('claimFree')).not.toBeInTheDocument();
  });

  it('buys the first product the viewer does not own', async () => {
    state.myTickets = { data: ['tp-free'], isLoading: false };

    renderPanel([FREE, PAID], makeEvent({ status: 'LIVE' }));
    await userEvent.click(screen.getByRole('button', { name: 'buyTicket' }));

    expect(state.addToCartMutate).toHaveBeenCalledWith('tp-pro', expect.any(Object));
  });

  it('owning every product shows the secured panel', () => {
    state.myTickets = { data: ['tp-free', 'tp-pro'], isLoading: false };

    renderPanel([FREE, PAID], makeEvent({ status: 'LIVE' }));

    expect(screen.getByText('ticketSecured')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /watchNow/ })).toHaveAttribute('href', '/live/evt-1');
  });

  // Ruling: an empty owned list while loading must never read as "access with
  // no product behind it" (secured) and then flip.
  it('does not flash the secured state while the owned list is loading', () => {
    state.myTickets = { data: undefined, isLoading: true };

    renderPanel([FREE, PAID], makeEvent({ status: 'LIVE' }));

    expect(screen.queryByText('ticketSecured')).not.toBeInTheDocument();
    expect(screen.getByText('Pro')).toBeInTheDocument();
  });

  it('a product already in the cart links straight to checkout', () => {
    state.myTickets = { data: ['tp-free'], isLoading: false };
    state.cartItems = [{ ticketProductId: 'tp-pro' }];

    renderPanel([FREE, PAID], makeEvent({ status: 'LIVE' }));

    expect(screen.getByRole('link', { name: 'inCartGoToCheckout' })).toHaveAttribute('href', '/checkout');
  });
});
