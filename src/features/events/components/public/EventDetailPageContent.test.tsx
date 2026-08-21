import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ back: vi.fn() }) }));
// Tem suíte própria (auth, otimismo, a11y) e depende de QueryClient; aqui só
// interessa que a página o monte com o id do evento.
vi.mock('@/features/wishlist', () => ({
  WishlistButton: ({ eventId }: { eventId: string }) => (
    <button data-testid="wishlist-button" data-event-id={eventId} />
  ),
}));
vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a>,
}));
vi.mock('../../queries/get-event', () => ({
  useGetEventQuery: vi.fn(),
  useListTicketProductsQuery: vi.fn(() => ({ data: [] })),
}));
vi.mock('@/features/streams/queries/streams.queries', () => ({
  useEventCamerasQuery: vi.fn(() => ({ cameras: [], isLoading: false })),
}));
vi.mock('@/features/organizations', () => ({ useOrganization: vi.fn(() => ({ data: null })) }));
vi.mock('@/features/account/hooks/use-auth', () => ({ useAuth: vi.fn(() => ({ user: null })) }));
vi.mock('../../hooks/use-track-event-view', () => ({ useTrackEventView: vi.fn() }));
vi.mock('@/features/advertisements', () => ({ AdBanner: () => null }));
vi.mock('@/features/reports', () => ({ ReportButton: () => null }));
vi.mock('./TicketPanel', () => ({ TicketPanel: () => null }));

import { render, screen, fireEvent } from '@testing-library/react';
import { EventDetailPageContent } from './EventDetailPageContent';
import { useGetEventQuery } from '../../queries/get-event';
import { useEventCamerasQuery } from '@/features/streams/queries/streams.queries';
import { useOrganization } from '@/features/organizations';
import type { EventResponse } from '../../types/event.types';

const BANNER = 'https://example.com/banner.jpg';
const TEASER = 'https://example.com/teaser.mp4';

function makeEvent(overrides: Partial<EventResponse> = {}): EventResponse {
  return {
    id: 'evt-1',
    title: 'Show Teste',
    description: 'desc',
    category: 'MUSIC',
    organizationId: 'org-1',
    organization: null,
    startsAt: '2026-08-10T20:00:00.000Z',
    endsAt: '2026-08-10T22:00:00.000Z',
    status: 'LIVE',
    bannerUrl: BANNER,
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

function renderWithEvent(event: EventResponse) {
  vi.mocked(useGetEventQuery).mockReturnValue({
    data: event,
    isLoading: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
  } as unknown as ReturnType<typeof useGetEventQuery>);

  return render(<EventDetailPageContent id={event.id} />);
}

describe('EventDetailPageContent hero media', () => {
  beforeEach(() => {
    window.matchMedia = vi.fn().mockImplementation((q: string) => ({
      matches: false,
      media: q,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      onchange: null,
      dispatchEvent: () => false,
    }));
    vi.spyOn(window.HTMLMediaElement.prototype, 'play').mockImplementation(() => Promise.resolve());
    vi.spyOn(window.HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders the teaser video over the banner when teaserVideoUrl is set', () => {
    const { container } = renderWithEvent(makeEvent({ teaserVideoUrl: TEASER }));

    const video = container.querySelector('video');
    expect(video).toHaveAttribute('src', TEASER);
    // Single static hero: always active, so it autoplays.
    expect((video as HTMLVideoElement).autoplay).toBe(true);
    expect(screen.getByAltText('Show Teste')).toHaveAttribute('src', BANNER);
  });

  it('renders the banner image only when teaserVideoUrl is absent', () => {
    const { container } = renderWithEvent(makeEvent());

    expect(container.querySelector('video')).toBeNull();
    expect(screen.getByAltText('Show Teste')).toHaveAttribute('src', BANNER);
  });

  it('falls back to the banner image when the teaser errors', () => {
    const { container } = renderWithEvent(makeEvent({ teaserVideoUrl: TEASER }));

    fireEvent.error(container.querySelector('video') as HTMLVideoElement);

    expect(container.querySelector('video')).toBeNull();
    expect(screen.getByAltText('Show Teste')).toBeInTheDocument();
  });

  it('falls back to the thumbnail when there is no banner', () => {
    renderWithEvent(makeEvent({ bannerUrl: null, thumbnailUrl: 'https://example.com/thumb.jpg' }));

    expect(screen.getByAltText('Show Teste')).toHaveAttribute('src', 'https://example.com/thumb.jpg');
  });

  it('renders the placeholder when the event has no image at all', () => {
    const { container } = renderWithEvent(makeEvent({ bannerUrl: null, thumbnailUrl: null }));

    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('video')).toBeNull();
    expect(container.querySelector('[class*="heroPlaceholder"]')).not.toBeNull();
  });

  it('degrades to the placeholder when the poster image itself fails to load', () => {
    const { container } = renderWithEvent(makeEvent({ teaserVideoUrl: TEASER }));

    fireEvent.error(screen.getByAltText('Show Teste'));

    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('[class*="heroPlaceholder"]')).not.toBeNull();
  });

  it('keeps the hero overlay content rendering alongside the media', () => {
    renderWithEvent(makeEvent({ teaserVideoUrl: TEASER }));

    expect(screen.getByRole('heading', { name: 'Show Teste' })).toBeInTheDocument();
    expect(screen.getByText('Arena')).toBeInTheDocument();
    expect(screen.getByText('AO VIVO')).toBeInTheDocument();
    expect(screen.getByText(/3 CÂMERAS/)).toBeInTheDocument();
  });
});

// The production topology reads (streams/stages/feeds/cameras) are org-admin
// only. An anonymous visitor on this public page would get 401/403 from all of
// them, so the page must not reach for them at all.
describe('EventDetailPageContent camera topology', () => {
  it('never queries the org-gated camera topology', () => {
    renderWithEvent(makeEvent());

    expect(useEventCamerasQuery).not.toHaveBeenCalled();
  });

  it('takes the camera count from the public event payload', () => {
    renderWithEvent(makeEvent({ camerasCount: 7 }));

    expect(screen.getByText(/7 CÂMERAS/)).toBeInTheDocument();
  });

  it('hides the camera chip when the event reports no cameras', () => {
    renderWithEvent(makeEvent({ camerasCount: 0 }));

    expect(screen.queryByText(/CÂMERAS/)).toBeNull();
  });
});

describe('EventDetailPageContent wishlist', () => {
  /**
   * A página do evento é onde a pessoa decide se quer assistir, então é onde
   * salvar precisa estar. O id passado tem de ser o do evento aberto — errar
   * isso favoritaria outro evento sem nenhum sinal na tela.
   */
  it('offers a wishlist toggle for the event being viewed', () => {
    renderWithEvent(makeEvent());

    expect(screen.getByTestId('wishlist-button')).toHaveAttribute('data-event-id', 'evt-1');
  });
});

describe('EventDetailPageContent attribution', () => {
  const owner = { id: 'org-1', name: 'Dona do Show', slug: 'dona-do-show', logoUrl: null };

  it('renders only the owner when the event has no collaborators', () => {
    vi.mocked(useOrganization).mockReturnValue({ data: owner } as unknown as ReturnType<typeof useOrganization>);

    renderWithEvent(makeEvent({ collaborators: [] }));

    expect(screen.getByText('Dona do Show')).toBeInTheDocument();
    expect(screen.queryByText('withCollaborators')).toBeNull();
  });

  it('renders the owner and links each collaborator to its org page', () => {
    vi.mocked(useOrganization).mockReturnValue({ data: owner } as unknown as ReturnType<typeof useOrganization>);

    renderWithEvent(makeEvent({
      collaborators: [
        { id: 'org-2', name: 'Colaboradora Um', slug: 'colaboradora-um', logoUrl: null },
        { id: 'org-3', name: 'Colaboradora Dois', slug: 'colaboradora-dois', logoUrl: null },
      ],
    }));

    expect(screen.getByText('organizedBy')).toBeInTheDocument();
    expect(screen.getByText('Dona do Show')).toBeInTheDocument();

    const collab1 = screen.getByText('Colaboradora Um').closest('a');
    const collab2 = screen.getByText('Colaboradora Dois').closest('a');
    expect(collab1).toHaveAttribute('href', '/o/colaboradora-um');
    expect(collab2).toHaveAttribute('href', '/o/colaboradora-dois');
  });
});
