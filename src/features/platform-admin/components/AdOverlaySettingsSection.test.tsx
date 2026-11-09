import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { toast } from 'sonner';
import { AdOverlaySettingsSection } from './AdOverlaySettingsSection';
import { usePlatformSettingsQuery, useSetAdOverlaySettingsMutation } from '../queries/get-settings';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('../queries/get-settings', () => ({
  usePlatformSettingsQuery: vi.fn(),
  useSetAdOverlaySettingsMutation: vi.fn(),
}));

const mutate = vi.fn();
const settings = {
  adOverlayMinCpmCents: 600,
  adOverlayMinCpcCents: 35,
  adOverlayGlobalMinIntervalMin: 10,
  adOverlayMaxPerHour: 4,
  adOverlayFirstAfterMin: 3,
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(usePlatformSettingsQuery).mockReturnValue({ data: { ...settings, adPauseMinCpmStandardCents: 800 } } as never);
  vi.mocked(useSetAdOverlaySettingsMutation).mockReturnValue({ mutate, isPending: false } as never);
});

const cpm = () => screen.getByLabelText('Lance mínimo · por mil exibições');
const cpc = () => screen.getByLabelText('Lance mínimo · por clique');
const interval = () => screen.getByLabelText('Intervalo mínimo por espectador (min)');
const perHour = () => screen.getByLabelText('Máximo por hora por espectador');
const firstAfter = () => screen.getByLabelText('Primeira vitrine depois de (min de sessão)');

describe('AdOverlaySettingsSection', () => {
  it('shows the five values: bids in reais, limits as numbers', () => {
    render(<AdOverlaySettingsSection />);
    expect(cpm()).toHaveValue('6,00');
    expect(cpc()).toHaveValue('0,35');
    expect(interval()).toHaveValue('10');
    expect(perHour()).toHaveValue('4');
    expect(firstAfter()).toHaveValue('3');
  });

  it('explains each field and the kill switch', () => {
    render(<AdOverlaySettingsSection />);
    expect(screen.getByText('Por mil exibições. Vale para as 3 posições.')).toBeInTheDocument();
    expect(screen.getByText('Entre duas vitrines quaisquer, de qualquer anunciante.')).toBeInTheDocument();
    expect(screen.getByText('Ninguém vê vitrine logo ao abrir a transmissão.')).toBeInTheDocument();
    expect(screen.getByText(/ads_overlay/)).toBeInTheDocument();
    expect(screen.getByText(/ads_delivery/)).toBeInTheDocument();
    expect(screen.getByText(/Subir o mínimo depois da aprovação tira do leilão as vitrines com lance abaixo dele, como na pausa\./)).toBeInTheDocument();
  });

  it('is titled Vitrine', () => {
    render(<AdOverlaySettingsSection />);
    expect(screen.getByRole('region', { name: 'Vitrine' })).toBeInTheDocument();
  });

  it('save is disabled until something changes', () => {
    render(<AdOverlaySettingsSection />);
    expect(screen.getByRole('button', { name: 'Salvar vitrine' })).toBeDisabled();
  });

  it('sends the five values — money in cents, limits as integers — and only those', () => {
    render(<AdOverlaySettingsSection />);
    fireEvent.change(cpm(), { target: { value: '7,50' } });
    fireEvent.change(interval(), { target: { value: '15' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar vitrine' }));
    expect(mutate).toHaveBeenCalledWith({ ...settings, adOverlayMinCpmCents: 750, adOverlayGlobalMinIntervalMin: 15 }, expect.any(Object));
  });

  it.each([
    ['bid CPM zero', () => cpm(), '0', 'Informe um valor maior que zero.'],
    ['bid CPC garbage', () => cpc(), 'abc', 'Informe um valor maior que zero.'],
    ['interval 0', () => interval(), '0', 'Use de 1 a 120 minutos.'],
    ['interval 121', () => interval(), '121', 'Use de 1 a 120 minutos.'],
    ['per hour 0', () => perHour(), '0', 'Use de 1 a 12.'],
    ['per hour 13', () => perHour(), '13', 'Use de 1 a 12.'],
    ['first after 61', () => firstAfter(), '61', 'Use de 0 a 60 minutos.'],
    ['first after 2.5', () => firstAfter(), '2,5', 'Use de 0 a 60 minutos.'],
  ])('blocks %s and says why', (_label, field, value, message) => {
    render(<AdOverlaySettingsSection />);
    fireEvent.change(field(), { target: { value } });
    expect(screen.getByText(message)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Salvar vitrine' })).toBeDisabled();
  });

  it('accepts the edges: 0 min before the first vitrine, 120 min interval, 12 per hour', () => {
    render(<AdOverlaySettingsSection />);
    fireEvent.change(firstAfter(), { target: { value: '0' } });
    fireEvent.change(interval(), { target: { value: '120' } });
    fireEvent.change(perHour(), { target: { value: '12' } });
    expect(screen.getByRole('button', { name: 'Salvar vitrine' })).toBeEnabled();
  });

  it('toasts on success and on failure', () => {
    render(<AdOverlaySettingsSection />);
    fireEvent.change(perHour(), { target: { value: '5' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar vitrine' }));
    const options = mutate.mock.calls[0][1] as { onSuccess: () => void; onError: () => void };
    options.onSuccess();
    expect(toast.success).toHaveBeenCalledWith('Configurações da vitrine salvas.');
    options.onError();
    expect(toast.error).toHaveBeenCalledWith('Não foi possível salvar as configurações da vitrine.');
  });

  it('renders nothing until the settings arrive', () => {
    vi.mocked(usePlatformSettingsQuery).mockReturnValue({ data: undefined } as never);
    const { container } = render(<AdOverlaySettingsSection />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing while the API has not sent the vitrine fields yet', () => {
    vi.mocked(usePlatformSettingsQuery).mockReturnValue({ data: { adPauseMinCpmStandardCents: 800 } } as never);
    const { container } = render(<AdOverlaySettingsSection />);
    expect(container).toBeEmptyDOMElement();
  });
});
