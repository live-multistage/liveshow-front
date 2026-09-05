import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => 'pt-BR',
}));
vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock('@/features/account/hooks/use-auth', () => ({ useAuth: () => ({ isLoggedIn: true }) }));

// Progresso tem suíte própria; aqui o default é "ninguém começou nada", e os
// testes que precisam de progresso sobrescrevem.
const usePlaybackProgressQuery = vi.fn(() => ({ data: [] }));
vi.mock('@/features/playback-progress', () => ({
  usePlaybackProgressQuery: () => usePlaybackProgressQuery(),
}));

const useAccessibleEventsQuery = vi.fn();
vi.mock('../queries/get-accessible-events', () => ({
  useAccessibleEventsQuery: () => useAccessibleEventsQuery(),
}));

// Recomendados têm suíte própria; aqui o default é "sem recomendações", e o
// teste do teaser sobrescreve.
const useRecommendedEventsQuery = vi.fn(() => ({ data: undefined }));
vi.mock('@/features/events', () => ({
  ShowCard: ({ show }: { show: { id: string; title: string } }) => (
    <a href={`/events/${show.id}`}>{show.title}</a>
  ),
  eventToShow: (event: { id: string; title: string }) => ({ id: event.id, title: event.title }),
  useRecommendedEventsQuery: () => useRecommendedEventsQuery(),
}));

// O shell visual (EmptyStatePanel) tem dono e suíte próprios; aqui só
// verificamos que esta página passa a copy certa para ele.
vi.mock('@/shared/components/EmptyStatePanel/EmptyStatePanel', () => ({
  EmptyStatePanel: ({ badge, title, text }: { badge: string; title: string; text: string }) => (
    <div data-testid="empty-panel">
      <p>{badge}</p>
      <h2>{title}</h2>
      <p>{text}</p>
    </div>
  ),
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

beforeEach(() => {
  useAccessibleEventsQuery.mockReset();
  useRecommendedEventsQuery.mockReturnValue({ data: undefined });
});

describe('MyListPageContent', () => {
  it('lists the events once loaded', () => {
    state({ data: [EVENT] });
    render(<MyListPageContent />);

    expect(screen.getByText('Rock in Rio')).toBeInTheDocument();
  });

  it('shows placeholders while loading, and neither the empty panel nor the error state', () => {
    state({ isLoading: true });
    render(<MyListPageContent />);

    expect(screen.queryByTestId('empty-panel')).not.toBeInTheDocument();
    expect(screen.queryByText('loadError')).not.toBeInTheDocument();
  });

  it('shows the empty-state panel with the TODOS copy when the list is genuinely empty', () => {
    state({ data: [] });
    render(<MyListPageContent />);

    expect(screen.getByTestId('empty-panel')).toBeInTheDocument();
    expect(screen.getByText('emptyState.all.badge')).toBeInTheDocument();
    expect(screen.getByText('emptyState.all.title')).toBeInTheDocument();
  });

  /**
   * A lista vazia continua vazia qualquer que seja o filtro escolhido, mas a
   * copy do painel muda — trocar de filtro é a forma da pessoa entender o que
   * cada aba promete antes de ter qualquer evento nela.
   */
  it('shows the replays copy when the REPLAYS filter is selected while the list is empty', () => {
    state({ data: [] });
    render(<MyListPageContent />);

    fireEvent.click(screen.getByRole('button', { name: 'filters.replays' }));

    expect(screen.getByText('emptyState.replays.badge')).toBeInTheDocument();
    expect(screen.queryByText('emptyState.all.badge')).not.toBeInTheDocument();
  });

  it('renders up to 4 recommended events in the teaser below the empty panel', () => {
    state({ data: [] });
    useRecommendedEventsQuery.mockReturnValue({
      data: {
        items: [
          { id: 'r1', title: 'Show 1' },
          { id: 'r2', title: 'Show 2' },
          { id: 'r3', title: 'Show 3' },
          { id: 'r4', title: 'Show 4' },
          { id: 'r5', title: 'Show 5' },
        ],
      },
    });
    render(<MyListPageContent />);

    expect(screen.getByText('Show 1')).toBeInTheDocument();
    expect(screen.getByText('Show 4')).toBeInTheDocument();
    expect(screen.queryByText('Show 5')).not.toBeInTheDocument();
  });

  it('hides the teaser when there are no recommended events', () => {
    state({ data: [] });
    useRecommendedEventsQuery.mockReturnValue({ data: { items: [] } });
    render(<MyListPageContent />);

    expect(screen.getByTestId('empty-panel')).toBeInTheDocument();
    expect(screen.queryByText('teaser.eyebrow')).not.toBeInTheDocument();
  });

  /**
   * Falha de carregamento NÃO pode virar o estado vazio: dizer "você não tem
   * nenhum evento" a quem tem, porque a rede caiu, é uma mentira — e o usuário
   * não teria como saber que era só tentar de novo.
   */
  it('reports a load failure as an error, never as the empty panel', () => {
    state({ isError: true });
    render(<MyListPageContent />);

    expect(screen.getByRole('alert')).toHaveTextContent('loadError');
    expect(screen.queryByTestId('empty-panel')).not.toBeInTheDocument();
  });

  it('narrows the list as the user searches', () => {
    state({ data: [EVENT, { ...EVENT, id: 'ev-2', title: 'Campus Party' }] });
    render(<MyListPageContent />);

    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'campus' } });

    expect(screen.getByText('Campus Party')).toBeInTheDocument();
    expect(screen.queryByText('Rock in Rio')).not.toBeInTheDocument();
  });

  /**
   * Vazio POR BUSCA não é vazio de conta. Mostrar o painel grande de "sua
   * lista está vazia" a quem tem dois eventos, só porque a busca não casou,
   * mandaria a pessoa comprar de novo o que ela já comprou.
   */
  it('shows the compact noResults state — not the empty panel — when a search matches nothing', () => {
    state({ data: [EVENT] });
    render(<MyListPageContent />);

    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'zzz' } });

    expect(screen.getByText('noResults')).toBeInTheDocument();
    expect(screen.queryByTestId('empty-panel')).not.toBeInTheDocument();
  });

  it('lets the user retry after a failure', () => {
    const refetch = vi.fn();
    state({ isError: true, refetch });
    render(<MyListPageContent />);

    fireEvent.click(screen.getByRole('button', { name: 'retry' }));

    expect(refetch).toHaveBeenCalled();
  });
});
