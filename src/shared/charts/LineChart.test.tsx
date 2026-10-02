import { describe, it, expect } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { LineChart } from './LineChart';

const LABELS = ['10h', '11h', '12h', '13h'];

function hoverAt(ratio: number) {
  const plot = screen.getAllByTestId('chart-dot')[0].parentElement!;
  plot.getBoundingClientRect = () =>
    ({ left: 0, width: 100, top: 0, height: 100, right: 100, bottom: 100, x: 0, y: 0, toJSON: () => ({}) });
  fireEvent.pointerMove(plot, { clientX: ratio * 100 });
  return plot;
}

describe('LineChart', () => {
  const series = [
    { label: 'Simultâneos', data: [5, 9, 12, 7], color: 'magenta' as const, fill: true },
    { label: 'Novos acessos', data: [2, 4, 1, 3], color: 'violet' as const, dashed: true },
  ];

  it('marks every series at the same sample', () => {
    render(<LineChart series={series} labels={LABELS} />);
    expect(screen.getAllByTestId('chart-dot')).toHaveLength(2);
  });

  it('lists every series value for the hovered sample', () => {
    render(<LineChart series={series} labels={LABELS} />);
    hoverAt(0.66); // index 2

    const tip = screen.getByRole('status');
    expect(within(tip).getByText('12h')).toBeInTheDocument();
    expect(within(tip).getByText('12')).toBeInTheDocument();
    expect(within(tip).getByText('1')).toBeInTheDocument();
  });

  it('hides the tooltip when the pointer leaves', () => {
    render(<LineChart series={series} labels={LABELS} />);
    const plot = hoverAt(0.66);
    fireEvent.pointerLeave(plot);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('formats the values the caller asks for', () => {
    render(
      <LineChart
        series={[{ label: 'Receita', data: [10, 20], color: 'amber' }]}
        labels={['jan.', 'fev.']}
        formatValue={(v) => `R$ ${v}`}
        tooltip
      />,
    );
    hoverAt(1);
    expect(within(screen.getByRole('status')).getByText('R$ 20')).toBeInTheDocument();
  });

  it('prints only a readable subset of a dense axis', () => {
    const hours = Array.from({ length: 24 }, (_, i) => `${i}h`);
    render(<LineChart series={[{ label: 'Views', data: hours.map((_, i) => i), color: 'green' }]} labels={hours} />);

    expect(screen.getByText('0h')).toBeInTheDocument();
    expect(screen.getByText('23h')).toBeInTheDocument();
    expect(screen.queryByText('1h')).not.toBeInTheDocument();
  });

  it('says there is no data for an empty chart', () => {
    render(<LineChart series={[{ label: 'x', data: [], color: 'pink' }]} labels={[]} />);
    expect(screen.getByText('sem dados')).toBeInTheDocument();
  });
});
