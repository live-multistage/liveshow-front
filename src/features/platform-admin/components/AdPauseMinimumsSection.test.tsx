import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { toast } from 'sonner';
import { AdPauseMinimumsSection } from './AdPauseMinimumsSection';
import { usePlatformSettingsQuery, useSetAdPauseMinimumsMutation } from '../queries/get-settings';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('../queries/get-settings', () => ({
  usePlatformSettingsQuery: vi.fn(),
  useSetAdPauseMinimumsMutation: vi.fn(),
}));

const mutate = vi.fn();
const settings = {
  adPauseMinCpmStandardCents: 800,
  adPauseMinCpcStandardCents: 40,
  adPauseMinCpmFullscreenCents: 1400,
  adPauseMinCpcFullscreenCents: 70,
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(usePlatformSettingsQuery).mockReturnValue({ data: settings } as never);
  vi.mocked(useSetAdPauseMinimumsMutation).mockReturnValue({ mutate, isPending: false } as never);
});

describe('AdPauseMinimumsSection', () => {
  it('shows the four minimums in reais', () => {
    render(<AdPauseMinimumsSection />);
    expect(screen.getByLabelText('Padrão · por mil exibições')).toHaveValue('8,00');
    expect(screen.getByLabelText('Padrão · por clique')).toHaveValue('0,40');
    expect(screen.getByLabelText('Tela cheia · por mil exibições')).toHaveValue('14,00');
    expect(screen.getByLabelText('Tela cheia · por clique')).toHaveValue('0,70');
  });

  it('save is disabled until something changes', () => {
    render(<AdPauseMinimumsSection />);
    expect(screen.getByRole('button', { name: 'Salvar mínimos' })).toBeDisabled();
  });

  it('sends the four values in cents', () => {
    render(<AdPauseMinimumsSection />);
    fireEvent.change(screen.getByLabelText('Tela cheia · por mil exibições'), { target: { value: '16' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar mínimos' }));
    expect(mutate).toHaveBeenCalledWith({ ...settings, adPauseMinCpmFullscreenCents: 1600 }, expect.any(Object));
  });

  it('blocks zero or invalid values and says why', () => {
    render(<AdPauseMinimumsSection />);
    fireEvent.change(screen.getByLabelText('Padrão · por clique'), { target: { value: '0' } });
    expect(screen.getByText('Informe um valor maior que zero.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Salvar mínimos' })).toBeDisabled();
  });

  it('toasts on success and on failure', () => {
    render(<AdPauseMinimumsSection />);
    fireEvent.change(screen.getByLabelText('Padrão · por clique'), { target: { value: '0,50' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar mínimos' }));
    const [, options] = mutate.mock.calls[0];
    options.onSuccess();
    expect(toast.success).toHaveBeenCalledWith('Mínimos da pausa salvos.');
    options.onError();
    expect(toast.error).toHaveBeenCalledWith('Não foi possível salvar os mínimos da pausa.');
  });

  it('renders nothing until the settings load', () => {
    vi.mocked(usePlatformSettingsQuery).mockReturnValue({ data: undefined } as never);
    const { container } = render(<AdPauseMinimumsSection />);
    expect(container).toBeEmptyDOMElement();
  });
});
