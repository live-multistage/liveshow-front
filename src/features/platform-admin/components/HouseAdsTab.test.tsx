vi.mock('../house-ads/mutations/house-ads.mutations', () => ({ useChangeHouseAdStatusMutation: vi.fn() }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
// F4's drawer — exercised by its own test file; here we only check it opens
// and that its onEdit bubbles up.
vi.mock('./HouseAdReportDrawer', () => ({
  HouseAdReportDrawer: ({ ad, onEdit }: { ad: { title: string }; onEdit: () => void }) => (
    <div data-testid="report-drawer">
      {ad.title}
      <button onClick={onEdit}>drawer-edit</button>
    </div>
  ),
}));

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { toast } from 'sonner';
import { HouseAdsTab } from './HouseAdsTab';
import { useChangeHouseAdStatusMutation } from '../house-ads/mutations/house-ads.mutations';
import type { HouseAdListItem } from '../house-ads/types/house-ads.types';

const activeAd: HouseAdListItem = {
  id: 'ha-1',
  title: 'Estreia: Showon Sessions',
  destination: { type: 'EVENT', eventId: 'evt-1' },
  format: 'WIDE_16_9',
  placements: ['PLAYER_PAUSE', 'FEED'],
  startsAt: '2026-09-01T00:00:00.000Z',
  endsAt: '2026-09-30T00:00:00.000Z',
  status: 'ACTIVE',
  housePriority: 'PRIORITY',
  impressions30d: 4200,
  clicks30d: 84,
  ctr30d: 0.02,
};

const pausedAd: HouseAdListItem = { ...activeAd, id: 'ha-2', title: 'Aviso de manutenção', status: 'PAUSED', housePriority: 'FILL' };

const baseProps = {
  page: 1,
  limit: 20,
  onPage: vi.fn(),
  isError: false,
  onRetry: vi.fn(),
  hasFilter: false,
  onClearFilter: vi.fn(),
  onCreate: vi.fn(),
  onEdit: vi.fn(),
};

let mutate: ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
  mutate = vi.fn();
  vi.mocked(useChangeHouseAdStatusMutation).mockReturnValue({ mutate, isPending: false } as never);
});

describe('HouseAdsTab', () => {
  it('renders a row with title, destination, placements, period, status, priority and metrics', () => {
    render(<HouseAdsTab {...baseProps} items={[activeAd]} total={1} isLoading={false} />);
    expect(screen.getByText('Estreia: Showon Sessions')).toBeInTheDocument();
    expect(screen.getByText('Evento · evt-1')).toBeInTheDocument();
    expect(screen.getByText('Pausa no player')).toBeInTheDocument();
    expect(screen.getByText('Feed')).toBeInTheDocument();
    expect(screen.getByText('Ativo')).toBeInTheDocument();
    expect(screen.getByText('Prioritário')).toBeInTheDocument();
    expect(screen.getByText('4,2k')).toBeInTheDocument();
    expect(screen.getByText('84')).toBeInTheDocument();
    expect(screen.getByText('2.00%')).toBeInTheDocument();
  });

  it('shows Pausar for an active ad and Retomar for a paused one', () => {
    render(<HouseAdsTab {...baseProps} items={[activeAd, pausedAd]} total={2} isLoading={false} />);
    expect(screen.getByRole('button', { name: 'Pausar' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retomar' })).toBeInTheDocument();
  });

  it('calls the status mutation with pause/resume', async () => {
    const user = userEvent.setup();
    render(<HouseAdsTab {...baseProps} items={[activeAd]} total={1} isLoading={false} />);
    await user.click(screen.getByRole('button', { name: 'Pausar' }));
    expect(mutate).toHaveBeenCalledWith({ id: 'ha-1', action: 'pause' }, expect.anything());
  });

  it('gates Encerrar behind a confirmation dialog', async () => {
    const user = userEvent.setup();
    render(<HouseAdsTab {...baseProps} items={[activeAd]} total={1} isLoading={false} />);
    await user.click(screen.getByRole('button', { name: 'Encerrar' }));
    expect(mutate).not.toHaveBeenCalled();

    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('Encerrar este anúncio?')).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Encerrar' }));
    expect(mutate).toHaveBeenCalledWith({ id: 'ha-1', action: 'end' }, expect.anything());
  });

  it('cancels the confirmation without mutating', async () => {
    const user = userEvent.setup();
    render(<HouseAdsTab {...baseProps} items={[activeAd]} total={1} isLoading={false} />);
    await user.click(screen.getByRole('button', { name: 'Encerrar' }));
    const dialog = screen.getByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'Cancelar' }));
    expect(mutate).not.toHaveBeenCalled();
  });

  it('renders skeleton rows while loading', () => {
    const { container } = render(<HouseAdsTab {...baseProps} items={[]} total={0} isLoading />);
    expect(container.querySelectorAll('[class*="skeletonRow"]').length).toBeGreaterThan(0);
  });

  it('renders the base empty state with the create button', async () => {
    const user = userEvent.setup();
    render(<HouseAdsTab {...baseProps} items={[]} total={0} isLoading={false} />);
    expect(screen.getByText('Nenhum anúncio da plataforma ainda.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '+ Novo anúncio' }));
    expect(baseProps.onCreate).toHaveBeenCalled();
  });

  it('renders the filtered-empty state with a clear-filter action', async () => {
    const user = userEvent.setup();
    render(<HouseAdsTab {...baseProps} items={[]} total={0} isLoading={false} hasFilter />);
    expect(screen.getByText('Nenhum anúncio encontrado para este filtro.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Limpar filtro' }));
    expect(baseProps.onClearFilter).toHaveBeenCalled();
  });

  it('renders the error state with a retry action', async () => {
    const user = userEvent.setup();
    render(<HouseAdsTab {...baseProps} items={[]} total={0} isLoading={false} isError />);
    expect(screen.getByText('Não foi possível carregar os anúncios.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Tentar de novo' }));
    expect(baseProps.onRetry).toHaveBeenCalled();
  });

  it('disables Editar for an active ad and enables it for a paused one, calling onEdit with the item', async () => {
    const user = userEvent.setup();
    render(<HouseAdsTab {...baseProps} items={[activeAd, pausedAd]} total={2} isLoading={false} />);
    const editButtons = screen.getAllByRole('button', { name: 'Editar' });
    expect(editButtons[0]).toBeDisabled(); // activeAd
    expect(editButtons[1]).not.toBeDisabled(); // pausedAd

    await user.click(editButtons[1]);
    expect(baseProps.onEdit).toHaveBeenCalledWith(pausedAd);
  });

  it('opens the performance drawer from Ver desempenho', async () => {
    const user = userEvent.setup();
    render(<HouseAdsTab {...baseProps} items={[activeAd]} total={1} isLoading={false} />);
    expect(screen.queryByTestId('report-drawer')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Ver desempenho' }));
    expect(screen.getByTestId('report-drawer')).toHaveTextContent('Estreia: Showon Sessions');
  });

  it('routes the report drawer\'s onEdit to onEdit and closes the drawer', async () => {
    const user = userEvent.setup();
    render(<HouseAdsTab {...baseProps} items={[activeAd]} total={1} isLoading={false} />);
    await user.click(screen.getByRole('button', { name: 'Ver desempenho' }));
    await user.click(screen.getByRole('button', { name: 'drawer-edit' }));
    expect(baseProps.onEdit).toHaveBeenCalledWith(activeAd);
    expect(screen.queryByTestId('report-drawer')).not.toBeInTheDocument();
  });

  it('toasts on a successful status change', async () => {
    mutate.mockImplementation((_vars, { onSuccess }) => onSuccess());
    const user = userEvent.setup();
    render(<HouseAdsTab {...baseProps} items={[activeAd]} total={1} isLoading={false} />);
    await user.click(screen.getByRole('button', { name: 'Pausar' }));
    expect(toast.success).toHaveBeenCalledWith('Anúncio pausado.');
  });
});
