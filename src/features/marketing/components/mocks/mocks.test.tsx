import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

const mockCams: Array<{ name: string; meta: string }> = [
  { name: 'Cam A', meta: 'WIDE · 1080p' },
  { name: 'Cam B', meta: 'TRIPÉ · 1080p' },
  { name: 'Cam C', meta: 'PTZ · 720p' },
  { name: 'Cam D', meta: 'GIMBAL · 1080p' },
];

vi.mock('next-intl', () => ({
  useTranslations: () => {
    const t = (key: string) => key;
    t.raw = (key: string) => {
      if (key === 'hero.mock.cams') return mockCams;
      return [];
    };
    return t;
  },
}));

import { SignalCell } from './SignalCell';
import { ReplayMock } from './ReplayMock';
import { LatencyPanel } from './LatencyPanel';
import { TicketPairMock } from './TicketPairMock';
import { EventPageMock } from './EventPageMock';
import { HeroPlayerMock } from '../organizers/HeroPlayerMock';

// Bars are the only spans carrying an inline animation-duration.
function countAnimatedBars(container: HTMLElement): number {
  return Array.from(container.querySelectorAll('span')).filter((el) => el.style.animationDuration).length;
}

describe('mocks', () => {
  it('SignalCell renders 14 animated bars', () => {
    const { container } = render(<SignalCell name="CAM 1" bitrate="8.2 Mbps" src="srt://ingest-01" seed={1} />);
    expect(countAnimatedBars(container)).toBe(14);
    expect(screen.getByText('CAM 1')).toBeInTheDocument();
    expect(screen.getByText('SRT OK')).toBeInTheDocument();
    expect(screen.getByText('8.2 Mbps')).toBeInTheDocument();
    expect(screen.getByText('srt://ingest-01')).toBeInTheDocument();
  });

  it('LatencyPanel renders label, pill and 2 signal cells', () => {
    render(
      <LatencyPanel
        label="LATÊNCIA ATUAL"
        pill="MODO BAIXA LATÊNCIA"
        signals={[{ name: 'CAM 1 · OBS' }, { name: 'CAM 2 · vMix' }]}
      />,
    );
    expect(screen.getByText('LATÊNCIA ATUAL')).toBeInTheDocument();
    expect(screen.getByText('MODO BAIXA LATÊNCIA')).toBeInTheDocument();
    expect(screen.getByText('2.8')).toBeInTheDocument();
    expect(screen.getByText('CAM 1 · OBS')).toBeInTheDocument();
    expect(screen.getByText('CAM 2 · vMix')).toBeInTheDocument();
    expect(screen.getAllByText('SRT OK')).toHaveLength(2);
  });

  it('TicketPairMock renders both cards, labels and a 49-cell QR mock', () => {
    const { container } = render(
      <TicketPairMock
        live="LIVE"
        event="Final Estadual · Quadra Central"
        date="SÁB 21 SET · 19:00"
        digitalLabel="DIGITAL"
        physicalLabel="PRESENCIAL"
        gate="PORTÃO B"
        access="Acesso"
        watch="Assistir"
      />,
    );
    expect(screen.getByText('DIGITAL')).toBeInTheDocument();
    expect(screen.getByText('PRESENCIAL')).toBeInTheDocument();
    expect(screen.getByText('PORTÃO B')).toBeInTheDocument();
    expect(screen.getByText('Acesso')).toBeInTheDocument();
    expect(screen.getByText('Assistir')).toBeInTheDocument();
    expect(screen.getByText('R$ 29,90')).toBeInTheDocument();
    expect(screen.getByText('SHW-4471-02')).toBeInTheDocument();

    const qrCells = container.querySelectorAll('[aria-hidden="true"] > span');
    expect(qrCells).toHaveLength(49);
  });

  it('EventPageMock renders title, both ticket labels and buy text', () => {
    render(
      <EventPageMock
        live="LIVE"
        title="Final Estadual · Quadra Central"
        date="SÁB 21 SET · 19:00"
        venue="Ginásio Municipal"
        digitalLabel="DIGITAL"
        physicalLabel="PRESENCIAL"
        digitalSub="HD · 4 câmeras"
        physicalSub="QR · check-in"
        buy="Comprar ingresso"
        organizer="Liga Metropolitana de Vôlei"
      />,
    );
    expect(screen.getByText('Final Estadual · Quadra Central')).toBeInTheDocument();
    expect(screen.getByText('DIGITAL')).toBeInTheDocument();
    expect(screen.getByText('PRESENCIAL')).toBeInTheDocument();
    expect(screen.getByText('Comprar ingresso')).toBeInTheDocument();
  });

  it('ReplayMock renders the badge', () => {
    render(<ReplayMock />);
    expect(screen.getByText('replay.mock.badge')).toBeInTheDocument();
    expect(screen.getByText('replay.mock.marker')).toBeInTheDocument();
  });

  it('ReplayMock renders elapsed timestamps, not wall-clock times', () => {
    render(<ReplayMock />);
    expect(screen.getByText('00:00:00')).toBeInTheDocument();
    expect(screen.getByText('03:04:31')).toBeInTheDocument();
  });

  it('HeroPlayerMock compact renders 4 camera buttons and hides Libras', () => {
    render(<HeroPlayerMock compact />);
    expect(screen.getAllByRole('button')).toHaveLength(4);
    expect(screen.queryByText('hero.mock.libras')).not.toBeInTheDocument();
  });
});
