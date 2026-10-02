vi.mock('next-intl', () => ({
  useTranslations: () => {
    const t = (key: string, values?: Record<string, unknown>) =>
      values ? `${key}:${JSON.stringify(values)}` : key;
    t.rich = (key: string) => key;
    return t;
  },
  useFormatter: () => ({ dateTime: () => '21:06:12' }),
}));
vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a>,
}));
const router = { back: vi.fn(), push: vi.fn() };
vi.mock('next/navigation', () => ({
  usePathname: () => '/dashboard/platform/tracking/sessions/s1',
  useRouter: () => router,
}));
vi.mock('../../queries/get-session-journey', () => ({ useSessionJourneyQuery: vi.fn() }));

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SessionJourneyPage } from './SessionJourneyPage';
import { useSessionJourneyQuery } from '../../queries/get-session-journey';
import type { SessionJourney, SessionJourneyItem } from '@live-show/api-contracts';

const mocked = vi.mocked(useSessionJourneyQuery);
const ctx = { library: { name: 'showon-web', version: '1.0' }, sessionId: 's1' };

function item(over: Record<string, unknown>): SessionJourneyItem {
  return {
    type: 'track', event: 'event_viewed', messageId: 'm', anonymousId: 'anon_1', userId: null,
    timestamp: '2026-09-28T21:06:12.000Z', ts: '2026-09-28T21:06:12.000Z', violations: null,
    origin: 'client', node: 'event_viewed', context: ctx, properties: {},
    ...over,
  } as SessionJourneyItem;
}

function journey(over: Partial<SessionJourney> = {}): SessionJourney {
  return {
    sessionId: 's1', anonymousId: 'anon_1', userId: null,
    startedAt: '2026-09-28T21:06:12.000Z', endedAt: '2026-09-28T21:08:12.000Z',
    items: [
      item({ messageId: 'm1', event: 'first', node: 'first' }),
      item({ messageId: 'm2', type: 'identify', node: null, traits: {}, userId: 'u1' }),
      item({ messageId: 'm3', event: 'order_paid', node: 'order_paid', origin: 'server', ts: '2026-09-28T21:07:42.000Z' }),
    ],
    ...over,
  };
}

function renderPage(data?: SessionJourney, extra: Record<string, unknown> = {}) {
  mocked.mockReturnValue({ data, isLoading: false, isError: false, ...extra } as never);
  return render(<SessionJourneyPage sessionId="s1" anonymousId="anon_1" trackingEnabled />);
}

describe('SessionJourneyPage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('numbers steps only for items with a node, in received order', () => {
    renderPage(journey());
    expect(screen.getByText('journey.step:{"n":1}')).toBeInTheDocument();
    expect(screen.getByText('journey.step:{"n":2}')).toBeInTheDocument();
    expect(screen.queryByText('journey.step:{"n":3}')).not.toBeInTheDocument();
    const names = screen.getAllByText(/^(first|order_paid)$/).map((n) => n.textContent);
    expect(names).toEqual(['first', 'order_paid']);
  });

  it('badges server-origin items only', () => {
    renderPage(journey());
    expect(screen.getAllByText('journey.serverBadge')).toHaveLength(1);
  });

  it('shows the gap to the previous item', () => {
    renderPage(journey());
    expect(screen.getByText('journey.sincePrevious:{"duration":"1m 30s"}')).toBeInTheDocument();
  });

  it('links to the user profile when the session has a userId', () => {
    renderPage(journey({ userId: 'usr_9' }));
    expect(screen.getByText('journey.viewProfile').closest('a')).toHaveAttribute('href', '/dashboard/platform/tracking/users/usr_9');
  });

  it('shows "anonymous" without a userId', () => {
    renderPage(journey());
    expect(screen.getByText('journey.anonymous')).toBeInTheDocument();
    expect(screen.queryByText('journey.viewProfile')).not.toBeInTheDocument();
  });

  it('shows the not-found state on a 404', () => {
    renderPage(undefined, { isError: true, error: { isAxiosError: true, response: { status: 404 } } });
    expect(screen.getByText('journey.notFound')).toBeInTheDocument();
  });

  it('Voltar goes back in history when there is one', () => {
    vi.spyOn(window.history, 'length', 'get').mockReturnValue(3);
    renderPage(journey());
    fireEvent.click(screen.getByText('journey.back'));
    expect(router.back).toHaveBeenCalled();
    expect(router.push).not.toHaveBeenCalled();
  });

  it('Voltar falls back to Caminhos on a direct visit', () => {
    vi.spyOn(window.history, 'length', 'get').mockReturnValue(1);
    renderPage(journey());
    fireEvent.click(screen.getByText('journey.back'));
    expect(router.push).toHaveBeenCalledWith('/dashboard/platform/tracking/paths');
  });

  it('shows a Voltar button in the 404 state that goes back', () => {
    vi.spyOn(window.history, 'length', 'get').mockReturnValue(3);
    renderPage(undefined, { isError: true, error: { isAxiosError: true, response: { status: 404 } } });
    const backs = screen.getAllByText('journey.back'); // shell link + the 404 state's button
    expect(backs).toHaveLength(2);
    fireEvent.click(backs[1]);
    expect(router.back).toHaveBeenCalled();
  });

  it('counts the PASSOS meta in collapsed steps', () => {
    renderPage(journey({ items: [
      item({ messageId: 'm1', node: 'page:/a' }),
      item({ messageId: 'm2', node: 'page:/a' }),
      item({ messageId: 'm3', node: 'b' }),
    ] }));
    const cell = screen.getByText('journey.steps').parentElement!;
    expect(cell).toHaveTextContent('2');
  });
});
