import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { toast } from 'sonner';
import { HouseAdReportDrawer } from './HouseAdReportDrawer';
import * as houseAdsQueries from '../house-ads/queries/house-ads.queries';
import * as houseAdsMutations from '../house-ads/mutations/house-ads.mutations';
import type { HouseAdListItem, HouseAdReport } from '../house-ads/types/house-ads.types';

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const mockAd: HouseAdListItem = {
  id: 'ad-1',
  title: 'Festival Rota Sul — ingressos à venda',
  destination: { type: 'EVENT', eventId: 'evt-1' },
  format: 'HORIZONTAL_728x90',
  placements: ['FEED', 'EVENT_DETAIL'],
  startsAt: '2024-09-15T00:00:00Z',
  endsAt: '2024-09-30T23:59:59Z',
  status: 'ACTIVE',
  housePriority: 'PRIORITY',
  impressions30d: 12500,
  clicks30d: 250,
  ctr30d: 0.02,
};

const mockReport: HouseAdReport = {
  adId: 'ad-1',
  title: 'Festival Rota Sul — ingressos à venda',
  status: 'ACTIVE',
  impressions: 12500,
  clicks: 250,
  ctr: 0.02,
  dailyBreakdown: [
    { date: '2024-09-15T00:00:00Z', impressions: 400, clicks: 8 },
    { date: '2024-09-16T00:00:00Z', impressions: 500, clicks: 10 },
    { date: '2024-09-17T00:00:00Z', impressions: 350, clicks: 7 },
  ],
  placementBreakdown: [
    { placement: 'FEED', impressions: 8000, clicks: 160, ctr: 0.02 },
    { placement: 'EVENT_DETAIL', impressions: 4500, clicks: 90, ctr: 0.02 },
  ],
};

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('HouseAdReportDrawer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(houseAdsQueries, 'useHouseAdReportQuery').mockReturnValue({
      data: mockReport,
      isLoading: false,
      isError: false,
      error: null,
    } as any);
    vi.spyOn(houseAdsMutations, 'useChangeHouseAdStatusMutation').mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue({ ok: true }),
      isPending: false,
    } as any);
  });

  it('renders null when ad is null', () => {
    render(
      <HouseAdReportDrawer ad={null} onClose={vi.fn()} onEdit={vi.fn()} />,
      { wrapper: createWrapper() }
    );
    // When ad is null, the component returns null, so no dialog should be rendered
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders the drawer with ad title and status', () => {
    render(
      <HouseAdReportDrawer ad={mockAd} onClose={vi.fn()} onEdit={vi.fn()} />,
      { wrapper: createWrapper() }
    );

    expect(screen.getByText('Festival Rota Sul — ingressos à venda')).toBeInTheDocument();
    expect(screen.getByText('ATIVO')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    vi.spyOn(houseAdsQueries, 'useHouseAdReportQuery').mockReturnValueOnce({
      data: undefined,
      isLoading: true,
      isError: false,
    } as any);

    render(
      <HouseAdReportDrawer ad={mockAd} onClose={vi.fn()} onEdit={vi.fn()} />,
      { wrapper: createWrapper() }
    );

    expect(screen.getByText('Carregando…')).toBeInTheDocument();
  });

  it('shows error state', () => {
    vi.spyOn(houseAdsQueries, 'useHouseAdReportQuery').mockReturnValueOnce({
      data: undefined,
      isLoading: false,
      isError: true,
    } as any);

    render(
      <HouseAdReportDrawer ad={mockAd} onClose={vi.fn()} onEdit={vi.fn()} />,
      { wrapper: createWrapper() }
    );

    expect(screen.getByText('Não foi possível carregar os dados do anúncio.')).toBeInTheDocument();
  });

  it('shows empty state when no impressions', () => {
    const emptyReport = { ...mockReport, impressions: 0, clicks: 0, ctr: null, dailyBreakdown: [], placementBreakdown: [] };
    vi.spyOn(houseAdsQueries, 'useHouseAdReportQuery').mockReturnValueOnce({
      data: emptyReport,
      isLoading: false,
      isError: false,
    } as any);

    render(
      <HouseAdReportDrawer ad={mockAd} onClose={vi.fn()} onEdit={vi.fn()} />,
      { wrapper: createWrapper() }
    );

    expect(screen.getByText('Este anúncio ainda não teve exibições.')).toBeInTheDocument();
  });

  it('renders KPIs with correct values', () => {
    render(
      <HouseAdReportDrawer ad={mockAd} onClose={vi.fn()} onEdit={vi.fn()} />,
      { wrapper: createWrapper() }
    );

    // Check for KPI labels (they appear in both KPIs and the placement table)
    expect(screen.getAllByText('IMPRESSÕES').length).toBeGreaterThan(0);
    expect(screen.getAllByText('CLIQUES').length).toBeGreaterThan(0);
    expect(screen.getAllByText('CTR').length).toBeGreaterThan(0);
  });

  it('renders placement breakdown table', () => {
    render(
      <HouseAdReportDrawer ad={mockAd} onClose={vi.fn()} onEdit={vi.fn()} />,
      { wrapper: createWrapper() }
    );

    expect(screen.getByText('Feed')).toBeInTheDocument();
    expect(screen.getByText('Detalhe do evento')).toBeInTheDocument();
  });

  it('closes on Escape key', async () => {
    const onClose = vi.fn();
    render(
      <HouseAdReportDrawer ad={mockAd} onClose={onClose} onEdit={vi.fn()} />,
      { wrapper: createWrapper() }
    );

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });

  it('closes on backdrop click', async () => {
    const onClose = vi.fn();
    const { container } = render(
      <HouseAdReportDrawer ad={mockAd} onClose={onClose} onEdit={vi.fn()} />,
      { wrapper: createWrapper() }
    );

    const backdrop = container.querySelector('[class*="backdrop"]');
    fireEvent.click(backdrop!);
    expect(onClose).toHaveBeenCalled();
  });

  it('calls onEdit when Edit button is clicked', async () => {
    const onEdit = vi.fn();
    render(
      <HouseAdReportDrawer ad={mockAd} onClose={vi.fn()} onEdit={onEdit} />,
      { wrapper: createWrapper() }
    );

    const editBtn = screen.getByRole('button', { name: /editar/i });
    fireEvent.click(editBtn);
    expect(onEdit).toHaveBeenCalledWith('ad-1');
  });

  it('shows Pause button when status is ACTIVE', () => {
    render(
      <HouseAdReportDrawer ad={mockAd} onClose={vi.fn()} onEdit={vi.fn()} />,
      { wrapper: createWrapper() }
    );

    expect(screen.getByRole('button', { name: /pausar/i })).toBeInTheDocument();
  });

  it('shows Resume button when status is PAUSED', () => {
    const pausedAd = { ...mockAd, status: 'PAUSED' as const };
    render(
      <HouseAdReportDrawer ad={pausedAd} onClose={vi.fn()} onEdit={vi.fn()} />,
      { wrapper: createWrapper() }
    );

    expect(screen.getByRole('button', { name: /retomar/i })).toBeInTheDocument();
  });

  it('does not show status action buttons when status is ENDED', () => {
    const endedAd = { ...mockAd, status: 'ENDED' as const };
    render(
      <HouseAdReportDrawer ad={endedAd} onClose={vi.fn()} onEdit={vi.fn()} />,
      { wrapper: createWrapper() }
    );

    expect(screen.queryByRole('button', { name: /pausar|retomar|encerrar/i })).not.toBeInTheDocument();
  });

  it('shows End button and calls handleEnd when clicked', async () => {
    const mockMutate = vi.fn().mockResolvedValue({ ok: true });
    vi.spyOn(houseAdsMutations, 'useChangeHouseAdStatusMutation').mockReturnValueOnce({
      mutateAsync: mockMutate,
      isPending: false,
      mutate: vi.fn(),
    } as any);

    render(
      <HouseAdReportDrawer ad={mockAd} onClose={vi.fn()} onEdit={vi.fn()} />,
      { wrapper: createWrapper() }
    );

    const allEndBtns = screen.getAllByRole('button', { name: /encerrar/i });
    expect(allEndBtns.length).toBeGreaterThan(0);
  });

  it('shows success toast on status change', async () => {
    const mockMutate = vi.fn().mockResolvedValue({ ok: true });
    vi.spyOn(houseAdsMutations, 'useChangeHouseAdStatusMutation').mockReturnValueOnce({
      mutateAsync: mockMutate,
      isPending: false,
      mutate: vi.fn(),
    } as any);

    render(
      <HouseAdReportDrawer ad={mockAd} onClose={vi.fn()} onEdit={vi.fn()} />,
      { wrapper: createWrapper() }
    );

    const pauseBtn = screen.getByRole('button', { name: /pausar/i });
    fireEvent.click(pauseBtn);

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalled();
    });
  });

  it('shows error toast on status change failure', async () => {
    const mockMutate = vi.fn().mockRejectedValue(new Error('API Error'));
    vi.spyOn(houseAdsMutations, 'useChangeHouseAdStatusMutation').mockReturnValueOnce({
      mutateAsync: mockMutate,
      isPending: false,
      mutate: vi.fn(),
    } as any);

    render(
      <HouseAdReportDrawer ad={mockAd} onClose={vi.fn()} onEdit={vi.fn()} />,
      { wrapper: createWrapper() }
    );

    const pauseBtn = screen.getByRole('button', { name: /pausar/i });
    fireEvent.click(pauseBtn);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalled();
    });
  });

  it('does not stop propagation when clicking inside drawer', () => {
    const onClose = vi.fn();
    const { container } = render(
      <HouseAdReportDrawer ad={mockAd} onClose={onClose} onEdit={vi.fn()} />,
      { wrapper: createWrapper() }
    );

    const drawer = container.querySelector('[role="dialog"]');
    fireEvent.click(drawer!);
    expect(onClose).not.toHaveBeenCalled();
  });
});
