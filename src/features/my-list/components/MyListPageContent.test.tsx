import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

const useAccessibleEventsQuery = vi.fn();
vi.mock('../queries/get-accessible-events', () => ({
  useAccessibleEventsQuery: () => useAccessibleEventsQuery(),
}));

import { render, screen, fireEvent } from '@testing-library/react';
import { MyListPageContent } from './MyListPageContent';
import type { AccessibleEvent } from '../types/my-list.types';

const EVENT: AccessibleEvent = {
  id: 'ev-1',
  title: 'Rock in Rio',
  status: 'LIVE',
  startsAt: '2026-01-01T20:00:00.000Z',
  endsAt: '2026-01-01T22:00:00.000Z',
  thumbnailUrl: null,
  bannerUrl: null,
  venue: null,
  city: null,
  capabilities: ['LIVE_VIEW'],
  canWatchLive: true,
  canWatchReplay: false,
};

function state(overrides: Record<string, unknown> = {}) {
  useAccessibleEventsQuery.mockReturnValue({
    data: undefined,
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
    ...overrides,
  });
}

beforeEach(() => useAccessibleEventsQuery.mockReset());

describe('MyListPageContent', () => {
  it('lists the events once loaded', () => {
    state({ data: [EVENT] });
    render(<MyListPageContent />);

    expect(screen.getByText('Rock in Rio')).toBeInTheDocument();
  });

  it('shows placeholders while loading, and neither the empty nor the error state', () => {
    state({ isLoading: true });
    render(<MyListPageContent />);

    expect(screen.queryByText('empty')).not.toBeInTheDocument();
    expect(screen.queryByText('loadError')).not.toBeInTheDocument();
  });

  it('invites the user to browse when the list is genuinely empty', () => {
    state({ data: [] });
    render(<MyListPageContent />);

    expect(screen.getByText('empty')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'exploreEvents' })).toHaveAttribute('href', '/events');
  });

  /**
   * Falha de carregamento NÃO pode virar o estado vazio: dizer "você não tem
   * nenhum evento" a quem tem, porque a rede caiu, é uma mentira — e o usuário
   * não teria como saber que era só tentar de novo.
   */
  it('reports a load failure as an error, never as an empty list', () => {
    state({ isError: true });
    render(<MyListPageContent />);

    expect(screen.getByRole('alert')).toHaveTextContent('loadError');
    expect(screen.queryByText('empty')).not.toBeInTheDocument();
    expect(screen.queryByText('exploreEvents')).not.toBeInTheDocument();
  });

  it('lets the user retry after a failure', () => {
    const refetch = vi.fn();
    state({ isError: true, refetch });
    render(<MyListPageContent />);

    fireEvent.click(screen.getByRole('button', { name: 'retry' }));

    expect(refetch).toHaveBeenCalled();
  });
});
