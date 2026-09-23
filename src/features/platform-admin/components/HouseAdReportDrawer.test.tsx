import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { toast } from 'sonner';
import { HouseAdReportDrawer } from './HouseAdReportDrawer';
import * as houseAdsQueries from '../house-ads/queries/house-ads.queries';
import * as houseAdsMutations from '../house-ads/mutations/house-ads.mutations';
import type { HouseAdDetail, HouseAdListItem, HouseAdReport } from '../house-ads/types/house-ads.types';

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
  ctr30d: 2,
};

const mockReport: HouseAdReport = {
  adId: 'ad-1',
  title: 'Festival Rota Sul — ingressos à venda',
  status: 'ACTIVE',
  impressions: 12500,
  clicks: 250,
  ctr: 2,
  dailyBreakdown: [
    { date: '2024-09-15T00:00:00Z', impressions: 400, clicks: 8 },
    { date: '2024-09-16T00:00:00Z', impressions: 900, clicks: 18 },
    { date: '2024-09-17T00:00:00Z', impressions: 350, clicks: 7 },
  ],
  placementBreakdown: [
    { placement: 'FEED', impressions: 8000, clicks: 160, ctr: 2 },
    { placement: 'EVENT_DETAIL', impressions: 4500, clicks: 90, ctr: 2 },
  ],
};

const mockDetail: HouseAdDetail = {
  id: 'ad-1',
  title: 'Festival Rota Sul — ingressos à venda',
  format: 'HORIZONTAL_728x90',
  placements: ['FEED', 'EVENT_DETAIL'],
  destination: { type: 'EVENT', eventId: 'evt-1' },
  targetDomains: ['gmail.com'],
  targetCategories: ['musica'],
  targetAgeBrackets: ['AGE_18_24', 'AGE_25_34'],
  frequencyCapMax: 3,
  frequencyCapWindow: 'day',
  startsAt: '2024-09-15T00:00:00Z',
  endsAt: '2024-09-30T23:59:59Z',
  status: 'ACTIVE',
  housePriority: 'PRIORITY',
  bannerUrl: null,
  videoUrl: null,
  videoDurationSec: null,
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
    vi.spyOn(houseAdsQueries, 'useHouseAdQuery').mockReturnValue({
      data: mockDetail,
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
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders the drawer with ad title and status', () => {
    render(
      <HouseAdReportDrawer ad={mockAd} onClose={vi.fn()} onEdit={vi.fn()} />,
      { wrapper: createWrapper() }
    );

    expect(screen.getByText('Festival Rota Sul — ingressos à venda')).toBeInTheDocument();
    // "Ativo" is the shared HOUSE_AD_STATUS_LABEL copy — the badge's
    // all-caps look (ATIVO) comes from CSS text-transform, not a second map.
    expect(screen.getByText('Ativo')).toBeInTheDocument();
  });

  it('renders the drawer as an accessible modal dialog (Radix)', () => {
    render(
      <HouseAdReportDrawer ad={mockAd} onClose={vi.fn()} onEdit={vi.fn()} />,
      { wrapper: createWrapper() }
    );
    expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true');
  });

  it('renders the creative format as a human label, not the raw enum', () => {
    render(
      <HouseAdReportDrawer ad={mockAd} onClose={vi.fn()} onEdit={vi.fn()} />,
      { wrapper: createWrapper() }
    );
    expect(screen.queryByText('HORIZONTAL_728x90')).not.toBeInTheDocument();
    expect(screen.getByText('728×90')).toBeInTheDocument();
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

  it('renders KPIs with the CTR already expressed as a percentage (no ×100)', () => {
    render(
      <HouseAdReportDrawer ad={mockAd} onClose={vi.fn()} onEdit={vi.fn()} />,
      { wrapper: createWrapper() }
    );

    expect(screen.getAllByText('IMPRESSÕES').length).toBeGreaterThan(0);
    expect(screen.getAllByText('CLIQUES').length).toBeGreaterThan(0);
    // mockReport.ctr === 2 means 2%, not 200%.
    expect(screen.getAllByText('2.00%').length).toBeGreaterThan(0);
    expect(screen.queryByText('200.00%')).not.toBeInTheDocument();
  });

  it('renders placement breakdown table', () => {
    render(
      <HouseAdReportDrawer ad={mockAd} onClose={vi.fn()} onEdit={vi.fn()} />,
      { wrapper: createWrapper() }
    );

    expect(screen.getByText('Feed')).toBeInTheDocument();
    expect(screen.getByText('Página do evento')).toBeInTheDocument();
  });

  it('shows the peak day matching the day with the most impressions, not the latest date', () => {
    render(
      <HouseAdReportDrawer ad={mockAd} onClose={vi.fn()} onEdit={vi.fn()} />,
      { wrapper: createWrapper() }
    );

    // mockReport's max-impressions day is 2024-09-16 (900 impressions), not
    // the latest date in the range (2024-09-17, 350 impressions) — a reduce
    // keyed on date instead of impressions would report the wrong peak.
    expect(screen.getByText(/pico 900 ·/)).toBeInTheDocument();
    expect(screen.queryByText(/pico 350 ·/)).not.toBeInTheDocument();
  });

  it('renders the real targeting and frequency cap instead of invented copy', () => {
    render(
      <HouseAdReportDrawer ad={mockAd} onClose={vi.fn()} onEdit={vi.fn()} />,
      { wrapper: createWrapper() }
    );

    expect(screen.queryByText('até 3 por pessoa por dia')).not.toBeInTheDocument();
    expect(screen.getByText(/gmail\.com/)).toBeInTheDocument();
    expect(screen.getByText(/musica/)).toBeInTheDocument();
    expect(screen.getByText(/18–24/)).toBeInTheDocument();
    expect(screen.getByText('3x / dia')).toBeInTheDocument();
  });

  it('shows empty-state copy for targeting and frequency instead of a dash or invented text', () => {
    vi.spyOn(houseAdsQueries, 'useHouseAdQuery').mockReturnValueOnce({
      data: { ...mockDetail, targetDomains: [], targetCategories: [], targetAgeBrackets: [], frequencyCapMax: null, frequencyCapWindow: null },
      isLoading: false,
      isError: false,
    } as any);

    render(
      <HouseAdReportDrawer ad={mockAd} onClose={vi.fn()} onEdit={vi.fn()} />,
      { wrapper: createWrapper() }
    );

    expect(screen.getByText('Sem segmentação')).toBeInTheDocument();
    expect(screen.getByText('Sem limite')).toBeInTheDocument();
  });

  it('closes on Escape key', async () => {
    const onClose = vi.fn();
    render(
      <HouseAdReportDrawer ad={mockAd} onClose={onClose} onEdit={vi.fn()} />,
      { wrapper: createWrapper() }
    );

    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it('does not close the drawer when Escape is pressed while the end-confirmation dialog is open', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(
      <HouseAdReportDrawer ad={mockAd} onClose={onClose} onEdit={vi.fn()} />,
      { wrapper: createWrapper() }
    );

    await user.click(screen.getByRole('button', { name: 'Encerrar' }));
    const confirmDialog = screen.getByText('Encerrar este anúncio?').closest('[role="dialog"]') as HTMLElement;
    fireEvent.keyDown(confirmDialog, { key: 'Escape' });

    await waitFor(() => expect(screen.queryByText('Encerrar este anúncio?')).not.toBeInTheDocument());
    expect(onClose).not.toHaveBeenCalled();
  });

  it('closes on backdrop click', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    const { baseElement } = render(
      <HouseAdReportDrawer ad={mockAd} onClose={onClose} onEdit={vi.fn()} />,
      { wrapper: createWrapper() }
    );

    const backdrop = baseElement.querySelector('[class*="backdrop"]');
    await user.click(backdrop!);
    expect(onClose).toHaveBeenCalled();
  });

  it('calls onEdit when Edit button is clicked for an editable (PAUSED) ad', async () => {
    const pausedAd = { ...mockAd, status: 'PAUSED' as const };
    const onEdit = vi.fn();
    render(
      <HouseAdReportDrawer ad={pausedAd} onClose={vi.fn()} onEdit={onEdit} />,
      { wrapper: createWrapper() }
    );

    const editBtn = screen.getByRole('button', { name: /editar/i });
    expect(editBtn).not.toBeDisabled();
    fireEvent.click(editBtn);
    expect(onEdit).toHaveBeenCalledWith('ad-1');
  });

  it('disables Editar for an ACTIVE ad, mirroring the tab\'s row gate', () => {
    render(
      <HouseAdReportDrawer ad={mockAd} onClose={vi.fn()} onEdit={vi.fn()} />,
      { wrapper: createWrapper() }
    );

    expect(screen.getByRole('button', { name: /editar/i })).toBeDisabled();
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

  it('shows success toast on status change, matching the tab\'s copy', async () => {
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
      expect(toast.success).toHaveBeenCalledWith('Anúncio pausado.');
    });
  });

  it('shows the real backend error message on status change failure instead of swallowing it', async () => {
    const mockMutate = vi.fn().mockRejectedValue(new Error('Limite de mudanças de status excedido'));
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
      expect(toast.error).toHaveBeenCalledWith('Limite de mudanças de status excedido');
    });
  });

  it('does not close the drawer when clicking inside it', () => {
    const onClose = vi.fn();
    render(
      <HouseAdReportDrawer ad={mockAd} onClose={onClose} onEdit={vi.fn()} />,
      { wrapper: createWrapper() }
    );

    fireEvent.click(screen.getByRole('dialog'));
    expect(onClose).not.toHaveBeenCalled();
  });
});
