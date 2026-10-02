import { describe, it, expect } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { SparklineCard } from './SparklineCard';

const LABELS = ['mai.', 'jun.', 'jul.', 'ago.', 'set.', 'out.'];

function renderCard(data = [0, 0, 1, 3, 0, 2]) {
  return render(
    <SparklineCard
      title="Eventos Realizados"
      color="magenta"
      data={data}
      labels={LABELS}
      formatValue={(v) => `${v} ev`}
    />,
  );
}

function hover(ratio: number) {
  const plot = screen.getByTestId('chart-dot').parentElement!;
  plot.getBoundingClientRect = () =>
    ({ left: 0, width: 100, top: 0, height: 100, right: 100, bottom: 100, x: 0, y: 0, toJSON: () => ({}) });
  fireEvent.pointerMove(plot, { clientX: ratio * 100 });
}

describe('SparklineCard', () => {
  it('shows the title and the latest value in the header', () => {
    renderCard();
    expect(screen.getByRole('heading', { name: 'Eventos Realizados' })).toBeInTheDocument();
    expect(screen.getByText('2 ev')).toBeInTheDocument();
  });

  it('shows the hovered month in a tooltip', () => {
    renderCard();
    hover(0.6); // nearest sample: index 3 (ago.)
    const tip = screen.getByRole('status');
    expect(within(tip).getByText('ago.')).toBeInTheDocument();
    expect(within(tip).getByText('3 ev')).toBeInTheDocument();
  });

  it('hides the tooltip when the pointer leaves', () => {
    renderCard();
    hover(0.6);
    fireEvent.pointerLeave(screen.getAllByTestId('chart-dot')[0].parentElement!);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('exposes every value as text, since the drawing is hidden from assistive tech', () => {
    renderCard();
    expect(screen.getByText(/ago\. 3 ev/)).toBeInTheDocument();
  });

  it('says there is no data instead of drawing an empty card', () => {
    renderCard([]);
    expect(screen.getByText('sem dados')).toBeInTheDocument();
  });
});
