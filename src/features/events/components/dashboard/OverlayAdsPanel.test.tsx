import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { OverlayAdsPanel } from './OverlayAdsPanel';
import { useSetOverlayAdsMutation } from '../../mutations/set-overlay-ads.mutation';

vi.mock('../../mutations/set-overlay-ads.mutation', () => ({ useSetOverlayAdsMutation: vi.fn() }));

const mutate = vi.fn();
function mockMutation(over: Partial<{ isPending: boolean; isError: boolean }> = {}) {
  vi.mocked(useSetOverlayAdsMutation).mockReturnValue({ mutate, isPending: false, isError: false, ...over } as never);
}

const allowed = () => screen.getByRole('switch', { name: 'Permitir vitrine neste evento' });
const replay = () => screen.getByRole('switch', { name: 'Mostrar também no replay' });

beforeEach(() => {
  vi.clearAllMocks();
  mockMutation();
});

describe('OverlayAdsPanel', () => {
  it('explains what the vitrine is, in the brief\'s words', () => {
    render(<OverlayAdsPanel eventId="evt-1" overlayAds={{ allowed: true, onReplay: true }} />);
    expect(screen.getByRole('heading', { name: 'Anúncios no player' })).toBeInTheDocument();
    expect(
      screen.getByText('A vitrine é uma logo pequena que entra por alguns segundos em cantos do player. Ela nunca cobre a transmissão, a janela de Libras nem os controles. Você recebe parte da receita.'),
    ).toBeInTheDocument();
    expect(screen.getByText('Pausa e vídeo antes da transmissão seguem as regras atuais.')).toBeInTheDocument();
  });

  it('reflects the saved state: on / on', () => {
    render(<OverlayAdsPanel eventId="evt-1" overlayAds={{ allowed: true, onReplay: true }} />);
    expect(allowed()).toBeChecked();
    expect(replay()).toBeChecked();
    expect(screen.getByText('Ligada: anunciantes aprovados podem aparecer.')).toBeInTheDocument();
  });

  it('turning the vitrine off saves it (keeping the replay choice)', () => {
    render(<OverlayAdsPanel eventId="evt-1" overlayAds={{ allowed: true, onReplay: false }} />);
    fireEvent.click(allowed());
    expect(mutate).toHaveBeenCalledWith({ allowed: false, onReplay: false });
  });

  it('turning the vitrine on saves it', () => {
    render(<OverlayAdsPanel eventId="evt-1" overlayAds={{ allowed: false, onReplay: true }} />);
    fireEvent.click(allowed());
    expect(mutate).toHaveBeenCalledWith({ allowed: true, onReplay: true });
  });

  it('shows the off state, and "Mostrar também no replay" is disabled and off while the vitrine is off', () => {
    render(<OverlayAdsPanel eventId="evt-1" overlayAds={{ allowed: false, onReplay: true }} />);
    expect(allowed()).not.toBeChecked();
    expect(screen.getByText('Desligada: nenhuma vitrine aparece neste evento.')).toBeInTheDocument();
    expect(replay()).toBeDisabled();
    expect(replay()).not.toBeChecked();
    fireEvent.click(replay());
    expect(mutate).not.toHaveBeenCalled();
  });

  it('the replay switch saves with the vitrine on', () => {
    render(<OverlayAdsPanel eventId="evt-1" overlayAds={{ allowed: true, onReplay: true }} />);
    expect(replay()).toBeEnabled();
    fireEvent.click(replay());
    expect(mutate).toHaveBeenCalledWith({ allowed: true, onReplay: false });
  });

  it('locks both switches while saving', () => {
    mockMutation({ isPending: true });
    render(<OverlayAdsPanel eventId="evt-1" overlayAds={{ allowed: true, onReplay: true }} />);
    expect(allowed()).toBeDisabled();
    expect(replay()).toBeDisabled();
  });

  it('tells the organizer when saving failed', () => {
    mockMutation({ isError: true });
    render(<OverlayAdsPanel eventId="evt-1" overlayAds={{ allowed: true, onReplay: true }} />);
    expect(screen.getByRole('alert')).toHaveTextContent('Não foi possível salvar. Tente de novo.');
  });

  it('shows no error before anything fails', () => {
    render(<OverlayAdsPanel eventId="evt-1" overlayAds={{ allowed: true, onReplay: true }} />);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('is read-only for a collaborator: they cannot change it', () => {
    render(<OverlayAdsPanel eventId="evt-1" overlayAds={{ allowed: true, onReplay: true }} readOnly />);
    expect(allowed()).toBeDisabled();
    expect(replay()).toBeDisabled();
    expect(screen.getByText('Só o dono ou administrador da organização altera isto.')).toBeInTheDocument();
  });
});

describe('OverlayAdsPanel — the off switch stays visible', () => {
  const scss = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'OverlayAdsPanel.module.scss'), 'utf8');

  it('gives both switches the panel track class', () => {
    render(<OverlayAdsPanel eventId="evt-1" overlayAds={{ allowed: false, onReplay: false }} />);
    expect(allowed().className).toMatch(/switch/);
    expect(replay().className).toMatch(/switch/);
  });

  it('draws the off track in #27272a (Prévia), so it does not melt into the card', () => {
    expect(scss).toMatch(/\.switch\[data-state='unchecked'\]\s*\{[^}]*background-color:\s*#27272a/);
  });
});
